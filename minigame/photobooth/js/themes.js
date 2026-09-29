/**
 * themes.js
 * Struktur: kategori -> daftar template.
 * Posisi stiker (xPct, yPct, sizePct) dalam persen terhadap lebar/tinggi STRIP akhir,
 * bukan terhadap satu foto. Nilai boleh negatif atau >100 supaya stiker sengaja
 * "nyembul" keluar tepi strip (efek lebih hidup).
 */

export const THEMES = {
  lucu: {
    label: "Lucu",
    templates: [
      {
        id: "kapibara-teman",
        label: "Kapibara & Teman",
        frameColor: "#FFEBF0",
        borderColor: "#F5A0BE",
        textColor: "#78465A",
        stickers: [
          { src: "assets/stickers/lucu/cute-01.webp", xPct: 74, yPct: -4, sizePct: 26 },
          { src: "assets/stickers/lucu/cute-02.webp", xPct: -6, yPct: 21, sizePct: 17 },
          { src: "assets/stickers/lucu/cute-03.webp", xPct: 84, yPct: 46, sizePct: 15 },
          { src: "assets/stickers/lucu/cute-04.webp", xPct: -7, yPct: 71, sizePct: 19 },
        ],
      },
      {
        id: "V2",
        label: "V2",
        frameColor: "#FFEBF0",
        borderColor: "#F5A0BE",
        stickers: [
          { src: "assets/stickers/lucu/cute-01.webp", xPct: 85, yPct: 0, sizePct: 12 },
          { src: "assets/stickers/lucu/cute-15.webp", xPct: 3, yPct: 22, sizePct: 15 },
          { src: "assets/stickers/lucu/cute-07.webp", xPct: 85, yPct: 46, sizePct: 15 },
          { src: "assets/stickers/lucu/cute-04.webp", xPct: 0, yPct: 69, sizePct: 19 },
          { src: "assets/stickers/lucu/cute-30.webp", xPct: 61, yPct: 92, sizePct: 15 },
        ],
      },
      {
        id: "",
        label: "",
        frameColor: "#FFEBF0",
        borderColor: "#F5A0BE",
        stickers: [
          { src: "assets/stickers/lucu2/cute-03.webp", xPct: 82, yPct: 17, sizePct: 24 },
          { src: "assets/stickers/lucu2/cute-10.webp", xPct: 0, yPct: 27, sizePct: 16 },
          { src: "assets/stickers/lucu2/cute-09.webp", xPct: 84, yPct: 46, sizePct: 18 },
          { src: "assets/stickers/lucu2/cute-25.webp", xPct: 1, yPct: 91, sizePct: 19 },
          { src: "assets/stickers/lucu2/cute-01.webp", xPct: 25, yPct: 69, sizePct: 12 },
          { src: "assets/stickers/lucu2/cute-11.webp", xPct: 79, yPct: 95, sizePct: 15 },
        ],
      },
      {
        id: "",
        label: "",
        frameColor: "#FFEBF0",
        borderColor: "#F5A0BE",
        stickers: [
          { src: "assets/stickers/lucu2/cute-05.webp", xPct: 82, yPct: 17, sizePct: 24 },
          { src: "assets/stickers/lucu2/cute-16.webp", xPct: -5, yPct: 33, sizePct: 16 },
          { src: "assets/stickers/lucu2/cute-22.webp", xPct: 84, yPct: 46, sizePct: 18 },
          { src: "assets/stickers/lucu2/cute-20.webp", xPct: 1, yPct: 91, sizePct: 19 },
          { src: "assets/stickers/lucu2/cute-04.webp", xPct: 25, yPct: 69, sizePct: 12 },
          { src: "assets/stickers/lucu2/cute-11.webp", xPct: 79, yPct: 95, sizePct: 15 },
        ],
      },
      {
        id: "",
        label: "",
        frameColor: "#FFEBF0",
        borderColor: "#F5A0BE",
        stickers: [
          { src: "assets/stickers/lucu2/cute-05.webp", xPct: 82, yPct: 17, sizePct: 24 },
          { src: "assets/stickers/lucu2/cute-30.webp", xPct: -5, yPct: 33, sizePct: 16 },
          { src: "assets/stickers/lucu2/cute-28.webp", xPct: 84, yPct: 46, sizePct: 18 },
          { src: "assets/stickers/lucu2/cute-02.webp", xPct: 1, yPct: 91, sizePct: 19 },
          { src: "assets/stickers/lucu2/cute-19.webp", xPct: 25, yPct: 69, sizePct: 12 },
          { src: "assets/stickers/lucu2/cute-13.webp", xPct: 79, yPct: 95, sizePct: 15 },
        ],
      },
      {
        id: "",
        label: "",
        frameColor: "#FFEBF0",
        borderColor: "#F5A0BE",
        stickers: [
          { src: "assets/stickers/lucu2/cute-21.webp", xPct: 74, yPct: 17, sizePct: 24 },
          { src: "assets/stickers/lucu2/cute-23.webp", xPct: -4, yPct: 43, sizePct: 16 },
          { src: "assets/stickers/lucu2/cute-11.webp", xPct: 93, yPct: 58, sizePct: 18 },
          { src: "assets/stickers/lucu2/cute-02.webp", xPct: 1, yPct: 91, sizePct: 19 },
          { src: "assets/stickers/lucu2/cute-28.webp", xPct: 25, yPct: 70, sizePct: 9 },
          { src: "assets/stickers/lucu2/cute-09.webp", xPct: 79, yPct: 95, sizePct: 15 },
        ],
      },
      {
        id: "",
        label: "",
        frameColor: "#FFEBF0",
        borderColor: "#F5A0BE",
        stickers: [
          { src: "assets/stickers/lucu2/cute-27.webp", xPct: -4, yPct: -1, sizePct: 24 },
          { src: "assets/stickers/lucu2/cute-06.webp", xPct: 11, yPct: 44, sizePct: 16 },
          { src: "assets/stickers/lucu2/cute-26.webp", xPct: 91, yPct: 25, sizePct: 18 },
          { src: "assets/stickers/lucu2/cute-02.webp", xPct: 1, yPct: 91, sizePct: 19 },
          { src: "assets/stickers/lucu2/cute-27.webp", xPct: 77, yPct: 70, sizePct: 9 },
          { src: "assets/stickers/lucu2/cute-26.webp", xPct: 79, yPct: 95, sizePct: 15 },
        ],
      },
    ],
  },
  keren: {
    label: "Keren",
    templates: [
      {
        id: "monokrom",
        label: "Monokrom",
        frameColor: "#1F1F24",
        borderColor: "#B8945A",
        textColor: "#F2ECDD",
        stickers: [],
      },
    ],
  },
  estetik: {
    label: "Estetik",
    templates: [
      {
        id: "sage",
        label: "Sage",
        frameColor: "#EDEFE6",
        borderColor: "#8CA88A",
        textColor: "#3F4A3D",
        stickers: [],
      },
    ],
  },
};

export function getTemplate(categoryId, templateId) {
  const category = THEMES[categoryId];
  if (!category) return null;
  return category.templates.find((t) => t.id === templateId) || category.templates[0];
}

export function getFirstTemplate(categoryId) {
  return THEMES[categoryId]?.templates[0] || null;
}
