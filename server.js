const envConfig = require("dotenv").config();
const express = require("express");
const Ably = require("ably");
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
let obstacleTimer = 0;
let topScoreChannel;
let topScoreChannelName = "flappy-top-score";

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
  topScoreChannel = realtime.channels.get(topScoreChannelName, {
    params: { rewind: 1 },
  });
  topScoreChannel.subscribe("score", (msg) => {
    highScore = msg.data.score;
    highScoreNickname = msg.data.nickname;
    topScoreChannel.unsubscribe();
  });
  gameChannel = realtime.channels.get(gameChannelName);
  gameChannel.presence.subscribe("enter", (msg) => {
    birdCount++;
    console.log("JOINED Bird Count: " + birdCount);
    if (birdCount === 1 && !isGameTickerOn) {
      console.log("STARTING GAME TICK");
      gameTicker = setInterval(startGameTick, 100);
      isGameTickerOn = true;
    }
    birds[msg.clientId] = {
      id: msg.clientId,
      left: 220,
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
      console.log("LEFT Bird count " + birdCount + " " + msg.clientId);
      birds[msg.clientId].isDead = true;
      setTimeout(() => {
        delete birds[msg.clientId];
      }, 250);

      if (birdCount === 0) {
        console.log("STOPPING GAME TICK");
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
        topScoreChannel.publish("score", {
          score: highScore,
          nickname: highScoreNickname,
        });
      }
    }
  });
}

function startGameTick() {
  if (obstacleTimer === 0 || obstacleTimer === 3000) {
    obstacleTimer = 0;
    gameStateObj = {
      birds: birds,
      highScore: highScore,
      highScoreNickname: highScoreNickname,
      launchObstacle: true,
      obstacleHeight: Math.random() * 60,
    };
  } else {
    gameStateObj = {
      birds: birds,
      highScore: highScore,
      highScoreNickname: highScoreNickname,
      launchObstacle: false,
      obstacleHeight: "",
    };
  }
  obstacleTimer += 100;
  gameChannel.publish("game-state", gameStateObj);
}
