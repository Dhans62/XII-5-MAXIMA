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

let presentFrames = 0;
let absentFrames = 0;
const ENTER_FRAMES = 3;
const EXIT_FRAMES = 4;
let isTriggered = false;

let particles = [];
let lastHeartSpawn = 0;
let lastSparkleSpawn = 0;

/* ============================================================
   KAMERA
   ============================================================ */
async function startCamera() {
  cameraError.hidden = true;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    video.srcObject = mediaStream;
  } catch (err) {
    cameraError.hidden = false;
    console.error(err);
  }
}
document.getElementById("retryCameraBtn").addEventListener("click", startCamera);

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
async function initHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    },
    runningMode: "VIDEO",
    numHands: 1,
  });
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
  if (video.readyState >= 2 && handLandmarker) {
    const result = handLandmarker.detectForVideo(video, performance.now());
    let isPeaceSign = false;
    let handPos = null;

    if (result.landmarks && result.landmarks.length > 0) {
      isPeaceSign = detectPeaceSign(result.landmarks[0]);
      if (isPeaceSign) handPos = handScreenPosition(result.landmarks[0]);
    }

    if (isPeaceSign) {
      presentFrames++;
      absentFrames = 0;
    } else {
      absentFrames++;
      presentFrames = 0;
    }

    const wasTriggered = isTriggered;
    if (!isTriggered && presentFrames >= ENTER_FRAMES) {
      isTriggered = true;
    } else if (isTriggered && absentFrames >= EXIT_FRAMES) {
      isTriggered = false;
    }

    cameraWrap.classList.toggle("is-triggered", isTriggered);
    poseStatus.textContent = isTriggered ? "Pose terdeteksi ✌️" : "Gerakkan tangan lalu bentuk ✌️";

    const justStarted = isTriggered && !wasTriggered;
    handleModeFrame(justStarted, handPos);
  }

  requestAnimationFrame(detectionLoop);
}

/* ============================================================
   DISPATCH PER MODE
   ============================================================ */
function handleModeFrame(justStarted, handPos) {
  const now = performance.now();

  if (currentMode === "hearts" && isTriggered) {
    if (now - lastHeartSpawn > 180) {
      spawnHeart(handPos);
      lastHeartSpawn = now;
    }
  }

  if (currentMode === "confetti" && justStarted) {
    spawnConfettiBurst(handPos || { x: canvas.width / 2, y: canvas.height / 2 });
  }

  if (currentMode === "sparkle" && isTriggered) {
    if (now - lastSparkleSpawn > 60) {
      spawnSparkle(handPos);
      lastSparkleSpawn = now;
    }
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

function updateAndDrawParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles = particles.filter((p) => p.life > 0);

  particles.forEach((p) => {
    if (p.type === "heart") {
      p.y += p.vy;
      p.x += p.drift;
      p.life -= 0.012;
      drawHeart(p.x, p.y, p.size, Math.max(p.life, 0));
    } else if (p.type === "confetti") {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // gravitasi ringan
      p.spin += p.spinSpeed;
      p.life -= 0.02;
      ctx.save();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    } else if (p.type === "sparkle") {
      p.life -= 0.04;
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
