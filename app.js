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
  { id: "tracking", name: "追光小球", type: "视觉追踪", icon: "●", color: "#1f7ae0", desc: "跟随移动目标，训练注视稳定" },
  { id: "crowding", name: "拥挤字母", type: "精细辨认", icon: "E", color: "#e44747", desc: "从干扰中找目标方向" },
  { id: "coordination", name: "星星捕手", type: "手眼协调", icon: "★", color: "#8a5cf6", desc: "点击目标并抑制误点" },
];

let activeModule = modules[0];
let state = { running: false, paused: true, score: 0, timeLeft: Number(durationEl.value), level: Number(difficultyEl.value), lastFrame: 0, target: null, choices: [], roundStarted: 0 };
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

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const { w, h } = getSize();
  return {
    x: ((event.clientX - rect.left) / rect.width) * w,
    y: ((event.clientY - rect.top) / rect.height) * h,
  };
}

function syncCanvasAfterViewportChange({ resetRound = false } = {}) {
  resizeCanvas();
  if (state.running && resetRound) nextRound();
  const now = performance.now();
  if (state.running && !state.paused) drawActive(now, 0);
  else drawIntro(now);
}

function renderModules() {
  moduleList.innerHTML = modules.map((item) => `<button class="module-btn" type="button" data-id="${item.id}" aria-current="${item.id === activeModule.id}"><span class="module-icon" style="background:${item.color}">${item.icon}</span><span><strong>${item.name}</strong><span>${item.desc}</span></span></button>`).join("");
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
  state = { ...state, running: keepRunning, paused: !keepRunning, score: 0, timeLeft: Number(durationEl.value), level: Number(difficultyEl.value), lastFrame: 0, target: null, choices: [] };
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
  return `${Math.floor(value / 60).toString().padStart(2, "0")}:${Math.floor(value % 60).toString().padStart(2, "0")}`;
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
  drawDynamicStimulusBackground(w, h, now);
  ctx.fillStyle = "#fff";
  ctx.font = "700 28px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(activeModule.name, w / 2, h / 2 - 20);
  ctx.fillStyle = "#d9f7ff";
  ctx.font = "16px system-ui";
  ctx.fillText("请保持 45-70cm 距离，训练中注意眨眼。", w / 2, h / 2 + 18);
}

function drawDynamicStimulusBackground(w, h, now) {
  const t = now / 1000;
  const gradient = ctx.createLinearGradient(Math.sin(t * 0.17) * w * 0.2, 0, w, h + Math.cos(t * 0.13) * h * 0.2);
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
  ["#00f5ff", "#ffea00", "#ff2bd6", "#39ff14", "#ff4d00"].forEach((color, i) => {
    for (let x = -h * 2 + i * 96; x < w + h * 2; x += 480) {
      ctx.fillStyle = color;
      ctx.fillRect(x + (t * 34) % 96, -h * 0.35, 34, h * 1.85);
    }
  });
  ctx.restore();
  ctx.globalAlpha = 1;
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
  if (state.timeLeft <= 0) return finishSession();
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
  if (activeModule.id === "tracking") state.target = { x: w * 0.25 + Math.random() * w * 0.5, y: h * 0.25 + Math.random() * h * 0.5, r: 24, vx: (80 + state.level * 28) * (Math.random() > 0.5 ? 1 : -1), vy: (70 + state.level * 22) * (Math.random() > 0.5 ? 1 : -1) };
  if (activeModule.id === "crowding") state.target = { angle: [0, 90, 180, 270][Math.floor(Math.random() * 4)], gap: Math.max(42, 90 - state.level * 7), size: Math.max(34, 70 - state.level * 3) };
  if (activeModule.id === "coordination") state.target = { x: 70 + Math.random() * (w - 140), y: 70 + Math.random() * (h - 140), r: Math.max(18, 34 - state.level * 2), expires: performance.now() + Math.max(900, 2200 - state.level * 170) };
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
  ctx.fillStyle = eyeModeEl.value === "right" ? "#ff2bd6" : "#00f5ff";
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
  ctx.fill();
  drawInstruction("眼睛跟随小球移动，听到提示后点击小球。");
}

function drawCrowding(now) {
  const { w, h } = getSize();
  drawDynamicStimulusBackground(w, h, now);
  drawTumblingE(w / 2, h / 2, state.target.size, state.target.angle, true);
  drawChoiceBar(["上", "右", "下", "左"]);
  drawInstruction("只判断中间 E 的开口方向，忽略周围干扰。");
}

function drawTumblingE(x, y, size, angle, isTarget) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.fillStyle = isTarget ? "#fff" : "#00f5ff";
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
  drawStar(state.target.x, state.target.y, state.target.r, state.target.r * 0.48, 5);
  drawInstruction("尽快点击星星，误点会扣分。");
}

function drawStar(cx, cy, outer, inner, points) {
  ctx.fillStyle = "#ffea00";
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
  ctx.fillStyle = "rgba(5,10,28,.78)";
  ctx.fillRect(20, 20, 560, 46);
  ctx.fillStyle = "#fff";
  ctx.font = "700 16px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(text, 36, 50);
}

function drawChoiceBar(labels) {
  const { w, h } = getSize();
  const map = { 上: "↑", 右: "→", 下: "↓", 左: "←" };
  labels.forEach((label, i) => {
    ctx.fillStyle = "#fff";
    ctx.fillText(map[label], w / 2 - 120 + i * 80, h - 52);
  });
}

function handleCanvasClick(event) {
  if (!state.running || state.paused) return;
  const { x, y } = getCanvasPoint(event);
  if (activeModule.id === "tracking" || activeModule.id === "coordination") {
    const t = state.target;
    const hit = Math.hypot(x - t.x, y - t.y) <= t.r + 14;
    state.score = Math.max(0, state.score + (hit ? 2 : -1));
    if (activeModule.id === "coordination" || hit) nextRound();
  } else {
    state.score += 1;
    nextRound();
  }
  updateHud();
}

function saveRecord() {
  const records = getRecords();
  records.unshift({ date: new Date().toLocaleString("zh-CN", { hour12: false }), module: activeModule.name, seconds: Number(durationEl.value), score: state.score, level: state.level });
  localStorage.setItem(storeKey, JSON.stringify(records.slice(0, 18)));
}

function getRecords() {
  try { return JSON.parse(localStorage.getItem(storeKey) || "[]"); } catch { return []; }
}

function renderRecords() {
  const records = getRecords();
  const minutes = Math.round(records.reduce((sum, item) => sum + item.seconds, 0) / 60);
  dailyMinutes.textContent = minutes;
  dailyRing.style.setProperty("--progress", `${Math.min(360, minutes * 18)}deg`);
  recordList.innerHTML = records.length ? records.slice(0, 5).map((item) => `<div class="record-chip"><strong>${item.score} 分</strong><span>${item.module} · ${Math.round(item.seconds / 60)} 分钟</span></div>`).join("") : '<p class="muted">暂无记录</p>';
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
  const target = document.querySelector(".canvas-wrap");
  if (document.fullscreenElement) document.exitFullscreen?.();
  else target.requestFullscreen?.();
});
window.addEventListener("resize", () => {
  syncCanvasAfterViewportChange({ resetRound: false });
});
document.addEventListener("fullscreenchange", () => {
  requestAnimationFrame(() => {
    syncCanvasAfterViewportChange({ resetRound: true });
  });
});

resizeCanvas();
renderModules();
renderRecords();
setModule("tracking");
