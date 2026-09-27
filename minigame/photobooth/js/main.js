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
   TEMA — kategori & template
   ============================================================ */
const THEME_DATA = {
  lucu: [
    {
      id: "bunga",
      label: "Bunga",
      stickers: [
        { src: "assets/themes/lucu/bunga.svg", pos: "pos-top-left" },
        { src: "assets/themes/lucu/bunga.svg", pos: "pos-top-right" },
      ],
    },
    {
      id: "kuning",
      label: "Kuning",
      stickers: [{ src: "assets/themes/lucu/kuning.svg", pos: "pos-bottom-center" }],
    },
  ],
  keren: [
    {
      id: "neon",
      label: "Neon",
      stickers: [{ src: "assets/themes/keren/neon.svg", pos: "pos-top-right" }],
    },
    {
      id: "percikan",
      label: "Percikan",
      stickers: [
        { src: "assets/themes/keren/percikan.svg", pos: "pos-top-left" },
        { src: "assets/themes/keren/percikan.svg", pos: "pos-top-right" },
      ],
    },
  ],
  estetik: [
    {
      id: "ombak",
      label: "Ombak",
      stickers: [{ src: "assets/themes/estetik/ombak.svg", pos: "pos-bottom-center" }],
    },
    {
      id: "daun",
      label: "Daun",
      stickers: [{ src: "assets/themes/estetik/daun.svg", pos: "pos-top-left" }],
    },
  ],
};

let currentCategory = "lucu";
const templateListEl = document.getElementById("templateList");
const stickerLayer = document.getElementById("stickerLayer");

document.querySelectorAll(".theme-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".theme-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    currentCategory = btn.dataset.category;
    cameraWrap.dataset.theme = currentCategory;
    renderTemplateList(currentCategory);
  });
});

function renderTemplateList(category) {
  const templates = THEME_DATA[category];
  templateListEl.innerHTML = "";
  templates.forEach((tpl, i) => {
    const btn = document.createElement("button");
    btn.className = "template-btn" + (i === 0 ? " is-active" : "");
    btn.innerHTML = `<img src="${tpl.stickers[0].src}" alt=""><span>${tpl.label}</span>`;
    btn.addEventListener("click", () => {
      templateListEl.querySelectorAll(".template-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      applyStickers(tpl.stickers);
    });
    templateListEl.appendChild(btn);
  });
  applyStickers(templates[0].stickers);
}

function applyStickers(stickers) {
  stickerLayer.innerHTML = "";
  stickers.forEach((s) => {
    const img = document.createElement("img");
    img.src = s.src;
    img.className = s.pos;
    img.alt = "";
    stickerLayer.appendChild(img);
  });
}

renderTemplateList(currentCategory);

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

  // Gambar video (dicerminkan biar sama seperti yang dilihat di preview)
  ctx.translate(captureCanvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Gambar stiker tema (tidak dicerminkan, sama seperti tampilan layar)
  drawStickersToCanvas(ctx, captureCanvas.width, captureCanvas.height);

  const dataUrl = captureCanvas.toDataURL("image/png");
  capturedPhotos.push(dataUrl);

  const img = document.createElement("img");
  img.src = dataUrl;
  resultStrip.appendChild(img);
}

function drawStickersToCanvas(ctx, canvasW, canvasH) {
  const stickerImgs = stickerLayer.querySelectorAll("img");
  stickerImgs.forEach((el) => {
    const w = el.naturalWidth || 200;
    const h = el.naturalHeight || 200;
    const ratio = h / w;

    let boxW, x, y;
    if (el.classList.contains("pos-top-left")) {
      boxW = canvasW * 0.18;
      x = canvasW * 0.03;
      y = canvasH * 0.03;
    } else if (el.classList.contains("pos-top-right")) {
      boxW = canvasW * 0.18;
      x = canvasW * 0.97 - boxW;
      y = canvasH * 0.03;
    } else {
      // pos-bottom-center
      boxW = canvasW * 0.55;
      x = (canvasW - boxW) / 2;
      y = canvasH * 0.62;
    }

    const boxH = boxW * ratio;
    ctx.drawImage(el, x, y, boxW, boxH);
  });
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

let presentFrames = 0;
let absentFrames = 0;
const ENTER_FRAMES = 3;
const EXIT_FRAMES = 5;

function blurLoop() {
  if (!blurLoopActive || currentMode !== "blur") return;

  if (video.readyState >= 2) {
    const result = handLandmarker.detectForVideo(video, performance.now());
    let isPeaceSign = false;

    if (result.landmarks && result.landmarks.length > 0) {
      isPeaceSign = detectPeaceSign(result.landmarks[0]);
    }

    if (isPeaceSign) {
      presentFrames++;
      absentFrames = 0;
    } else {
      absentFrames++;
      presentFrames = 0;
    }

    const currentlyBlurred = cameraWrap.classList.contains("is-blurred");
    let shouldBlur = currentlyBlurred;

    if (!currentlyBlurred && presentFrames >= ENTER_FRAMES) {
      shouldBlur = true;
    } else if (currentlyBlurred && absentFrames >= EXIT_FRAMES) {
      shouldBlur = false;
    }

    cameraWrap.classList.toggle("is-blurred", shouldBlur);
    blurStatus.textContent = shouldBlur
      ? "Pose terdeteksi ✌️ — blur aktif"
      : "Gerakkan tangan untuk efek blur ✌️";
  }

  requestAnimationFrame(blurLoop);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isFingerExtended(landmarks, tipIdx, pipIdx) {
  const wrist = landmarks[0];
  const distTip = distance(wrist, landmarks[tipIdx]);
  const distPip = distance(wrist, landmarks[pipIdx]);
  return distTip > distPip * 1.1;
}

function detectPeaceSign(landmarks) {
  const indexExtended = isFingerExtended(landmarks, 8, 6);
  const middleExtended = isFingerExtended(landmarks, 12, 10);
  const ringExtended = isFingerExtended(landmarks, 16, 14);
  const pinkyExtended = isFingerExtended(landmarks, 20, 18);

  return indexExtended && middleExtended && !ringExtended && !pinkyExtended;
}

/* ============================================================
   INIT
   ============================================================ */
startCamera();
