/**
 * layouts.js
 * Definisi layout strip. "arrangement" menentukan cara slot disusun:
 *   - vertical  : ditumpuk 1 kolom (strip klasik)
 *   - grid2x2   : 2 kolom x 2 baris
 *   - grid2x3   : 2 kolom x 3 baris
 * ratio = lebar/tinggi tiap slot foto (dipakai untuk crop dari kamera).
 */

export const LAYOUTS = [
  { id: "single", label: "1 Foto", count: 1, ratio: 4 / 3, arrangement: "vertical" },
  { id: "strip2", label: "2 Foto", count: 2, ratio: 4 / 3, arrangement: "vertical" },
  { id: "strip3", label: "3 Foto", count: 3, ratio: 4 / 3, arrangement: "vertical" },
  { id: "strip4", label: "4 Foto Strip", count: 4, ratio: 4 / 3, arrangement: "vertical" },
  { id: "grid4", label: "4 Foto Grid", count: 4, ratio: 1, arrangement: "grid2x2" },
  { id: "grid6", label: "6 Foto Grid", count: 6, ratio: 4 / 3, arrangement: "grid2x3" },
];

export function getLayout(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}
