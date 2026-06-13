const canvas = document.querySelector("#trainingCanvas");
const ctx = canvas.getContext("2d");
const moduleList = document.querySelector("#moduleList");
const startBtn = document.querySelector("#startBtn");
const pauseBtn = document.querySelector("#pauseBtn");
const fullBtn = document.querySelector("#fullBtn");
const pauseLayer = document.querySelector("#pauseLayer");
const pauseText = document.querySelector("#pauseText");
const titleEl = document.querySelector("#moduleTitle");
const typeEl = document.querySelector("#moduleType");
const scoreEl = document.querySelector("#score");
const timeEl = document.querySelector("#timeLeft");
const levelEl = document.querySelector("#levelLabel");
const durationEl = document.querySelector("#duration");
const difficultyEl = document.querySelector("#difficulty");
const eyeModeEl = document.querySelector("#eyeMode");
const soundToggle = document.querySelector("#soundToggle");
const recordList = document.querySelector("#recordList");
const dailyRing = document.querySelector("#dailyRing");
const dailyMinutes = document.querySelector("#dailyMinutes");

const modules = [
  {
    id: "tracking",
    name: "追光小球",
    type: "视觉追踪",
    icon: "●",
    color: "#1f7ae0",
    desc: "跟随移动目标，训练注视稳定",
  },
  {
    id: "crowding",
    name: "拥挤字母",
    type: "精细辨认",
    icon: "E",
    color: "#e44747",
    desc: "从干扰中找目标方向",
  },
  {
    id: "coordination",
    name: "星星捕手",
    type: "手眼协调",
    icon: "★",
    color: "#8a5cf6",
    desc: "点击目标并抑制误点",
  },
];

let activeModule = modules[0];
let state = {
  running: false,
  paused: true,
  score: 0,
  timeLeft: Number(durationEl.value),
  level: Number(difficultyEl.value),
  lastFrame: 0,
  target: null,
  choices: [],
  roundStarted: 0,
};

const storeKey = "visionTrainerRecords";

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(640, Math.floor(rect.width * ratio));
  canvas.height = Math.max(360, Math.floor(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function getSize() {
  const ratio = window.devicePixelRatio || 1;
  return { w: canvas.width / ratio, h: canvas.height / ratio };
}

function renderModules() {
  moduleList.innerHTML = modules
    .map(
      (item) => `
      <button class="module-btn" type="button" data-id="${item.id}" aria-current="${item.id === activeModule.id}">
        <span class="module-icon" style="background:${item.color}">${item.icon}</span>
        <span><strong>${item.name}</strong><span>${item.desc}</span></span>
      </button>
    `,
    )
    .join("");
}

function setModule(id) {
  activeModule = modules.find((item) => item.id === id) || modules[0];
  titleEl.textContent = activeModule.name;
  typeEl.textContent = activeModule.type;
  renderModules();
  resetSession(false);
  drawIntro(performance.now());
}

function resetSession(keepRunning) {
  state.running = keepRunning;
  state.paused = !keepRunning;
  state.score = 0;
  state.timeLeft = Number(durationEl.value);
  state.level = Number(difficultyEl.value);
  state.lastFrame = 0;
  state.target = null;
  state.choices = [];
  updateHud();
  pauseLayer.classList.toggle("hidden", keepRunning);
  pauseLayer.querySelector("strong").textContent = "准备开始";
  pauseText.textContent = keepRunning ? "" : "选择训练项目后点击开始。";
}

function updateHud() {
  scoreEl.textContent = state.score;
  timeEl.textContent = formatTime(state.timeLeft);
  levelEl.textContent = state.level;
}

function formatTime(value) {
  const minutes = Math.floor(value / 60).toString().padStart(2, "0");
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function beep(freq = 660, duration = 0.06) {
  if (!soundToggle.checked) return;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  const audio = new AudioCtor();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.value = freq;
  gain.gain.value = 0.04;
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duration);
}

function drawIntro(now = performance.now()) {
  const { w, h } = getSize();
  ctx.clearRect(0, 0, w, h);
  drawDynamicStimulusBackground(w, h, now);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 28px system-ui";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,.65)";
  ctx.shadowBlur = 12;
  ctx.fillText(activeModule.name, w / 2, h / 2 - 20);
  ctx.fillStyle = "#d9f7ff";
  ctx.font = "16px system-ui";
  ctx.fillText("请保持 45-70cm 距离，训练中注意眨眼。", w / 2, h / 2 + 18);
  ctx.shadowBlur = 0;
}

function drawDynamicStimulusBackground(w, h, now) {
  const t = now / 1000;
  const gradient = ctx.createLinearGradient(
    Math.sin(t * 0.17) * w * 0.2,
    0,
    w,
    h + Math.cos(t * 0.13) * h * 0.2,
  );
  gradient.addColorStop(0, "#050521");
  gradient.addColorStop(0.28, "#151a73");
  gradient.addColorStop(0.55, "#003f5f");
  gradient.addColorStop(0.78, "#3a005e");
  gradient.addColorStop(1, "#0b1027");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(Math.sin(t * 0.33) * 80, Math.cos(t * 0.29) * 42);
  ctx.rotate((-12 * Math.PI) / 180 + Math.sin(t * 0.08) * 0.06);
  ctx.globalAlpha = 0.78;
  const stripeColors = ["#00f5ff", "#ffea00", "#ff2bd6", "#39ff14", "#ff4d00"];
  for (let x = -h * 2; x < w + h * 2; x += 96) {
    const colorIndex = Math.abs(Math.floor((x + t * 46) / 96)) % stripeColors.length;
    ctx.fillStyle = stripeColors[colorIndex];
    ctx.fillRect(x + (t * 34) % 96, -h * 0.35, 34, h * 1.85);
  }
  ctx.restore();

  const block = 54;
  const driftX = (t * 14) % block;
  const driftY = (t * 10) % block;
  ctx.globalAlpha = 0.18;
  for (let y = -block; y < h + block; y += block) {
    for (let x = -block; x < w + block; x += block) {
      ctx.fillStyle = (Math.floor(x / block) + Math.floor(y / block)) % 2 === 0 ? "#ffffff" : "#000000";
      ctx.fillRect(x + driftX, y + driftY, block, block);
    }
  }

  ctx.globalAlpha = 0.8;
  const dots = [
    ["#ffea00", 0.12, 0.16, 28, 0.0],
    ["#00f5ff", 0.86, 0.2, 34, 1.2],
    ["#ff2bd6", 0.22, 0.76, 38, 2.1],
    ["#39ff14", 0.74, 0.78, 30, 3.0],
    ["#ff4d00", 0.52, 0.12, 22, 4.3],
  ];
  dots.forEach(([color, x, y, r, phase]) => {
    const pulse = 1 + Math.sin(t * 1.15 + phase) * 0.18;
    const orbitX = Math.cos(t * 0.42 + phase) * 26;
    const orbitY = Math.sin(t * 0.36 + phase) * 18;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(w * x + orbitX, h * y + orbitY, r * pulse, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowBlur = 0;

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(t * 0.18);
  ctx.globalAlpha = 0.34;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  for (let r = 80; r < Math.max(w, h); r += 84) {
    ctx.beginPath();
    ctx.arc(0, 0, r + Math.sin(t * 0.8 + r * 0.01) * 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(255,255,255,.34)";
  ctx.lineWidth = 2;
  const gridOffset = (t * 18) % 68;
  for (let x = -68; x < w + 68; x += 68) {
    ctx.beginPath();
    ctx.moveTo(x + gridOffset, 0);
    ctx.lineTo(x + gridOffset, h);
    ctx.stroke();
  }
  for (let y = -68; y < h + 68; y += 68) {
    ctx.beginPath();
    ctx.moveTo(0, y + gridOffset * 0.7);
    ctx.lineTo(w, y + gridOffset * 0.7);
    ctx.stroke();
  }
}

function startSession() {
  resetSession(true);
  state.roundStarted = performance.now();
  nextRound();
  requestAnimationFrame(loop);
}

function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  pauseLayer.classList.toggle("hidden", !state.paused);
  pauseText.textContent = state.paused ? "已暂停，放松眼睛看远处 20 秒。" : "";
  if (!state.paused) requestAnimationFrame(loop);
}

function finishSession() {
  state.running = false;
  state.paused = true;
  pauseLayer.classList.remove("hidden");
  pauseLayer.querySelector("strong").textContent = "训练完成";
  pauseText.textContent = `本次得分 ${state.score}。请休息眼睛，再继续下一组。`;
  saveRecord();
  renderRecords();
}

function loop(now) {
  if (!state.running || state.paused) return;
  if (!state.lastFrame) state.lastFrame = now;
  const delta = Math.min(0.05, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  state.timeLeft = Math.max(0, state.timeLeft - delta);
  updateHud();

  if (state.timeLeft <= 0) {
    finishSession();
    return;
  }

  drawActive(now, delta);
  requestAnimationFrame(loop);
}

function drawActive(now, delta) {
  if (activeModule.id === "tracking") drawTracking(now, delta);
  if (activeModule.id === "crowding") drawCrowding(now);
  if (activeModule.id === "coordination") drawCoordination(now);
}

function nextRound() {
  const { w, h } = getSize();
  if (activeModule.id === "tracking") {
    state.target = {
      x: w * 0.25 + Math.random() * w * 0.5,
      y: h * 0.25 + Math.random() * h * 0.5,
      r: 24,
      vx: (80 + state.level * 28) * (Math.random() > 0.5 ? 1 : -1),
      vy: (70 + state.level * 22) * (Math.random() > 0.5 ? 1 : -1),
    };
  }
  if (activeModule.id === "crowding") {
    const directions = [0, 90, 180, 270];
    state.target = {
      angle: directions[Math.floor(Math.random() * directions.length)],
      gap: Math.max(42, 90 - state.level * 7),
      size: Math.max(34, 70 - state.level * 3),
    };
    state.choices = directions;
  }
  if (activeModule.id === "coordination") {
    state.target = {
      x: 70 + Math.random() * (w - 140),
      y: 70 + Math.random() * (h - 140),
      r: Math.max(18, 34 - state.level * 2),
      expires: performance.now() + Math.max(900, 2200 - state.level * 170),
    };
  }
  state.roundStarted = performance.now();
}

function drawTracking(now, delta) {
  const { w, h } = getSize();
  const t = state.target;
  t.x += t.vx * delta;
  t.y += t.vy * delta;
  if (t.x < t.r || t.x > w - t.r) t.vx *= -1;
  if (t.y < t.r || t.y > h - t.r) t.vy *= -1;
  drawDynamicStimulusBackground(w, h, now);
  ctx.strokeStyle = "rgba(255,234,0,.65)";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r + 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = eyeModeEl.value === "right" ? "#ff2bd6" : "#00f5ff";
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(t.x - 7, t.y - 7, 7, 0, Math.PI * 2);
  ctx.fill();
  drawInstruction("眼睛跟随小球移动，听到提示后点击小球。");
  if (now - state.roundStarted > Math.max(1300, 2800 - state.level * 220)) {
    beep(520, 0.04);
    state.roundStarted = now;
  }
}

function drawCrowding(now) {
  const { w, h } = getSize();
  drawDynamicStimulusBackground(w, h, now);
  const centerX = w / 2;
  const centerY = h / 2;
  const offsets = [
    [0, 0],
    [-state.target.gap, 0],
    [state.target.gap, 0],
    [0, -state.target.gap],
    [0, state.target.gap],
  ];
  offsets.forEach(([x, y], index) => {
    drawTumblingE(centerX + x, centerY + y, state.target.size, index === 0 ? state.target.angle : [0, 90, 180, 270][(index + state.level) % 4], index === 0);
  });
  drawChoiceBar(["上", "右", "下", "左"]);
  drawInstruction("只判断中间 E 的开口方向，忽略周围干扰。");
}

function drawTumblingE(x, y, size, angle, isTarget) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.shadowColor = isTarget ? "rgba(255,234,0,.95)" : "rgba(0,245,255,.7)";
  ctx.shadowBlur = isTarget ? 18 : 8;
  ctx.fillStyle = isTarget ? "#ffffff" : "#00f5ff";
  const bar = size / 5;
  ctx.fillRect(-size / 2, -size / 2, bar, size);
  ctx.fillRect(-size / 2, -size / 2, size, bar);
  ctx.fillRect(-size / 2, -bar / 2, size * 0.82, bar);
  ctx.fillRect(-size / 2, size / 2 - bar, size, bar);
  ctx.restore();
}

function drawCoordination(now) {
  const { w, h } = getSize();
  drawDynamicStimulusBackground(w, h, now);
  if (now > state.target.expires) {
    state.score = Math.max(0, state.score - 1);
    nextRound();
  }
  const t = state.target;
  ctx.fillStyle = "#ffea00";
  ctx.shadowColor = "#ffea00";
  ctx.shadowBlur = 22;
  drawStar(t.x, t.y, t.r, t.r * 0.48, 5);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawInstruction("尽快点击星星，误点会扣分。");
}

function drawStar(cx, cy, outer, inner, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 ? inner : outer;
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawInstruction(text) {
  const { w } = getSize();
  ctx.fillStyle = "rgba(5,10,28,.78)";
  roundRect(20, 20, Math.min(560, w - 40), 46, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.48)";
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 16px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(text, 36, 50);
}

function drawChoiceBar(labels) {
  const { w, h } = getSize();
  const map = { 上: "↑", 右: "→", 下: "↓", 左: "←" };
  const itemW = 70;
  const gap = 12;
  const total = labels.length * itemW + (labels.length - 1) * gap;
  const start = (w - total) / 2;
  labels.forEach((label, i) => {
    const x = start + i * (itemW + gap);
    const y = h - 88;
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.strokeStyle = "#ffea00";
    ctx.lineWidth = 2;
    roundRect(x, y, itemW, 54, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#172033";
    ctx.font = "800 28px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(map[label] || label, x + itemW / 2, y + 36);
  });
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function handleCanvasClick(event) {
  if (!state.running || state.paused) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (activeModule.id === "tracking" || activeModule.id === "coordination") {
    const t = state.target;
    const hit = Math.hypot(x - t.x, y - t.y) <= t.r + 14;
    state.score = Math.max(0, state.score + (hit ? 2 : -1));
    beep(hit ? 760 : 180, hit ? 0.05 : 0.09);
    if (activeModule.id === "coordination" || hit) nextRound();
  } else {
    const selected = choiceFromClick(x, y);
    if (!selected) return;
    const correct = isCorrectChoice(selected);
    state.score = Math.max(0, state.score + (correct ? 3 : -1));
    beep(correct ? 820 : 180, correct ? 0.05 : 0.09);
    nextRound();
  }
  updateHud();
}

function choiceFromClick(x, y) {
  const { w, h } = getSize();
  const labels = ["上", "右", "下", "左"];
  const itemW = 70;
  const gap = 12;
  const total = labels.length * itemW + (labels.length - 1) * gap;
  const start = (w - total) / 2;
  for (let i = 0; i < labels.length; i++) {
    const bx = start + i * (itemW + gap);
    const by = h - 88;
    if (x >= bx && x <= bx + itemW && y >= by && y <= by + 54) return labels[i];
  }
  return null;
}

function isCorrectChoice(selected) {
  const map = { 270: "上", 0: "右", 90: "下", 180: "左" };
  return selected === map[state.target.angle];
}

function saveRecord() {
  const records = getRecords();
  records.unshift({
    date: new Date().toLocaleString("zh-CN", { hour12: false }),
    module: activeModule.name,
    seconds: Number(durationEl.value),
    score: state.score,
    level: state.level,
  });
  localStorage.setItem(storeKey, JSON.stringify(records.slice(0, 18)));
}

function getRecords() {
  try {
    return JSON.parse(localStorage.getItem(storeKey) || "[]");
  } catch {
    return [];
  }
}

function renderRecords() {
  const records = getRecords();
  const today = new Date().toLocaleDateString("zh-CN");
  const todaySeconds = records
    .filter((item) => item.date.startsWith(today))
    .reduce((sum, item) => sum + item.seconds, 0);
  const minutes = Math.round(todaySeconds / 60);
  dailyMinutes.textContent = minutes;
  dailyRing.style.setProperty("--progress", `${Math.min(360, minutes * 18)}deg`);

  recordList.innerHTML = records.length
    ? records
        .slice(0, 5)
        .map(
          (item) => `
          <div class="record-chip">
            <strong>${item.score} 分</strong>
            <span>${item.module} · ${Math.round(item.seconds / 60)} 分钟</span>
          </div>
        `,
        )
        .join("")
    : '<p class="muted">暂无记录</p>';
}

moduleList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (button) setModule(button.dataset.id);
});

startBtn.addEventListener("click", startSession);
pauseBtn.addEventListener("click", togglePause);
canvas.addEventListener("click", handleCanvasClick);
difficultyEl.addEventListener("input", () => {
  state.level = Number(difficultyEl.value);
  updateHud();
  if (state.running) nextRound();
});
durationEl.addEventListener("change", () => resetSession(false));
fullBtn.addEventListener("click", () => {
  document.querySelector(".canvas-wrap").requestFullscreen?.();
});
window.addEventListener("resize", () => {
  resizeCanvas();
  drawIntro(performance.now());
});

resizeCanvas();
renderModules();
renderRecords();
setModule("tracking");
