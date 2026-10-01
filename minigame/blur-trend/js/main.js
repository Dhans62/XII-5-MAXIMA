import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const video = document.getElementById("video");
const cameraWrap = document.getElementById("cameraWrap");
const cameraError = document.getElementById("cameraError");
const poseStatus = document.getElementById("poseStatus");
const colorWash = document.getElementById("colorWash");
const canvas = document.getElementById("particleCanvas");
const ctx = canvas.getContext("2d");

let currentMode = "blur";
let handLandmarker = null;
let mediaStream = null;
let cameraRequestId = 0; // penanda permintaan kamera terbaru; yang lebih lama dibatalkan
let cameraStarting = false;

let presentFrames = 0;
let absentFrames = 0;
let presentSince = 0;
let absentSince = 0;
/* Pose dianggap mulai/selesai kalau bertahan minimal sekian ms DAN terlihat di minimal sekian
   frame beruntun. Batas waktu menjaga perilaku di perangkat cepat (30 fps ~ 3 / 4 frame seperti
   dulu); batas frame menjaga satu frame meleset tidak langsung memicu di perangkat lambat. */
const ENTER_MS = 50;
const ENTER_MIN_FRAMES = 2;
const EXIT_MS = 80;
const EXIT_MIN_FRAMES = 2;
let isTriggered = false;

/* Pengukur performa: buka halaman dengan ?debug=1. Tidak aktif secara default. */
const DEBUG = new URLSearchParams(location.search).has("debug");
let dbgEl = null;
let dbgMsAvg = 0;
let dbgCount = 0;
let dbgFps = 0;
let dbgRaf = 0;
let dbgRafFps = 0;
let dbgWindowStart = performance.now();
let dbgWasPose = false;
let dbgRawStart = 0;
let dbgRawEnd = 0;
let dbgEnterMs = null;
let dbgExitMs = null;
if (DEBUG) {
  dbgEl = document.createElement("div");
  dbgEl.style.cssText =
    "position:absolute;top:.5rem;left:.5rem;z-index:7;font:11px/1.4 monospace;" +
    "background:rgba(0,0,0,.65);color:#9f9;padding:.4rem .5rem;border-radius:6px;" +
    "pointer-events:none;white-space:pre";
  cameraWrap.appendChild(dbgEl);
}

let particles = [];
let lastHeartSpawn = 0;
let lastSparkleSpawn = 0;

/* ============================================================
   KAMERA
   ============================================================ */
const POSE_HINT = "Gerakkan tangan lalu bentuk pose dua jari";

function resetPoseState() {
  presentFrames = 0;
  absentFrames = 0;
  isTriggered = false;
  particles = [];
  cameraWrap.classList.remove("is-triggered");
  colorWash.classList.remove("is-flashing");
  poseStatus.textContent = POSE_HINT;
}

function stopCamera() {
  cameraRequestId++; // batalkan permintaan getUserMedia yang masih menunggu
  cameraStarting = false;
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
  video.srcObject = null;
  resetPoseState(); // jangan biarkan blur/efek "nyangkut" di frame terakhir
}

async function startCamera() {
  stopCamera(); // stream lama selalu dimatikan sebelum minta yang baru
  if (document.hidden) return; // dinyalakan lagi oleh visibilitychange saat tab terlihat
  const myId = cameraRequestId;
  cameraStarting = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    // Permintaan ini sudah usang (ada yang baru / kamera dimatikan) atau tab sedang tersembunyi
    if (myId !== cameraRequestId || document.hidden) {
      stream.getTracks().forEach((t) => t.stop());
      if (myId === cameraRequestId) cameraStarting = false;
      return;
    }
    mediaStream = stream;
    cameraStarting = false;
    video.srcObject = stream;
    cameraError.hidden = true;
  } catch (err) {
    if (myId !== cameraRequestId) return;
    cameraStarting = false;
    // Stream lama sudah dimatikan di atas, jadi gagal di sini berarti memang tidak ada kamera
    cameraError.hidden = false;
    console.error("Kamera gagal:", err.name, err.message);
  }
}
document.getElementById("retryCameraBtn").addEventListener("click", startCamera);

function resumeCameraIfNeeded() {
  if (document.hidden || mediaStream || cameraStarting) return;
  if (!cameraError.hidden) return; // sedang error izin: tunggu tombol Coba Lagi
  startCamera();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopCamera();
  else resumeCameraIfNeeded();
});
window.addEventListener("pagehide", stopCamera);
window.addEventListener("pageshow", (e) => {
  if (e.persisted) resumeCameraIfNeeded(); // kembali dari bfcache
});

function resizeCanvas() {
  canvas.width = cameraWrap.clientWidth;
  canvas.height = cameraWrap.clientHeight;
}
window.addEventListener("resize", resizeCanvas);

/* ============================================================
   MODE SWITCH
   ============================================================ */
document.getElementById("modeRow").addEventListener("click", (e) => {
  const btn = e.target.closest(".mode-chip");
  if (!btn) return;
  document.querySelectorAll(".mode-chip").forEach((c) => c.classList.remove("is-active"));
  btn.classList.add("is-active");
  cameraWrap.classList.remove(`mode-${currentMode}`);
  currentMode = btn.dataset.mode;
  cameraWrap.classList.add(`mode-${currentMode}`);
  particles = [];
});
cameraWrap.classList.add(`mode-${currentMode}`);

/* ============================================================
   DETEKSI POSE (MediaPipe Hand Landmarker)
   ============================================================ */
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
// Default tetap CPU. Untuk uji coba GPU: tambahkan ?delegate=gpu di URL (jatuh ke CPU kalau gagal).
const WANT_GPU = new URLSearchParams(location.search).get("delegate") === "gpu";
let visionFileset = null;
let activeDelegate = "CPU";
let fallingBack = false;

function createLandmarker(delegate) {
  const baseOptions = { modelAssetPath: MODEL_URL };
  if (delegate === "GPU") baseOptions.delegate = "GPU";
  return HandLandmarker.createFromOptions(visionFileset, {
    baseOptions,
    runningMode: "VIDEO",
    numHands: 1,
  });
}

async function initHandLandmarker() {
  visionFileset = await FilesetResolver.forVisionTasks(WASM_URL);
  if (WANT_GPU) {
    try {
      handLandmarker = await createLandmarker("GPU");
      activeDelegate = "GPU";
      return;
    } catch (err) {
      console.warn("Delegate GPU gagal, pakai CPU:", err.name, err.message);
    }
  }
  handLandmarker = await createLandmarker("CPU");
  activeDelegate = "CPU";
}

// Dipanggil kalau deteksi GPU melempar error saat berjalan
async function fallbackToCpu() {
  if (fallingBack) return;
  fallingBack = true;
  const old = handLandmarker;
  handLandmarker = null; // loop deteksi berhenti sementara sampai siap
  try { old?.close(); } catch (_) { /* abaikan */ }
  try {
    handLandmarker = await createLandmarker("CPU");
    activeDelegate = "CPU (cadangan)";
  } catch (err) {
    console.error("Gagal pindah ke CPU:", err.name, err.message);
  }
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isFingerExtended(landmarks, tipIdx, pipIdx) {
  const wrist = landmarks[0];
  return distance(wrist, landmarks[tipIdx]) > distance(wrist, landmarks[pipIdx]) * 1.1;
}

function detectPeaceSign(landmarks) {
  const indexExtended = isFingerExtended(landmarks, 8, 6);
  const middleExtended = isFingerExtended(landmarks, 12, 10);
  const ringExtended = isFingerExtended(landmarks, 16, 14);
  const pinkyExtended = isFingerExtended(landmarks, 20, 18);
  return indexExtended && middleExtended && !ringExtended && !pinkyExtended;
}

/* Posisi tangan di koordinat layar (px), dicerminkan biar sesuai video mirror */
function handScreenPosition(landmarks) {
  const midX = (landmarks[8].x + landmarks[12].x) / 2;
  const midY = (landmarks[8].y + landmarks[12].y) / 2;
  return {
    x: (1 - midX) * canvas.width, // dicerminkan
    y: midY * canvas.height,
  };
}

function detectionLoop() {
  if (DEBUG) dbgRaf++;
  if (mediaStream && video.readyState >= 2 && handLandmarker) {
    const dbgT0 = performance.now();
    let result;
    try {
      result = handLandmarker.detectForVideo(video, dbgT0);
    } catch (err) {
      console.error("Deteksi gagal:", err.name, err.message);
      if (activeDelegate === "GPU") fallbackToCpu();
      requestAnimationFrame(detectionLoop);
      return;
    }
    if (DEBUG) {
      const dt = performance.now() - dbgT0;
      dbgMsAvg = dbgMsAvg ? dbgMsAvg * 0.9 + dt * 0.1 : dt;
      dbgCount++;
    }
    let isPeaceSign = false;
    let handPos = null;

    if (result.landmarks && result.landmarks.length > 0) {
      isPeaceSign = detectPeaceSign(result.landmarks[0]);
      if (isPeaceSign) handPos = handScreenPosition(result.landmarks[0]);
    }

    const frameNow = performance.now();
    if (isPeaceSign) {
      if (presentFrames === 0) presentSince = frameNow;
      presentFrames++;
      absentFrames = 0;
    } else {
      if (absentFrames === 0) absentSince = frameNow;
      absentFrames++;
      presentFrames = 0;
    }

    const wasTriggered = isTriggered;
    if (!isTriggered && presentFrames >= ENTER_MIN_FRAMES && frameNow - presentSince >= ENTER_MS) {
      isTriggered = true;
    } else if (isTriggered && absentFrames >= EXIT_MIN_FRAMES && frameNow - absentSince >= EXIT_MS) {
      isTriggered = false;
    }

    cameraWrap.classList.toggle("is-triggered", isTriggered);
    poseStatus.textContent = isTriggered ? "Pose terdeteksi" : POSE_HINT;

    const justStarted = isTriggered && !wasTriggered;
    handleModeFrame(justStarted, handPos);

    if (DEBUG) {
      const now = performance.now();
      if (isPeaceSign && !dbgWasPose) dbgRawStart = now;
      if (!isPeaceSign && dbgWasPose) dbgRawEnd = now;
      dbgWasPose = isPeaceSign;
      if (justStarted) dbgEnterMs = now - dbgRawStart;
      if (wasTriggered && !isTriggered) dbgExitMs = now - dbgRawEnd;
      if (now - dbgWindowStart >= 1000) {
        dbgFps = (dbgCount * 1000) / (now - dbgWindowStart);
        dbgRafFps = (dbgRaf * 1000) / (now - dbgWindowStart);
        dbgRaf = 0;
        dbgCount = 0;
        dbgWindowStart = now;
      }
      const f = (n) => (n == null ? "-" : Math.round(n) + " ms");
      dbgEl.textContent =
        `delegate: ${activeDelegate}\n` +
        `deteksi: ${dbgMsAvg.toFixed(0)} ms/frame, ${dbgFps.toFixed(1)} fps\n` +
        `layar (rAF): ${dbgRafFps.toFixed(1)} fps\n` +
        `video: ${video.videoWidth}x${video.videoHeight}\n` +
        `pose mentah: ${isPeaceSign ? "ya" : "tidak"} (hadir ${presentFrames}, absen ${absentFrames})\n` +
        `lama sampai aktif: ${f(dbgEnterMs)}\n` +
        `lama sampai mati: ${f(dbgExitMs)}`;
    }
  }

  requestAnimationFrame(detectionLoop);
}

/* ============================================================
   DISPATCH PER MODE
   ============================================================ */
// Berapa partikel yang "jatuh tempo" sejak spawn terakhir (maks. cap, supaya tidak menyembur)
function dueSpawns(last, now, interval, cap = 3) {
  return Math.min(cap, Math.floor((now - last) / interval));
}

function handleModeFrame(justStarted, handPos) {
  const now = performance.now();

  if (currentMode === "hearts" && isTriggered) {
    const n = dueSpawns(lastHeartSpawn, now, 180);
    for (let i = 0; i < n; i++) spawnHeart(handPos);
    if (n > 0) lastHeartSpawn = now;
  }

  if (currentMode === "confetti" && justStarted) {
    spawnConfettiBurst(handPos || { x: canvas.width / 2, y: canvas.height / 2 });
  }

  if (currentMode === "sparkle" && isTriggered) {
    const n = dueSpawns(lastSparkleSpawn, now, 60);
    for (let i = 0; i < n; i++) spawnSparkle(handPos);
    if (n > 0) lastSparkleSpawn = now;
  }

  if (currentMode === "colorwash" && justStarted) {
    colorWash.classList.remove("is-flashing");
    void colorWash.offsetWidth; // reset animasi
    colorWash.classList.add("is-flashing");
    setTimeout(() => colorWash.classList.remove("is-flashing"), 650);
  }
}

/* ============================================================
   SISTEM PARTIKEL (canvas)
   ============================================================ */
function spawnHeart(handPos) {
  const baseX = handPos ? handPos.x : canvas.width / 2;
  particles.push({
    type: "heart",
    x: baseX + (Math.random() - 0.5) * 40,
    y: canvas.height - 20,
    vy: -(1.2 + Math.random() * 0.8),
    drift: (Math.random() - 0.5) * 1.2,
    size: 18 + Math.random() * 14,
    life: 1,
  });
}

function spawnConfettiBurst(pos) {
  const colors = ["#F5A0BE", "#B8945A", "#7FA6C4", "#FFD452", "#8CA88A"];
  for (let i = 0; i < 26; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    particles.push({
      type: "confetti",
      x: pos.x,
      y: pos.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      size: 5 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
      spin: Math.random() * Math.PI,
      spinSpeed: (Math.random() - 0.5) * 0.3,
    });
  }
}

function spawnSparkle(handPos) {
  if (!handPos) return;
  particles.push({
    type: "sparkle",
    x: handPos.x + (Math.random() - 0.5) * 60,
    y: handPos.y + (Math.random() - 0.5) * 60,
    size: 3 + Math.random() * 5,
    life: 1,
  });
}

function drawHeart(x, y, size, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#F5566F";
  ctx.translate(x, y);
  ctx.beginPath();
  const s = size / 20;
  ctx.moveTo(0, 5 * s);
  ctx.bezierCurveTo(-10 * s, -6 * s, -20 * s, 4 * s, 0, 16 * s);
  ctx.bezierCurveTo(20 * s, 4 * s, 10 * s, -6 * s, 0, 5 * s);
  ctx.fill();
  ctx.restore();
}

let lastParticleTime = performance.now();

function updateAndDrawParticles() {
  // dt dalam satuan "frame 60 fps": gerak sama di layar 30/60/120 Hz dan saat main thread sibuk.
  // Dibatasi 12 supaya tidak melompat jauh setelah tab lama tersembunyi.
  const nowT = performance.now();
  const dt = Math.min((nowT - lastParticleTime) / (1000 / 60), 12);
  lastParticleTime = nowT;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles = particles.filter((p) => p.life > 0);

  particles.forEach((p) => {
    if (p.type === "heart") {
      p.y += p.vy * dt;
      p.x += p.drift * dt;
      p.life -= 0.012 * dt;
      drawHeart(p.x, p.y, p.size, Math.max(p.life, 0));
    } else if (p.type === "confetti") {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.12 * dt; // gravitasi ringan
      p.spin += p.spinSpeed * dt;
      p.life -= 0.02 * dt;
      ctx.save();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    } else if (p.type === "sparkle") {
      p.life -= 0.04 * dt;
      ctx.save();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = "#FFF4C2";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  requestAnimationFrame(updateAndDrawParticles);
}

/* ============================================================
   INIT
   ============================================================ */
resizeCanvas();
startCamera();
initHandLandmarker().then(() => {
  detectionLoop();
});
updateAndDrawParticles();
