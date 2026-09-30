/**
 * main.js
 * Render seluruh konten dinamis (struktur kelas, anggota, momen)
 * dan menangani interaksi (landing transition, carousel, modal biodata).
 */

const anggotaState = {
  data: [],
  currentSlide: 0,
  totalSlides: 0,
  autoplayTimer: null,
};

document.addEventListener("DOMContentLoaded", async () => {
  const { anggota, strukturKelas, momen, video } = await loadAllData();

  renderStrukturKelas(strukturKelas);
  renderAnggota(anggota);
  renderMomen(momen);
  renderVideoMomen(video);
  renderFotoBersamaStats(anggota);
  setupLandingTransition();
  setupModal(anggota);
  setupLightbox();
  setupCarouselControls();
  setupNavbarScrollState();
  setupScrollReveal();
  startAutoplay();
});

/* ============================================================
   LANDING TRANSITION
   ============================================================ */
function setupLandingTransition() {
  const landing = document.getElementById("landing");
  const mainContent = document.getElementById("main-content");
  const enterBtn = document.getElementById("enterSite");

  const reveal = () => {
    landing.remove();
    mainContent.hidden = false;
    document.body.style.overflow = "auto";
    window.scrollTo(0, 0);
  };

  enterBtn.addEventListener("click", () => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && !calm) {
      // foto landing "pindah" menjadi frame di section Foto Bersama
      document.startViewTransition(reveal);
    } else {
      landing.classList.add("is-leaving");
      setTimeout(() => {
        reveal();
        mainContent.classList.add("is-visible");
      }, 650);
    }
  });

  document.body.style.overflow = "hidden";
}

/* ============================================================
   NAVBAR — beri background solid setelah discroll dikit
   ============================================================ */
function setupNavbarScrollState() {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  window.addEventListener("scroll", () => {
    navbar.classList.toggle("is-scrolled", window.scrollY > 24);
  });
}

/* ============================================================
   FOTO BERSAMA — baris statistik kecil
   ============================================================ */
function renderFotoBersamaStats(anggota) {
  const el = document.getElementById("fotoBersamaStats");
  if (!el) return;
  el.textContent = `${anggota.length} Anggota · XII-5 · Tahun Ajaran 2026/2027`;
}

/* ============================================================
   SCROLL REVEAL — dua arah, pakai IntersectionObserver native
   ============================================================ */
function setupScrollReveal() {
  const items = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      });
    },
    { threshold: 0 }
  );
  items.forEach((item) => observer.observe(item));
}

/* ============================================================
   STRUKTUR KELAS
   ============================================================ */
function renderStrukturKelas(data) {
  const container = document.getElementById("strukturKelas");
  const levels = {
    1: data.filter((p) => p.level === 1),
    2: data.filter((p) => p.level === 2),
    3: data.filter((p) => p.level === 3),
  };

  Object.keys(levels).forEach((level) => {
    const people = levels[level];
    if (!people.length) return;

    const row = document.createElement("div");
    row.className = "struktur-row";

    people.forEach((person, i) => {
      row.appendChild(buildStrukturCard(person, level, i));
    });

    container.appendChild(row);
  });
}

function buildStrukturCard(person, level, indexInRow) {
  const card = document.createElement("div");
  card.className = `struktur-card struktur-card--level-${level} reveal`;
  card.style.transitionDelay = `${indexInRow * 100}ms`;
  card.innerHTML = `
    <img class="struktur-card__photo" src="public/images/${person.foto}" alt="${person.nama || person.jabatan}">
    <p class="struktur-card__nama">${person.nama || "-"}</p>
    <p class="struktur-card__jabatan">${person.jabatan}</p>
  `;
  return card;
}

/* ============================================================
   ANGGOTA KELAS — CAROUSEL + HOVER PREVIEW (desktop)
   ============================================================ */
function renderAnggota(data) {
  anggotaState.data = data.slice().sort((a, b) => a.no_absen - b.no_absen);
  buildSlides();
  window.addEventListener("resize", debounce(buildSlides, 300));
}

function getItemsPerSlide() {
  const w = window.innerWidth;
  if (w >= 1024) return 10; // 5 kolom x 2 baris
  if (w >= 600) return 6;   // 3 kolom x 2 baris
  return 4;                  // 2 kolom x 2 baris
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildSlides() {
  const track = document.getElementById("anggotaTrack");
  const itemsPerSlide = getItemsPerSlide();
  const slides = chunkArray(anggotaState.data, itemsPerSlide);

  track.innerHTML = "";
  slides.forEach((slideItems) => {
    const slideEl = document.createElement("div");
    slideEl.className = "carousel__slide";
    slideItems.forEach((person) => slideEl.appendChild(buildAnggotaCard(person)));
    track.appendChild(slideEl);
  });

  anggotaState.totalSlides = slides.length;
  anggotaState.currentSlide = Math.min(anggotaState.currentSlide, Math.max(slides.length - 1, 0));
  updateTrackPosition(false);
}

function buildAnggotaCard(person) {
  const card = document.createElement("div");
  card.className = "anggota-card";
  card.dataset.absen = person.no_absen;

  const harapanSingkat = person.harapan
    ? (person.harapan.length > 60 ? person.harapan.slice(0, 60) + "…" : person.harapan)
    : "";

  card.innerHTML = `
    <div class="anggota-card__media">
      <img class="anggota-card__photo" src="public/images/${person.foto}" alt="${person.nama_lengkap || "Anggota kelas"}">
      <span class="anggota-card__absen">${person.no_absen}</span>
      <div class="anggota-card__hover-info">
        <p class="anggota-card__hover-nama">${person.nama_lengkap || "-"}</p>
        ${harapanSingkat ? `<p class="anggota-card__hover-harapan">"${harapanSingkat}"</p>` : ""}
        <span class="anggota-card__hover-hint">Klik untuk detail lengkap</span>
      </div>
    </div>
    <p class="anggota-card__nama">${person.nama_lengkap || "-"}</p>
  `;
  return card;
}

function updateTrackPosition() {
  const track = document.getElementById("anggotaTrack");
  const slides = track.querySelectorAll(".carousel__slide");
  slides.forEach((slide, i) => {
    slide.classList.toggle("is-active", i === anggotaState.currentSlide);
  });
}

function goToSlide(index) {
  const total = anggotaState.totalSlides;
  if (total === 0) return;
  anggotaState.currentSlide = (index + total) % total;
  updateTrackPosition();
}

function nextSlide() {
  goToSlide(anggotaState.currentSlide + 1);
}

function prevSlide() {
  goToSlide(anggotaState.currentSlide - 1);
}

function startAutoplay() {
  stopAutoplay();
  anggotaState.autoplayTimer = setInterval(nextSlide, 4000);
}

function stopAutoplay() {
  if (anggotaState.autoplayTimer) {
    clearInterval(anggotaState.autoplayTimer);
    anggotaState.autoplayTimer = null;
  }
}

function setupCarouselControls() {
  const carousel = document.getElementById("anggotaCarousel");
  const nextBtn = document.getElementById("anggotaNext");
  const prevBtn = document.getElementById("anggotaPrev");
  const viewport = carousel.querySelector(".carousel__viewport");

  nextBtn.addEventListener("click", () => {
    nextSlide();
    startAutoplay();
  });

  prevBtn.addEventListener("click", () => {
    prevSlide();
    startAutoplay();
  });

  carousel.addEventListener("mouseenter", stopAutoplay);
  carousel.addEventListener("mouseleave", startAutoplay);

  let touchStartX = 0;
  viewport.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
      stopAutoplay();
    },
    { passive: true }
  );

  viewport.addEventListener(
    "touchend",
    (e) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(deltaX) > 40) {
        deltaX < 0 ? nextSlide() : prevSlide();
      }
      startAutoplay();
    },
    { passive: true }
  );
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ============================================================
   MODAL BIODATA (fade + scale, tanpa patah)
   ============================================================ */
function setupModal(anggotaData) {
  const modal = document.getElementById("anggotaModal");
  const modalCard = modal.querySelector(".modal__card");
  const carousel = document.getElementById("anggotaCarousel");

  carousel.addEventListener("click", (e) => {
    const card = e.target.closest(".anggota-card");
    if (!card) return;

    const absen = parseInt(card.dataset.absen, 10);
    const person = anggotaData.find((p) => p.no_absen === absen);
    if (!person) return;

    document.getElementById("modalPhoto").src = `public/images/${person.foto}`;
    document.getElementById("modalPhoto").alt = person.nama_lengkap || "";
    document.getElementById("modalAbsen").textContent = `No. Absen ${person.no_absen}`;
    document.getElementById("modalNama").textContent = person.nama_lengkap || "-";

    const ttl = [person.tempat_lahir, person.tanggal_lahir].filter(Boolean).join(", ");
    document.getElementById("modalTTL").textContent = ttl || "-";
    document.getElementById("modalHarapan").textContent = person.harapan
      ? `"${person.harapan}"`
      : "-";

    const cardRect = card.getBoundingClientRect();
    const isRightSide = cardRect.left + cardRect.width / 2 > window.innerWidth / 2;
    modalCard.classList.toggle("modal--reverse", isRightSide);

    openModal();
  });

  modal.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  function openModal() {
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    stopAutoplay();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "auto";
    startAutoplay();
  }
}

/* ============================================================
   MOMEN-MOMEN (per semester)
   ============================================================ */
function renderMomen(momenData) {
  const container = document.getElementById("momenContainer");

  Object.keys(momenData).forEach((key) => {
    const photos = momenData[key];
    if (!photos || !photos.length) return;

    const group = document.createElement("div");
    group.className = "momen-group";
    group.innerHTML = `
      <h3 class="momen-group__title">${formatMomenTitle(key)}</h3>
      <div class="momen-masonry">
        ${photos.map((p) => buildMomenImg(p, key)).join("")}
      </div>
    `;
    container.appendChild(group);
  });
}

function formatMomenTitle(key) {
  const parts = key.split("-");
  const semIndex = parts.indexOf("semester");
  const kelasIndex = parts.indexOf("kelas");

  if (semIndex === -1 || kelasIndex === -1) return key;

  const semNum = parts[semIndex + 1];
  const kelasNum = parts[kelasIndex + 1];
  return `Semester ${semNum} · Kelas ${kelasNum}`;
}

/* ============================================================
   LIGHTBOX MOMEN
   ============================================================ */
function setupLightbox() {
  const box = document.getElementById("lightbox");
  const img = document.getElementById("lightboxImg");
  const count = document.getElementById("lightboxCount");
  let list = [];
  let idx = 0;

  const show = (i) => {
    idx = (i + list.length) % list.length;
    img.src = list[idx].src;
    count.textContent = `${idx + 1} / ${list.length}`;
  };
  const close = () => {
    box.hidden = true;
    document.body.style.overflow = "auto";
  };

  document.getElementById("momenContainer").addEventListener("click", (e) => {
    const t = e.target.closest("img");
    if (!t) return;
    list = [...t.closest(".momen-masonry").querySelectorAll("img")];
    box.hidden = false;
    document.body.style.overflow = "hidden";
    show(list.indexOf(t));
  });

  box.querySelector(".lightbox__prev").addEventListener("click", () => show(idx - 1));
  box.querySelector(".lightbox__next").addEventListener("click", () => show(idx + 1));
  box.querySelector(".lightbox__close").addEventListener("click", close);
  box.addEventListener("click", (e) => { if (e.target === box) close(); });

  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(idx - 1);
    if (e.key === "ArrowRight") show(idx + 1);
  });

  let x0 = 0;
  box.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", (e) => {
    const d = e.changedTouches[0].clientX - x0;
    if (Math.abs(d) > 50) show(d < 0 ? idx + 1 : idx - 1);
  }, { passive: true });
}

/* ============================================================
   VIDEO MOMEN — hanya tampil jika video.json terisi DAN file ada
   ============================================================ */
async function renderVideoMomen(video) {
  const frame = document.getElementById("momenVideo");
  if (!frame || !video || !video.src) return;

  try {
    const res = await fetch(video.src, { method: "HEAD" });
    if (!res.ok) return;
  } catch {
    return;
  }

  const el = frame.querySelector("video");
  if (video.poster) {
    el.poster = video.poster;
    el.preload = "none";
    el.src = video.src;
  } else {
    el.preload = "metadata";
    el.src = `${video.src}#t=0.1`;
  }

  const cap = frame.querySelector(".video-frame__caption");
  cap.textContent = video.judul || "";
  cap.hidden = !video.judul;
  frame.hidden = false;
}

/* Mendukung dua format momen.json: string lama atau {src, w, h} dari skrip baru */
function buildMomenImg(item, key) {
  const src = typeof item === "string" ? item : item.src;
  const sized = typeof item === "object" && item.w && item.h;
  const dims = sized
    ? `width="${item.w}" height="${item.h}"`
    : `style="aspect-ratio:4/5" onload="this.style.aspectRatio='auto'"`;
  return `<img src="public/images/${src}" alt="Momen ${formatMomenTitle(key)}" loading="lazy" decoding="async" ${dims}>`;
}
