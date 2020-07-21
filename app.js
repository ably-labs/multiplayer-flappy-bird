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

if (localStorage.getItem("flappy-nickname")) {
  myNickname = localStorage.getItem("flappy-nickname");
} else {
  myNickname = nickNamesDictionary[Math.floor(Math.random() * 34)];
  localStorage.setItem("flappy-nickname", myNickname);
}

document.addEventListener("DOMContentLoaded", () => {
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
  let gap = 450;

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

  gameDisplay.onclick = function () {
    if (!gameStarted) {
      gameStarted = true;
      document.addEventListener("keydown", control);
      gameTimerId = setInterval(startGame, 20);
      generateObstacles();
    }
  };

  function startGame() {
    birdBottom -= gravity;
    bird.style.bottom = birdBottom + "px";
    bird.style.left = birdLeft + "px";
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

  function generateObstacles() {
    if (!isGameOver) {
      let obstacleLeft = 500;
      let obstacleBottom = Math.random() * 60;

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
          scoreLabel.innerHTML = "Score: " + myScore;
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
          gameOver();
          isGameOver = true;
        }
      }
      setTimeout(generateObstacles, 3000);
    }
  }

  function gameOver() {
    scoreLabel.innerHTML += " | Game Over";
    clearInterval(gameTimerId);
    isGameOver = true;
    document.removeEventListener("keydown", control);
    ground.classList.add("ground");
    ground.classList.remove("ground-moving");
  }
});
