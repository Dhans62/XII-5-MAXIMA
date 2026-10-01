/**
 * sticker-placement.js
 * Menghitung posisi stiker untuk layout apa pun.
 *
 * Posisi di themes.js (xPct, yPct, sizePct) dibuat pada layout ACUAN "strip4"
 * (lewat editor.html). Persen terhadap strip tidak bisa dipakai apa adanya di layout
 * lain: strip grid lebih lebar (1024 vs 528 px) dan tingginya beda jauh, padahal foto
 * selalu 480 px. Akibatnya stiker membesar dan bergeser dari tempat yang ditata.
 *
 * Aturan di sini:
 *  - Ukuran stiker tetap dalam piksel acuan (sizePct x lebar strip4), jadi proporsinya
 *    terhadap foto sama di semua layout.
 *  - Horizontal: menempel ke sisi (kiri/kanan) yang paling dekat, jaraknya dijaga.
 *  - Vertikal: stiker di area atas/bawah menempel ke tepi atas/bawah; yang di tengah
 *    mengikuti proporsi tinggi strip.
 *  - Di layout acuan (strip4) hasilnya identik dengan perhitungan lama.
 */

// Ukuran strip4: lebar = 24*2 + 480; tinggi = 24*2 + 360*4 + 16*3 + 56.
// Ubah angka ini kalau pad/gap/footer/ratio di main.js atau layouts.js berubah.
export const REF_W = 528;
export const REF_H = 1592;

const EDGE_ZONE = 0.25; // pusat stiker di 25% teratas / terbawah dianggap menempel tepi

export function placeSticker(s, stripW, stripH) {
  const size = (s.sizePct / 100) * REF_W;
  const x0 = (s.xPct / 100) * REF_W;
  const y0 = (s.yPct / 100) * REF_H;

  const cx = (x0 + size / 2) / REF_W;
  const x = cx < 0.5 ? x0 : stripW - size - (REF_W - x0 - size);

  const cy = (y0 + size / 2) / REF_H;
  let y;
  if (cy < EDGE_ZONE) y = y0;
  else if (cy > 1 - EDGE_ZONE) y = stripH - size - (REF_H - y0 - size);
  else y = cy * stripH - size / 2;

  return { x, y, size };
}
