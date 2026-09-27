import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const video = document.getElementById("video");
const cameraWrap = document.getElementById("cameraWrap");
const captureCanvas = document.getElementById("captureCanvas");
const countdownOverlay = document.getElementById("countdownOverlay");
const blurStatus = document.getElementById("blurStatus");
const captureBtn = document.getElementById("captureBtn");
const jumlahFotoSelect = document.getElementById("jumlahFoto");
const resultStrip = document.getElementById("resultStrip");
const downloadBtn = document.getElementById("downloadBtn");
const photoboothControls = document.getElementById("photoboothControls");
const modePhotoboothBtn = document.getElementById("modePhotobooth");
const modeBlurBtn = document.getElementById("modeBlur");

let currentMode = "photobooth"; // "photobooth" | "blur"
let capturedPhotos = [];
let handLandmarker = null;
let blurLoopActive = false;
let lastLandmarks = null;

/* ============================================================
   KAMERA
   ============================================================ */
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
  } catch (err) {
    alert("Kamera tidak bisa diakses. Pastikan izin kamera sudah diberikan.");
    console.error(err);
  }
}

/* ============================================================
   TEMA
   ============================================================ */
document.querySelectorAll(".theme-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".theme-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    cameraWrap.dataset.theme = btn.dataset.theme;
  });
});

/* ============================================================
   MODE SWITCH
   ============================================================ */
modePhotoboothBtn.addEventListener("click", () => switchMode("photobooth"));
modeBlurBtn.addEventListener("click", () => switchMode("blur"));

function switchMode(mode) {
  currentMode = mode;
  modePhotoboothBtn.classList.toggle("is-active", mode === "photobooth");
  modeBlurBtn.classList.toggle("is-active", mode === "blur");
  photoboothControls.style.display = mode === "photobooth" ? "block" : "none";
  blurStatus.hidden = mode !== "blur";

  if (mode === "blur") {
    startBlurTrend();
  } else {
    stopBlurTrend();
  }
}

/* ============================================================
   PHOTOBOOTH — CAPTURE
   ============================================================ */
captureBtn.addEventListener("click", async () => {
  const jumlah = parseInt(jumlahFotoSelect.value, 10);
  const isAuto = document.querySelector('input[name="captureMode"]:checked').value === "auto";

  capturedPhotos = [];
  resultStrip.innerHTML = "";
  downloadBtn.hidden = true;
  captureBtn.disabled = true;

  for (let i = 0; i < jumlah; i++) {
    if (isAuto) {
      await runCountdown(5);
    }
    takeSnapshot();
    await wait(400); // jeda singkat antar foto biar sempat ganti pose
  }

  captureBtn.disabled = false;
  if (capturedPhotos.length > 1) {
    buildStripAndEnableDownload();
  } else if (capturedPhotos.length === 1) {
    downloadBtn.href = capturedPhotos[0];
    downloadBtn.hidden = false;
  }
});

function runCountdown(seconds) {
  return new Promise((resolve) => {
    countdownOverlay.hidden = false;
    let remaining = seconds;
    countdownOverlay.textContent = remaining;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        countdownOverlay.hidden = true;
        resolve();
      } else {
        countdownOverlay.textContent = remaining;
      }
    }, 1000);
  });
}

function takeSnapshot() {
  const ctx = captureCanvas.getContext("2d");
  captureCanvas.width = video.videoWidth;
  captureCanvas.height = video.videoHeight;
  // Mirror horizontal supaya hasil foto tidak terbalik seperti preview
  ctx.translate(captureCanvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const dataUrl = captureCanvas.toDataURL("image/png");
  capturedPhotos.push(dataUrl);

  const img = document.createElement("img");
  img.src = dataUrl;
  resultStrip.appendChild(img);
}

function buildStripAndEnableDownload() {
  const images = capturedPhotos.map((src) => {
    const img = new Image();
    img.src = src;
    return img;
  });

  Promise.all(
    images.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) resolve();
          else img.onload = resolve;
        })
    )
  ).then(() => {
    const stripCanvas = document.createElement("canvas");
    const w = images[0].width;
    const gap = 12;
    const h = images.reduce((sum, img) => sum + img.height + gap, gap);
    stripCanvas.width = w;
    stripCanvas.height = h;

    const ctx = stripCanvas.getContext("2d");
    ctx.fillStyle = "#F2ECDD";
    ctx.fillRect(0, 0, w, h);

    let y = gap;
    images.forEach((img) => {
      ctx.drawImage(img, 0, y);
      y += img.height + gap;
    });

    downloadBtn.href = stripCanvas.toDataURL("image/png");
    downloadBtn.hidden = false;
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ============================================================
   BLUR TREND — deteksi gerakan tangan via MediaPipe
   ============================================================ */
async function initHandLandmarker() {
  if (handLandmarker) return handLandmarker;
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
  return handLandmarker;
}

async function startBlurTrend() {
  blurLoopActive = true;
  blurStatus.textContent = "Memuat deteksi tangan...";
  try {
    await initHandLandmarker();
    blurStatus.textContent = "Gerakkan tangan untuk efek blur ✌️";
    requestAnimationFrame(blurLoop);
  } catch (err) {
    blurStatus.textContent = "Deteksi tangan gagal dimuat.";
    console.error(err);
  }
}

function stopBlurTrend() {
  blurLoopActive = false;
  cameraWrap.classList.remove("is-blurred");
}

function blurLoop() {
  if (!blurLoopActive || currentMode !== "blur") return;

  if (video.readyState >= 2) {
    const result = handLandmarker.detectForVideo(video, performance.now());

    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      const movement = calculateMovement(landmarks, lastLandmarks);
      lastLandmarks = landmarks;

      const isMoving = movement > 0.015; // ambang batas, bisa disesuaikan
      cameraWrap.classList.toggle("is-blurred", isMoving);
    } else {
      lastLandmarks = null;
      cameraWrap.classList.remove("is-blurred");
    }
  }

  requestAnimationFrame(blurLoop);
}

function calculateMovement(current, previous) {
  if (!previous) return 0;
  let total = 0;
  for (let i = 0; i < current.length; i++) {
    const dx = current[i].x - previous[i].x;
    const dy = current[i].y - previous[i].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total / current.length;
}

/* ============================================================
   INIT
   ============================================================ */
startCamera();
