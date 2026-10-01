# XII-5 MAXIMA

Website album kenangan untuk kelas XII-5 (MAXIMA), SMAN 1 Prambon, tahun ajaran 2026/2027.
Dibuat tanpa framework dan tanpa proses build: HTML, CSS, dan JavaScript murni, dengan
seluruh konten dikendalikan lewat berkas JSON.

**Demo:** https://dhans62.github.io/XII-5-MAXIMA/

## Gambaran

Situs ini menampilkan foto bersama, struktur kelas, profil 34 anggota, dan kumpulan momen
per semester. Tampilannya mengikuti metafora album foto fisik: kertas krem, cetakan
berselotip, dan bingkai putih. Prioritas utama adalah tampilan di ponsel, dengan komposisi
terpisah untuk desktop.

## Fitur

- **Halaman pembuka dengan transisi bersama.** Foto di halaman pembuka berpindah menjadi
  bingkai di halaman utama menggunakan View Transitions API. Browser yang belum mendukung,
  atau pengguna dengan preferensi *reduced motion*, mendapat transisi pudar biasa.
- **Struktur kelas berjenjang** dengan susunan yang tetap seimbang di semua lebar layar.
- **Carousel anggota** berbasis transisi pudar, dengan auto-play yang berhenti saat disentuh,
  serta modal detail yang menyesuaikan sisi foto dengan posisi kartu.
- **Galeri momen** per semester dengan tata letak masonry untuk foto potret dan lanskap,
  ditambah lightbox yang mendukung geser (swipe), navigasi keyboard, dan penghitung foto.
- **Video momen opsional.** Bingkai video hanya muncul jika `data/video.json` terisi dan
  berkas videonya ada; jika tidak, bagian ini tidak ditampilkan sama sekali.
- **Foto pengganti otomatis.** Foto orang yang gagal dimuat diganti siluet netral.
- **Mini Game** (halaman terpisah): Photobooth berbasis kamera dan efek visual live dengan
  deteksi pose tangan (MediaPipe) yang berjalan sepenuhnya di sisi klien.

## Teknologi dan teknik

| Area | Pendekatan |
| --- | --- |
| Stack | HTML5, CSS3 (custom properties, grid, flex), JavaScript ES modern; tanpa framework |
| Konten | Berkas JSON di `data/`, dimuat lewat `fetch`, tanpa backend |
| Animasi | `IntersectionObserver` untuk scroll-reveal, View Transitions API, CSS transition |
| Deteksi pose | MediaPipe, dijalankan di browser |
| Aset | Skrip Python (Pillow) untuk konversi ke WebP dan pembuatan indeks konten |
| Hosting | GitHub Pages |

Beberapa keputusan teknis yang didokumentasikan di `PROJECT-NOTES.md`:

- Lebar kolom grid dikunci dengan `minmax(0, 1fr)` agar foto tetap sama besar walaupun
  ada nama yang panjang.
- Ukuran asli tiap foto momen ditulis ke `momen.json` supaya tata letak tidak melompat
  saat foto dimuat secara lazy.
- Aturan `[hidden]` dipasangkan dengan setiap kelas yang mengatur `display`.
- Invalidasi cache dilakukan lewat parameter versi pada `css` dan `js`.

## Struktur proyek

```
XII-5-MAXIMA/
├── index.html
├── css/style.css
├── js/
│   ├── main.js
│   └── data-loader.js
├── data/
│   ├── anggota.json
│   ├── struktur-kelas.json
│   ├── momen.json 
│   └── video.json
├── public/
│   ├── images/
│   └── video/
├── scripts/
│   ├── convert_to_webp.py
│   ├── generate_momen_json.py
│   └── generate_stickers_manifest.py
└── minigame/
    ├── photobooth/
    └── blur-trend/
```

## Menjalankan secara lokal

Situs ini statis, tetapi `fetch` untuk berkas JSON memerlukan server lokal (membuka
`index.html` langsung dari berkas tidak akan berfungsi).

```bash
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080`. Fitur kamera pada Mini Game hanya berjalan di
`localhost` atau lewat HTTPS.

## Mengelola konten

Seluruh teks dan foto diatur lewat berkas di `data/`, tanpa mengubah HTML.

1. Konversi foto ke WebP:
   ```bash
   pip install Pillow
   python scripts/convert_to_webp.py public/images/anggota --max-width 800 --quality 85
   ```
2. Isi `data/anggota.json` dan `data/struktur-kelas.json`. Tempat dan tanggal lahir
   bersifat opsional.
3. Setelah menambah atau menghapus foto momen, jalankan dari folder utama proyek:
   ```bash
   python scripts/generate_momen_json.py
   ```
4. Untuk video momen, kompres terlebih dahulu lalu isi `data/video.json`:
   ```bash
   ffmpeg -i input.mp4 -vf scale=-2:720 -c:v libx264 -crf 28 -preset slow \
     -c:a aac -b:a 96k -movflags +faststart momen.mp4
   ```
   ```json
   {
     "src": "public/video/momen.mp4",
     "poster": "public/video/poster.webp",
     "judul": "Perjalanan kita"
   }
   ```

## Desain

- **Warna:** krem `#F2ECDD`, krem tua `#E8DFC7`, emas `#B8945A`, biru `#7FA6C4` dan
  `#4A7391`, serta tinta `#2B2620`.
- **Tipografi:** Fraunces untuk judul, Inter untuk isi.
- **Ikon:** SVG garis tipis; tidak ada emoji.

## Kompatibilitas

Transisi halaman pembuka memakai View Transitions API sebagai peningkatan progresif;
tanpa API tersebut tampilan tetap berfungsi penuh dengan transisi pudar. Fitur kamera
pada Mini Game memerlukan izin kamera dari pengguna.

## Kredit

Aset stiker Photobooth dicatat di [`CREDITS.md`](CREDITS.md).

Dibuat oleh [Dhans62](https://github.com/Dhans62).
