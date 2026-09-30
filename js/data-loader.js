/**
 * data-loader.js
 * Bertugas mengambil semua file JSON di folder /data dan
 * mengembalikannya sebagai satu objek siap pakai.
 */

async function loadAllData() {
  const [anggota, strukturKelas, momen, video] = await Promise.all([
    fetch("data/anggota.json").then((res) => res.json()),
    fetch("data/struktur-kelas.json").then((res) => res.json()),
    fetch("data/momen.json").then((res) => res.json()).catch(() => ({})),
    fetch("data/video.json").then((res) => res.json()).catch(() => ({})),
  ]);

  return { anggota, strukturKelas, momen, video };
}
