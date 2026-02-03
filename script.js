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
  { label: "Garrafa", icon: "🥤", color: "#5bc0eb" },
  { label: "Papel", icon: "📄", color: "#f7b32b" },
  { label: "Lata", icon: "🥫", color: "#9bc53d" },
  { label: "Vidro", icon: "🍾", color: "#6a4c93" }
];

const nonRecyclableItems = [
  { label: "Fralda", icon: "🧷", color: "#ef6461" },
  { label: "Borracha", icon: "🧽", color: "#ff6f59" },
  { label: "Copo", icon: "☕", color: "#f25f5c" }
];

const gameState = {
  items: [],
  splashes: [],
  slices: [],
  lastSpawn: 0,
  score: 0,
  misses: 0,
  timeLeft: 60,
  running: false,
  demo: true,
  lastTime: 0,
  pointer: { x: 0, y: 0, lastX: 0, lastY: 0, active: false }
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
  const size = 48 + Math.random() * 24;
  const launchAngle = (-Math.PI / 2) + (Math.random() * 0.8 - 0.4);
  const launchSpeed = 520 + Math.random() * 140;

  gameState.items.push({
    id: crypto.randomUUID(),
    label: base.label,
    icon: base.icon,
    color: base.color,
    x: 80 + Math.random() * (window.innerWidth - 160),
    y: window.innerHeight + size,
    radius: size / 2,
    vx: Math.cos(launchAngle) * launchSpeed,
    vy: Math.sin(launchAngle) * launchSpeed,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() * 2 - 1) * 2.2,
    slicedAt: null,
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

const addSlice = (startX, startY, endX, endY, isRecyclable) => {
  gameState.slices.push({
    startX,
    startY,
    endX,
    endY,
    life: 0.25,
    color: isRecyclable ? "rgba(46, 192, 123, 0.9)" : "rgba(239, 100, 97, 0.9)"
  });
};

const distanceToSegment = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1);
  }
  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const closestX = x1 + clamped * dx;
  const closestY = y1 + clamped * dy;
  return Math.hypot(px - closestX, py - closestY);
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

  const gravity = 900;
  gameState.items.forEach((item) => {
    item.vy += gravity * delta;
    item.x += item.vx * delta;
    item.y += item.vy * delta;
    item.rotation += item.spin * delta;
  });

  gameState.items = gameState.items.filter(
    (item) => item.y - item.radius < window.innerHeight + 60 && item.x + item.radius > -60
  );

  gameState.splashes.forEach((splash) => {
    splash.life -= delta;
    splash.radius += 80 * delta;
  });

  gameState.splashes = gameState.splashes.filter((splash) => splash.life > 0);

  gameState.slices.forEach((slice) => {
    slice.life -= delta;
  });
  gameState.slices = gameState.slices.filter((slice) => slice.life > 0);

  if (gameState.pointer.active) {
    gameState.items.forEach((item) => {
      const distance = distanceToSegment(
        item.x,
        item.y,
        gameState.pointer.lastX,
        gameState.pointer.lastY,
        gameState.pointer.x,
        gameState.pointer.y
      );
      const hitRadius = item.radius + 14;
      if (!item.sliced && distance < hitRadius) {
        item.sliced = true;
        item.slicedAt = performance.now();
        addSplash(item);
        addSlice(
          gameState.pointer.lastX,
          gameState.pointer.lastY,
          gameState.pointer.x,
          gameState.pointer.y,
          item.isRecyclable
        );
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

  gameState.items = gameState.items.filter((item) => {
    if (!item.sliced) {
      return true;
    }
    return performance.now() - item.slicedAt < 180;
  });

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
    const sliceFade = item.sliced ? Math.max(0, 1 - (performance.now() - item.slicedAt) / 180) : 1;
    context.save();
    context.translate(item.x, item.y);
    context.rotate(item.rotation);
    context.globalAlpha = sliceFade;

    context.beginPath();
    context.fillStyle = item.color;
    context.strokeStyle = "rgba(255, 255, 255, 0.8)";
    context.lineWidth = 2;
    context.ellipse(0, 0, item.radius * 1.05, item.radius * 0.9, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.fillStyle = "#0a1117";
    context.font = "bold 22px 'Segoe UI Emoji', sans-serif";
    context.textAlign = "center";
    context.fillText(item.icon, 0, 8);

    context.fillStyle = "rgba(10, 17, 23, 0.85)";
    context.font = "bold 12px 'Segoe UI', sans-serif";
    context.fillText(item.label, 0, item.radius + 16);
    context.restore();
  });

  gameState.slices.forEach((slice) => {
    context.save();
    context.globalAlpha = slice.life * 4;
    context.strokeStyle = slice.color;
    context.lineWidth = 6;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(slice.startX, slice.startY);
    context.lineTo(slice.endX, slice.endY);
    context.stroke();
    context.restore();
  });

  if (gameState.pointer.active) {
    context.beginPath();
    context.strokeStyle = "rgba(46, 192, 123, 0.6)";
    context.lineWidth = 3;
    context.moveTo(gameState.pointer.lastX, gameState.pointer.lastY);
    context.lineTo(gameState.pointer.x, gameState.pointer.y);
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
  gameState.pointer.lastX = gameState.pointer.x;
  gameState.pointer.lastY = gameState.pointer.y;
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
  gameState.pointer.lastX = gameState.pointer.x;
  gameState.pointer.lastY = gameState.pointer.y;
  gameState.pointer.x = touch.clientX - rect.left;
  gameState.pointer.y = touch.clientY - rect.top;
  gameState.pointer.active = true;
});

canvas.addEventListener("touchmove", (event) => {
  const touch = event.touches[0];
  const rect = canvas.getBoundingClientRect();
  gameState.pointer.lastX = gameState.pointer.x;
  gameState.pointer.lastY = gameState.pointer.y;
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
