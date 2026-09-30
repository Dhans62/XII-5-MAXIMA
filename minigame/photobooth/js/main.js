import { LAYOUTS, getLayout } from "./layouts.js";
import { THEMES, getTemplate, getFirstTemplate } from "./themes.js";

const FILTERS = [
  { id: "normal", label: "Normal", css: "none" },
  { id: "warm", label: "Hangat", css: "sepia(0.25) saturate(1.2) brightness(1.05)" },
  { id: "cool", label: "Sejuk", css: "saturate(1.1) hue-rotate(15deg) brightness(1.02)" },
  { id: "bw", label: "B&W", css: "grayscale(1) contrast(1.05)" },
];

const state = {
  layout: getLayout("strip4"),
  filter: FILTERS[0],
  category: "lucu",
  template: getFirstTemplate("lucu"),
  timerMode: "manual",
  capturedPhotos: [], // Image[] — sudah dicrop sesuai rasio slot & sudah kena filter
};

let mediaStream = null;

/* ============================================================
   ELEMEN
   ============================================================ */
const el = (id) => document.getElementById(id);
const video = el("video");
const videoCapture = el("videoCapture");
const cameraError = el("cameraError");

/* ============================================================
   KAMERA
   ============================================================ */
async function startCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    video.srcObject = mediaStream;
    videoCapture.srcObject = mediaStream;
    cameraError.hidden = true;
  } catch (err) {
    if (video.readyState < 2) {
      cameraError.hidden = false;
    }
    console.error(err);
  }
}

el("retryCameraBtn")?.addEventListener("click", startCamera);

function applyFilterToVideos() {
  video.style.filter = state.filter.css;
  videoCapture.style.filter = state.filter.css;
}

/* ============================================================
   NAVIGASI LAYAR
   ============================================================ */
function showScreen(id) {
  ["screenPrep", "screenCapture", "screenResult"].forEach((s) => {
    el(s).hidden = s !== id;
  });
}

/* ============================================================
   BOTTOM SHEET (umum)
   ============================================================ */
function openSheet(id) {
  el(id).classList.add("is-open");
}
function closeSheet(id) {
  el(id).classList.remove("is-open");
}
document.querySelectorAll(".sheet").forEach((sheet) => {
  sheet.querySelectorAll("[data-close-sheet]").forEach((btn) => {
    btn.addEventListener("click", () => sheet.classList.remove("is-open"));
  });
});

/* ============================================================
   TIMER CHIPS
   ============================================================ */
el("timerChips").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  document.querySelectorAll("#timerChips .chip").forEach((c) => c.classList.remove("is-active"));
  btn.classList.add("is-active");
  state.timerMode = btn.dataset.timer;
});

/* ============================================================
   LAYOUT PICKER
   ============================================================ */
function layoutThumbHTML(layout) {
  let cols = 1, rows = layout.count;
  if (layout.arrangement === "grid2x2") { cols = 2; rows = 2; }
  if (layout.arrangement === "grid2x3") { cols = 2; rows = 3; }
  const cells = Array.from({ length: layout.count }, () => "<span></span>").join("");
  return `<div class="layout-thumb" style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);">${cells}</div>`;
}

function renderLayoutGrid() {
  const grid = el("layoutGrid");
  grid.innerHTML = "";
  LAYOUTS.forEach((layout) => {
    const btn = document.createElement("button");
    btn.className = "layout-option" + (layout.id === state.layout.id ? " is-active" : "");
    btn.innerHTML = `${layoutThumbHTML(layout)}<span class="layout-option__label">${layout.label}</span>`;
    btn.addEventListener("click", () => {
      state.layout = layout;
      updateLayoutLabel();
      renderLayoutGrid();
      closeSheet("sheetLayout");
    });
    grid.appendChild(btn);
  });
}

function updateLayoutLabel() {
  el("layoutLabel").textContent = state.layout.label;
}

el("btnLayout").addEventListener("click", () => {
  renderLayoutGrid();
  openSheet("sheetLayout");
});

/* ============================================================
   FILTER PICKER
   ============================================================ */
function renderFilterGrid() {
  const grid = el("filterGrid");
  grid.innerHTML = "";
  FILTERS.forEach((f) => {
    const btn = document.createElement("button");
    btn.className = "filter-option" + (f.id === state.filter.id ? " is-active" : "");
    btn.innerHTML = `<span class="filter-option__swatch" style="filter:${f.css};background:linear-gradient(135deg,#e8b4c8,#a8c8e8);"></span><span class="filter-option__label">${f.label}</span>`;
    btn.addEventListener("click", () => {
      state.filter = f;
      applyFilterToVideos();
      renderFilterGrid();
      updateFilterLabel();
      closeSheet("sheetFilter");
    });
    grid.appendChild(btn);
  });
}

function updateFilterLabel() {
  el("filterLabel").textContent = state.filter.id === "normal" ? "Filter" : state.filter.label;
}

el("btnFilter").addEventListener("click", () => {
  renderFilterGrid();
  openSheet("sheetFilter");
});

/* ============================================================
   TEMA PICKER (dipakai bersama Layar 1 & Layar 3)
   ============================================================ */
function renderThemeCategoryRow() {
  const row = el("themeCategoryRow");
  row.innerHTML = "";
  Object.keys(THEMES).forEach((catId) => {
    const btn = document.createElement("button");
    btn.className = "theme-category-btn" + (catId === state.category ? " is-active" : "");
    btn.textContent = THEMES[catId].label;
    btn.addEventListener("click", () => {
      state.category = catId;
      state.template = getFirstTemplate(catId);
      renderThemeCategoryRow();
      renderThemeTemplateGrid();
    });
    row.appendChild(btn);
  });
}

function renderThemeTemplateGrid() {
  const grid = el("themeTemplateGrid");
  grid.innerHTML = "";
  THEMES[state.category].templates.forEach((tpl) => {
    const card = document.createElement("button");
    card.className = "theme-template-card" + (tpl.id === state.template.id ? " is-active" : "");
    card.innerHTML = `
      <div class="theme-template-card__swatch" style="background:${tpl.frameColor}; border:2px solid ${tpl.borderColor};"></div>
      <div class="theme-template-card__label">${tpl.label}</div>
    `;
    card.addEventListener("click", () => {
      state.template = tpl;
      renderThemeTemplateGrid();
      updateThemeLabels();
      if (!el("screenResult").hidden) renderResult();
    });
    grid.appendChild(card);
  });
}

function updateThemeLabels() {
  el("themeLabelPrep").textContent = state.template.label;
  el("themeLabelResult").textContent = state.template.label;
}

function openThemeSheet() {
  renderThemeCategoryRow();
  renderThemeTemplateGrid();
  openSheet("sheetTheme");
}
el("btnThemePrep").addEventListener("click", openThemeSheet);
el("btnThemeResult").addEventListener("click", openThemeSheet);

/* ============================================================
   MULAI FOTO -> LAYAR 2
   ============================================================ */
el("mulaiFotoBtn").addEventListener("click", () => {
  state.capturedPhotos = [];
  el("thumbRow").innerHTML = "";
  el("nextBtn").hidden = true;
  el("manualCaptureBtn").hidden = false;
  updateCaptureStatus();
  showScreen("screenCapture");
  if (state.timerMode !== "manual") {
    runAutoCaptureSequence();
  }
});

function updateCaptureStatus() {
  el("captureStatus").textContent = `Foto ${state.capturedPhotos.length + 1} dari ${state.layout.count}`;
}

/* ============================================================
   PENGAMBILAN FOTO
   ============================================================ */
el("manualCaptureBtn").addEventListener("click", () => {
  captureOnePhoto();
});

async function runAutoCaptureSequence() {
  el("manualCaptureBtn").hidden = true;
  const seconds = parseInt(state.timerMode, 10);
  while (state.capturedPhotos.length < state.layout.count) {
    await runCountdown(seconds);
    captureOnePhoto();
    await wait(500);
  }
}

function runCountdown(seconds) {
  return new Promise((resolve) => {
    const overlay = el("countdownOverlay");
    let remaining = seconds;
    overlay.hidden = false;
    overlay.textContent = remaining;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        overlay.hidden = true;
        resolve();
      } else {
        overlay.textContent = remaining;
      }
    }, 1000);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function captureOnePhoto() {
  const slotW = 480;
  const slotH = Math.round(slotW / state.layout.ratio);

  const canvas = document.createElement("canvas");
  canvas.width = slotW;
  canvas.height = slotH;
  const ctx = canvas.getContext("2d");
  ctx.filter = state.filter.css;

  // Center-crop video ke rasio slot, sekaligus mirror horizontal
  const vw = videoCapture.videoWidth;
  const vh = videoCapture.videoHeight;
  const videoRatio = vw / vh;
  const targetRatio = slotW / slotH;
  let sx, sy, sw, sh;
  if (videoRatio > targetRatio) {
    sh = vh;
    sw = vh * targetRatio;
    sx = (vw - sw) / 2;
    sy = 0;
  } else {
    sw = vw;
    sh = vw / targetRatio;
    sx = 0;
    sy = (vh - sh) / 2;
  }

  ctx.translate(slotW, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoCapture, sx, sy, sw, sh, 0, 0, slotW, slotH);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const img = new Image();
  img.src = canvas.toDataURL("image/png");
  state.capturedPhotos.push(img);

  const thumb = document.createElement("img");
  thumb.src = img.src;
  el("thumbRow").appendChild(thumb);

  if (state.capturedPhotos.length >= state.layout.count) {
    el("manualCaptureBtn").hidden = true;
    el("nextBtn").hidden = false;
    el("captureStatus").textContent = "Semua foto sudah diambil";
  } else {
    updateCaptureStatus();
    if (state.timerMode === "manual") {
      // tetap manual, tombol Ambil Foto sudah tampil
    }
  }
}

el("nextBtn").addEventListener("click", () => {
  showScreen("screenResult");
  renderResult();
});

/* ============================================================
   LAYAR 3 — RAKIT HASIL
   ============================================================ */
const stickerImageCache = new Map();
function loadStickerImage(src) {
  if (stickerImageCache.has(src)) return stickerImageCache.get(src);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  stickerImageCache.set(src, p);
  return p;
}

async function renderResult() {
  const layout = state.layout;
  const template = state.template;
  const photos = state.capturedPhotos;

  const slotW = 480;
  const slotH = Math.round(slotW / layout.ratio);
  const pad = 24, gap = 16, footer = 56;

  let cols = 1, rows = layout.count;
  if (layout.arrangement === "grid2x2") { cols = 2; rows = 2; }
  if (layout.arrangement === "grid2x3") { cols = 2; rows = 3; }

  const stripW = pad * 2 + slotW * cols + gap * (cols - 1);
  const stripH = pad * 2 + slotH * rows + gap * (rows - 1) + footer;

  const canvas = el("resultCanvas");
  canvas.width = stripW;
  canvas.height = stripH;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = template.frameColor;
  ctx.fillRect(0, 0, stripW, stripH);
  ctx.strokeStyle = template.borderColor;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, stripW - 6, stripH - 6);

  photos.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (slotW + gap);
    const y = pad + row * (slotH + gap);
    ctx.drawImage(img, x, y, slotW, slotH);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.strokeRect(x, y, slotW, slotH);
  });

  ctx.fillStyle = template.textColor;
  ctx.font = "600 20px Inter, sans-serif";
  ctx.fillText("XII-5 · MAXIMA", pad, stripH - 22);

  const stickerImgs = await Promise.all(template.stickers.map((s) => loadStickerImage(s.src)));
  let failedCount = 0;
  template.stickers.forEach((s, i) => {
    const img = stickerImgs[i];
    if (!img) {
      failedCount++;
      console.warn(`Stiker gagal dimuat: ${s.src} (cek apakah file/folder sudah ada di repo)`);
      return;
    }
    const size = (s.sizePct / 100) * stripW;
    const x = (s.xPct / 100) * stripW;
    const y = (s.yPct / 100) * stripH;
    ctx.drawImage(img, x, y, size, size);
  });

  if (failedCount > 0) {
    ctx.fillStyle = "rgba(200,50,50,0.85)";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText(`${failedCount} stiker gagal dimuat — cek console (F12)`, pad, 18);
  }
}

el("downloadBtn").addEventListener("click", () => {
  const canvas = el("resultCanvas");
  const link = document.createElement("a");
  link.download = "photobooth-xii5-maxima.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

el("ulangBtn").addEventListener("click", () => {
  showScreen("screenPrep");
});

/* ============================================================
   INIT
   ============================================================ */
updateLayoutLabel();
updateFilterLabel();
updateThemeLabels();
startCamera();
