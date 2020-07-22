const envConfig = require("dotenv").config();
const express = require("express");
const Ably = require("Ably");
const gameChannelName = "flappy-game";
let gameChannel;
let birdCount = 0;
let gameTicker;
let isGameTickerOn = false;
let gameStateObj;
let birds = {};
let highScore = 0;
let highScoreNickname = "anonymous panda";
let birdChannels = {};

const app = express();
app.use(express.static("public"));

const realtime = new Ably.Realtime({
  key: process.env.ABLY_API_KEY,
});

const uniqueId = function () {
  return "id-" + Math.random().toString(36).substr(2, 16);
};

app.get("/", (request, response) => {
  response.sendFile(__dirname + "/index.html");
});

app.get("/auth", function (req, res) {
  var tokenParams = {
    clientId: uniqueId(),
  };
  realtime.auth.createTokenRequest(tokenParams, function (err, tokenRequest) {
    if (err) {
      res.status(500).send("Error requesting token: " + JSON.stringify(err));
    } else {
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(tokenRequest));
    }
  });
});

const listener = app.listen(process.env.PORT, () => {
  console.log("App is listening on port " + listener.address().port);
});

realtime.connection.once("connected", () => {
  gameChannel = realtime.channels.get(gameChannelName);
  gameChannel.presence.subscribe("enter", (msg) => {
    if (++birdCount === 1 && !isGameTickerOn) {
      gameTicker = setInterval(startGameTick, 100);
      isGameTickerOn = true;
    }
    birds[msg.clientId] = {
      id: msg.clientId,
      bottom: 350,
      isDead: false,
      nickname: msg.data.nickname,
      score: 0,
    };
    subscribeToPlayerInput(msg.clientId);
  });
  gameChannel.presence.subscribe("leave", (msg) => {
    if (birds[msg.clientId] != undefined) {
      birdCount--;
      birds[msg.clientId].isDead = true;
      setTimeout(() => {
        delete birds[msg.clientId];
      }, 500);
      if (birdCount < 1) {
        isGameTickerOn = false;
        clearInterval(gameTicker);
      }
    }
  });
});

function subscribeToPlayerInput(id) {
  birdChannels[id] = realtime.channels.get("bird-position-" + id);
  birdChannels[id].subscribe("pos", (msg) => {
    if (birds[id]) {
      birds[id].bottom = msg.data.bottom;
      birds[id].nickname = msg.data.nickname;
      birds[id].score = msg.data.score;
      if (msg.data.score > highScore) {
        highScore = msg.data.score;
        highScoreNickname = msg.data.nickname;
      }
    }
  });
}

function startGameTick() {
  gameStateObj = {
    birds: birds,
    highScore: highScore,
    highScoreNickname: highScoreNickname,
  };
  gameChannel.publish("game-state", gameStateObj);
}
