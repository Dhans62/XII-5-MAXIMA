/**
 * main.js
 * Render seluruh konten dinamis (struktur kelas, anggota, momen)
 * dan menangani interaksi (landing transition, modal biodata).
 */

document.addEventListener("DOMContentLoaded", async () => {
  const { anggota, strukturKelas, momen } = await loadAllData();

  renderStrukturKelas(strukturKelas);
  renderAnggota(anggota);
  renderMomen(momen);
  setupLandingTransition();
  setupModal(anggota);

  AOS.init({ duration: 700, once: true, offset: 60 });
});

/* ============================================================
   LANDING TRANSITION
   ============================================================ */
function setupLandingTransition() {
  const landing = document.getElementById("landing");
  const mainContent = document.getElementById("main-content");
  const enterBtn = document.getElementById("enterSite");

  enterBtn.addEventListener("click", () => {
    landing.classList.add("is-leaving");
    setTimeout(() => {
      landing.remove();
      mainContent.hidden = false;
      mainContent.classList.add("is-visible");
      document.body.style.overflow = "auto";
      AOS.refreshHard();
    }, 650);
  });

  // Landing menutupi scroll sampai user klik masuk
  document.body.style.overflow = "hidden";
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

    people.forEach((person) => {
      row.appendChild(buildStrukturCard(person, level));
    });

    container.appendChild(row);
  });
}

function buildStrukturCard(person, level) {
  const card = document.createElement("div");
  card.className = `struktur-card struktur-card--level-${level}`;
  card.innerHTML = `
    <img class="struktur-card__photo" src="public/images/${person.foto}" alt="${person.nama || person.jabatan}">
    <p class="struktur-card__nama">${person.nama || "-"}</p>
    <p class="struktur-card__jabatan">${person.jabatan}</p>
  `;
  return card;
}

/* ============================================================
   ANGGOTA KELAS
   ============================================================ */
function renderAnggota(data) {
  const container = document.getElementById("anggotaGrid");

  data
    .sort((a, b) => a.no_absen - b.no_absen)
    .forEach((person) => {
      const card = document.createElement("div");
      card.className = "anggota-card";
      card.dataset.absen = person.no_absen;
      card.innerHTML = `
        <div style="position:relative;">
          <img class="anggota-card__photo" src="public/images/${person.foto}" alt="${person.nama_lengkap || "Anggota kelas"}">
          <span class="anggota-card__absen">${person.no_absen}</span>
        </div>
        <p class="anggota-card__nama">${person.nama_lengkap || "-"}</p>
      `;
      container.appendChild(card);
    });
}

/* ============================================================
   MODAL BIODATA
   ============================================================ */
function setupModal(anggotaData) {
  const modal = document.getElementById("anggotaModal");
  const modalCard = modal.querySelector(".modal__card");
  const grid = document.getElementById("anggotaGrid");

  grid.addEventListener("click", (e) => {
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

    // Tentukan posisi foto/biodata berdasar letak kartu di layar (khusus desktop)
    const cardRect = card.getBoundingClientRect();
    const isRightSide = cardRect.left + cardRect.width / 2 > window.innerWidth / 2;
    modalCard.classList.toggle("modal--reverse", isRightSide);

    modal.hidden = false;
    document.body.style.overflow = "hidden";
  });

  modal.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", () => {
      modal.hidden = true;
      document.body.style.overflow = "auto";
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) {
      modal.hidden = true;
      document.body.style.overflow = "auto";
    }
  });
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
        ${photos.map((src) => `<img src="public/images/${src}" alt="Momen ${formatMomenTitle(key)}" loading="lazy">`).join("")}
      </div>
    `;
    container.appendChild(group);
  });
}

function formatMomenTitle(key) {
  // "semester-1-kelas-11" -> "Semester 1 · Kelas 11"
  const parts = key.split("-");
  const semIndex = parts.indexOf("semester");
  const kelasIndex = parts.indexOf("kelas");

  if (semIndex === -1 || kelasIndex === -1) return key;

  const semNum = parts[semIndex + 1];
  const kelasNum = parts[kelasIndex + 1];
  return `Semester ${semNum} · Kelas ${kelasNum}`;
}
