"""
Auto-generate data/momen.json dari isi folder public/images/momen/.

Cara pakai (jalankan dari folder utama proyek):
    python scripts/generate_momen_json.py

Skrip ini scan semua subfolder di dalam public/images/momen/
(misal: semester-1-kelas-11, semester-2-kelas-11, dst) dan menulis ulang
data/momen.json berisi daftar semua file .webp beserta LEBAR dan TINGGI
aslinya. Ukuran dipakai website supaya layout tidak melompat saat foto
dimuat, baik foto portrait maupun landscape.

Nama file BEBAS. Tinggal taruh foto (.webp) ke folder yang sesuai, lalu
jalankan skrip ini setiap kali ada foto ditambah/dihapus.

Perlu Pillow untuk membaca ukuran: pip install Pillow --break-system-packages
Kalau Pillow tidak ada, skrip tetap jalan tapi tanpa ukuran (website
otomatis memakai cara lama).
"""

import json
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    Image = None

MOMEN_FOLDER = Path("public/images/momen")
OUTPUT_JSON = Path("data/momen.json")


def read_size(path):
    """Kembalikan (lebar, tinggi) atau None kalau gagal dibaca."""
    if Image is None:
        return None
    try:
        with Image.open(path) as img:
            return img.size
    except Exception as err:
        print(f"  ! Gagal membaca ukuran {path.name}: {err}")
        return None


def build_entry(subfolder, file):
    entry = {"src": f"momen/{subfolder.name}/{file.name}"}
    size = read_size(file)
    if size:
        entry["w"], entry["h"] = size
    return entry


def main():
    if not MOMEN_FOLDER.is_dir():
        print(f"Folder tidak ditemukan: {MOMEN_FOLDER}")
        return

    if Image is None:
        print("Peringatan: Pillow belum terpasang, ukuran foto tidak ditulis.\n")

    result = {}
    subfolders = sorted([f for f in MOMEN_FOLDER.iterdir() if f.is_dir()])

    if not subfolders:
        print("Tidak ada subfolder semester ditemukan di dalam momen/.")
        return

    for subfolder in subfolders:
        files = sorted(
            f for f in subfolder.iterdir() if f.suffix.lower() == ".webp"
        )
        result[subfolder.name] = [build_entry(subfolder, f) for f in files]
        print(f"{subfolder.name}: {len(files)} foto")

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"\nSelesai. {OUTPUT_JSON} berhasil dibuat/diperbarui.")


if __name__ == "__main__":
    main()
