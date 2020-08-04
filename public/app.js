const profanityBaseURL = "https://www.purgomalum.com/service/plain?text=";
const nickNamesDictionary = [
  "pink crow",
  "green pigeon",
  "brown robin",
  "blue woodpecker",
  "purple sparrow",
  "yellow kingfisher",
  "gray warbler",
  "orange bulbul",
  "black drongo",
  "red seagulls",
  "beige flamingo",
  "frost eagles",
  "fuscia owl",
  "mint kite",
  "hickory parakeet",
  "tortilla beeeater",
  "wood munia",
  "violet dove",
  "eggplant peacock",
  "golden oriole",
  "magenta flycatcher",
  "mulberry quail",
  "slate magpie",
  "navy roller",
  "azure emu",
  "arctic sunbird",
  "iris starling",
  "olive rockthrush",
  "pecan barnowl",
  "carob goose",
  "coal duck",
  "grease trogon",
  "raven nightjar",
  "sepia barbet",
];
let obstacleTimers = [];
let gameStarted = false;
let gameTimerId;
let myScore = 0;
let highScore = 0;
let highScoreNickname = "anonymous panda";
let myNickname;
let myClientId;
let myPublishChannel;
let gameChannel;
let gameChannelName = "flappy-game";
let allBirds = {};
let topScoreChannel;
let topScoreChannelName = "flappy-top-score";

if (localStorage.getItem("flappy-nickname")) {
  myNickname = localStorage.getItem("flappy-nickname");
} else {
  myNickname = nickNamesDictionary[Math.floor(Math.random() * 34)];
  localStorage.setItem("flappy-nickname", myNickname);
}

const realtime = new Ably.Realtime({
  authUrl: "/auth",
});

document.addEventListener("DOMContentLoaded", () => {
  const sky = document.querySelector(".sky");
  const bird = document.querySelector(".bird");
  const gameDisplay = document.querySelector(".game-container");
  const ground = document.querySelector(".ground-moving");
  let nicknameInput = document.getElementById("nickname-input");
  let updateNicknameBtn = document.getElementById("update-nickname");
  let scoreLabel = document.getElementById("score-label");
  let topScoreLabel = document.getElementById("top-label");
  let scoreList = document.getElementById("score-list");

  let birdLeft = 220;
  let birdBottom = 350;
  let gravity = 2;
  let isGameOver = false;
  let gap = 440;

  const filterNickname = async (nicknameText) => {
    const http = new XMLHttpRequest();
    let encodedText = encodeURIComponent(nicknameText);
    http.open("GET", profanityBaseURL + encodedText + "&fill_text=***");
    http.send();
    http.onload = () => {
      myNickname = http.responseText;
      nicknameInput.value = myNickname;
      localStorage.setItem("flappy-nickname", myNickname);
    };
  };

  topScoreLabel.innerHTML =
    "Top score - " + highScore + "pts by " + highScoreNickname;
  nicknameInput.value = myNickname;
  updateNicknameBtn.addEventListener("click", () => {
    filterNickname(nicknameInput.value);
  });

  window.addEventListener("keydown", function (e) {
    if (e.keyCode == 32 && e.target == document.body) {
      e.preventDefault();
    }
  });

  realtime.connection.once("connected", () => {
    myClientId = realtime.auth.clientId;
    myPublishChannel = realtime.channels.get("bird-position-" + myClientId);
    topScoreChannel = realtime.channels.get(topScoreChannelName, {
      params: { rewind: 1 },
    });
    topScoreChannel.subscribe((msg) => {
      highScore = msg.data.score;
      highScoreNickname = msg.data.nickname;
      topScoreLabel.innerHTML =
        "Top score - " + highScore + "pts by " + highScoreNickname;
      topScoreChannel.unsubscribe();
    });
    gameChannel = realtime.channels.get(gameChannelName);
    gameDisplay.onclick = function () {
      if (!gameStarted) {
        gameStarted = true;
        gameChannel.presence.enter({
          nickname: myNickname,
        });
        sendPositionUpdates();
        showOtherBirds();
        document.addEventListener("keydown", control);
        gameTimerId = setInterval(startGame, 20);
      }
    };
  });

  function startGame() {
    birdBottom -= gravity;
    bird.style.bottom = birdBottom + "px";
    bird.style.left = birdLeft + "px";
    for (item in allBirds) {
      if (allBirds[item].targetBottom) {
        let tempBottom = parseInt(allBirds[item].el.style.bottom);
        tempBottom += (allBirds[item].targetBottom - tempBottom) * 0.5;
        allBirds[item].el.style.bottom = tempBottom + "px";
      }
    }
  }

  function control(e) {
    if (e.keyCode === 32 && !isGameOver) {
      jump();
    }
  }

  function jump() {
    if (birdBottom < 500) birdBottom += 50;
    bird.style.bottom = birdBottom + "px";
  }

  function generateObstacles(randomHeight) {
    if (!isGameOver) {
      let obstacleLeft = 500;
      let obstacleBottom = randomHeight;

      const obstacle = document.createElement("div");
      const topObstacle = document.createElement("div");
      obstacle.classList.add("obstacle");
      topObstacle.classList.add("topObstacle");
      gameDisplay.appendChild(obstacle);
      gameDisplay.appendChild(topObstacle);
      obstacle.style.left = obstacleLeft + "px";
      obstacle.style.bottom = obstacleBottom + "px";
      topObstacle.style.left = obstacleLeft + "px";
      topObstacle.style.bottom = obstacleBottom + gap + "px";
      let timerId = setInterval(moveObstacle, 20);
      obstacleTimers.push(timerId);
      function moveObstacle() {
        obstacleLeft -= 2;
        obstacle.style.left = obstacleLeft + "px";
        topObstacle.style.left = obstacleLeft + "px";
        if (obstacleLeft === 220) {
          myScore++;
          setTimeout(() => {
            sortLeaderboard();
          }, 400);
        }
        if (obstacleLeft === -50) {
          clearInterval(timerId);
          gameDisplay.removeChild(obstacle);
          gameDisplay.removeChild(topObstacle);
        }
        if (
          (obstacleLeft > 200 &&
            obstacleLeft < 280 &&
            birdLeft === 220 &&
            (birdBottom < obstacleBottom + 210 ||
              birdBottom > obstacleBottom + gap - 150)) ||
          birdBottom === 0
        ) {
          for (timer in obstacleTimers) {
            clearInterval(obstacleTimers[timer]);
          }
          sortLeaderboard();
          gameOver();
        }
      }
    }
  }

  function gameOver() {
    scoreLabel.innerHTML += " | Game Over";
    clearInterval(gameTimerId);
    isGameOver = true;
    document.removeEventListener("keydown", control);
    ground.classList.add("ground");
    ground.classList.remove("ground-moving");
    realtime.connection.close();
  }

  function sendPositionUpdates() {
    let publishTimer = setInterval(() => {
      myPublishChannel.publish("pos", {
        bottom: parseInt(bird.style.bottom),
        nickname: myNickname,
        score: myScore,
      });
      if (isGameOver) {
        clearInterval(publishTimer);
        myPublishChannel.detach();
      }
    }, 100);
  }

  function showOtherBirds() {
    gameChannel.subscribe("game-state", (msg) => {
      for (let item in msg.data.birds) {
        if (item != myClientId) {
          let newBottom = msg.data.birds[item].bottom;
          let newLeft = msg.data.birds[item].left;
          let isDead = msg.data.birds[item].isDead;
          if (allBirds[item] && !isDead) {
            allBirds[item].targetBottom = newBottom;
            allBirds[item].left = newLeft;
            allBirds[item].isDead = msg.data.birds[item].isDead;
            allBirds[item].nickname = msg.data.birds[item].nickname;
            allBirds[item].score = msg.data.birds[item].score;
          } else if (allBirds[item] && isDead) {
            sky.removeChild(allBirds[item].el);
            delete allBirds[item];
          } else {
            if (!isGameOver && !isDead) {
              allBirds[item] = {};
              allBirds[item].el = document.createElement("div");
              allBirds[item].el.classList.add("other-bird");
              sky.appendChild(allBirds[item].el);
              allBirds[item].el.style.bottom = newBottom + "px";
              allBirds[item].el.style.left = newLeft + "px";
              allBirds[item].isDead = msg.data.birds[item].isDead;
              allBirds[item].nickname = msg.data.birds[item].nickname;
              allBirds[item].score = msg.data.birds[item].score;
            }
          }
        } else if (item == myClientId) {
          allBirds[item] = msg.data.birds[item];
        }
      }
      if (msg.data.highScore > highScore) {
        highScore = msg.data.highScore;
        highScoreNickname = msg.data.highScoreNickname;
        topScoreLabel.innerHTML =
          "Top score - " + highScore + "pts by " + highScoreNickname;
      }
      if (msg.data.launchObstacle == true && !isGameOver) {
        generateObstacles(msg.data.obstacleHeight);
      }
    });
  }

  function sortLeaderboard() {
    scoreLabel.innerHTML = "Score: " + myScore;
    let listItems = "";
    let leaderBoard = new Array();
    for (let item in allBirds) {
      leaderBoard.push({
        nickname: allBirds[item].nickname,
        score: allBirds[item].score,
      });
    }
    leaderBoard.sort((a, b) => {
      b.score - a.score;
    });
    leaderBoard.forEach((bird) => {
      listItems +=
        "<li class='score-item'><span class='name'>" +
        bird.nickname +
        "</span><span class='points'>" +
        bird.score +
        "pts</span></li>";
    });
    scoreList.innerHTML = listItems;
  }
});
