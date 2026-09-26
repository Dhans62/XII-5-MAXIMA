"""
Auto-generate data/momen.json dari isi folder public/images/momen/.

Cara pakai:
    python generate_momen_json.py

Skrip ini akan scan semua subfolder di dalam public/images/momen/
(misal: semester-1-kelas-11, semester-2-kelas-11, dst) dan otomatis
menulis ulang data/momen.json berisi daftar semua file .webp yang ada
di masing-masing subfolder.

Nama file BEBAS, tidak perlu urut/rename manual. Tinggal taruh foto
ke folder yang sesuai (format .webp), lalu jalankan skrip ini setiap
kali ada foto baru ditambah/dihapus.
"""

import json
from pathlib import Path

MOMEN_FOLDER = Path("public/images/momen")
OUTPUT_JSON = Path("data/momen.json")


def main():
    if not MOMEN_FOLDER.is_dir():
        print(f"Folder tidak ditemukan: {MOMEN_FOLDER}")
        return

    result = {}

    # Ambil semua subfolder (misal: semester-1-kelas-11, dst), urut nama folder
    subfolders = sorted([f for f in MOMEN_FOLDER.iterdir() if f.is_dir()])

    if not subfolders:
        print("Tidak ada subfolder semester ditemukan di dalam momen/.")
        return

    for subfolder in subfolders:
        # Ambil semua file .webp di dalam subfolder ini, urut nama file
        photos = sorted([
            f"momen/{subfolder.name}/{f.name}"
            for f in subfolder.iterdir()
            if f.suffix.lower() == ".webp"
        ])
        result[subfolder.name] = photos
        print(f"{subfolder.name}: {len(photos)} foto")

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"\nSelesai. {OUTPUT_JSON} berhasil dibuat/diperbarui.")


if __name__ == "__main__":
    main()
