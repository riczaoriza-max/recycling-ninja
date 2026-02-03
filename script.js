const canvas = document.getElementById("game");
const context = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const missesEl = document.getElementById("misses");
const timeEl = document.getElementById("time");
const startPanel = document.getElementById("startPanel");
const endPanel = document.getElementById("endPanel");
const endMessage = document.getElementById("endMessage");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

const recyclableItems = [
  { label: "Garrafa", color: "#5bc0eb" },
  { label: "Papel", color: "#f7b32b" },
  { label: "Lata", color: "#9bc53d" },
  { label: "Vidro", color: "#6a4c93" }
];

const nonRecyclableItems = [
  { label: "Fralda", color: "#ef6461" },
  { label: "Borracha", color: "#ff6f59" },
  { label: "Copo", color: "#f25f5c" }
];

const gameState = {
  items: [],
  splashes: [],
  lastSpawn: 0,
  score: 0,
  misses: 0,
  timeLeft: 60,
  running: false,
  demo: true,
  lastTime: 0,
  pointer: { x: 0, y: 0, active: false }
};

const resizeCanvas = () => {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(ratio, ratio);
};

const resetGame = () => {
  gameState.items = [];
  gameState.splashes = [];
  gameState.score = 0;
  gameState.misses = 0;
  gameState.timeLeft = 60;
  gameState.lastSpawn = 0;
  scoreEl.textContent = "0";
  missesEl.textContent = "0";
  timeEl.textContent = "60";
};

const spawnItem = () => {
  const isRecyclable = Math.random() > 0.25;
  const pool = isRecyclable ? recyclableItems : nonRecyclableItems;
  const base = pool[Math.floor(Math.random() * pool.length)];
  const size = 50 + Math.random() * 20;

  gameState.items.push({
    id: crypto.randomUUID(),
    label: base.label,
    color: base.color,
    x: 80 + Math.random() * (window.innerWidth - 160),
    y: window.innerHeight + size,
    radius: size / 2,
    speed: 180 + Math.random() * 120,
    drift: -60 + Math.random() * 120,
    isRecyclable,
    sliced: false
  });
};

const addSplash = (item) => {
  gameState.splashes.push({
    x: item.x,
    y: item.y,
    color: item.isRecyclable ? "rgba(91, 192, 235, 0.5)" : "rgba(239, 100, 97, 0.5)",
    radius: item.radius,
    life: 0.4
  });
};

const update = (timestamp) => {
  if (!gameState.running && !gameState.demo) {
    return;
  }

  if (!gameState.lastTime) {
    gameState.lastTime = timestamp;
  }

  const delta = (timestamp - gameState.lastTime) / 1000;
  gameState.lastTime = timestamp;

  gameState.lastSpawn += delta;
  const spawnInterval = gameState.demo ? 1.1 : 0.8;
  if (gameState.lastSpawn > spawnInterval) {
    spawnItem();
    gameState.lastSpawn = 0;
  }

  gameState.items.forEach((item) => {
    item.y -= item.speed * delta;
    item.x += item.drift * delta;
  });

  gameState.items = gameState.items.filter((item) => item.y + item.radius > -40);

  gameState.splashes.forEach((splash) => {
    splash.life -= delta;
    splash.radius += 80 * delta;
  });

  gameState.splashes = gameState.splashes.filter((splash) => splash.life > 0);

  if (gameState.pointer.active) {
    gameState.items.forEach((item) => {
      const distance = Math.hypot(gameState.pointer.x - item.x, gameState.pointer.y - item.y);
      if (!item.sliced && distance < item.radius + 10) {
        item.sliced = true;
        addSplash(item);
        if (!gameState.demo) {
          if (item.isRecyclable) {
            gameState.score += 1;
          } else {
            gameState.misses += 1;
          }
        }
      }
    });
  }

  gameState.items = gameState.items.filter((item) => !item.sliced);

  if (!gameState.demo) {
    if (gameState.misses >= 3) {
      finishGame("Cortaste demasiados itens não recicláveis.");
    }

    gameState.timeLeft -= delta;
    if (gameState.timeLeft <= 0) {
      finishGame("O tempo terminou. Tenta novamente!");
    }

    scoreEl.textContent = String(gameState.score);
    missesEl.textContent = String(gameState.misses);
    timeEl.textContent = Math.max(0, Math.ceil(gameState.timeLeft)).toString();
  }

  draw();
  window.requestAnimationFrame(update);
};

const draw = () => {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  context.save();
  context.fillStyle = "rgba(255, 255, 255, 0.08)";
  gameState.splashes.forEach((splash) => {
    context.beginPath();
    context.arc(splash.x, splash.y, splash.radius, 0, Math.PI * 2);
    context.fillStyle = splash.color;
    context.fill();
  });
  context.restore();

  gameState.items.forEach((item) => {
    context.beginPath();
    context.fillStyle = item.color;
    context.strokeStyle = "rgba(255, 255, 255, 0.8)";
    context.lineWidth = 2;
    context.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.fillStyle = "#0a1117";
    context.font = "bold 14px 'Segoe UI', sans-serif";
    context.textAlign = "center";
    context.fillText(item.label, item.x, item.y + 4);
  });

  if (gameState.pointer.active) {
    context.beginPath();
    context.strokeStyle = "rgba(46, 192, 123, 0.6)";
    context.lineWidth = 4;
    context.arc(gameState.pointer.x, gameState.pointer.y, 24, 0, Math.PI * 2);
    context.stroke();
  }
};

const finishGame = (message) => {
  gameState.running = false;
  gameState.demo = false;
  endMessage.textContent = `${message} Fizeste ${gameState.score} pontos.`;
  endPanel.classList.remove("hidden");
};

const startGame = () => {
  resetGame();
  startPanel.classList.add("hidden");
  endPanel.classList.add("hidden");
  gameState.running = true;
  gameState.demo = false;
  gameState.lastTime = 0;
  window.requestAnimationFrame(update);
};

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  gameState.pointer.x = event.clientX - rect.left;
  gameState.pointer.y = event.clientY - rect.top;
  gameState.pointer.active = true;
});

canvas.addEventListener("mouseleave", () => {
  gameState.pointer.active = false;
});

canvas.addEventListener("touchstart", (event) => {
  const touch = event.touches[0];
  const rect = canvas.getBoundingClientRect();
  gameState.pointer.x = touch.clientX - rect.left;
  gameState.pointer.y = touch.clientY - rect.top;
  gameState.pointer.active = true;
});

canvas.addEventListener("touchmove", (event) => {
  const touch = event.touches[0];
  const rect = canvas.getBoundingClientRect();
  gameState.pointer.x = touch.clientX - rect.left;
  gameState.pointer.y = touch.clientY - rect.top;
});

canvas.addEventListener("touchend", () => {
  gameState.pointer.active = false;
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

window.addEventListener("resize", () => {
  resizeCanvas();
  draw();
});

resizeCanvas();
window.requestAnimationFrame(update);
