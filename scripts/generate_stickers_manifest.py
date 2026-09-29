"""
Membuat manifest.json berisi daftar file stiker per folder,
dibaca oleh editor.html untuk galeri pemilihan stiker (klik, bukan ketik).

Cara pakai (dijalankan dari folder minigame/photobooth/):
    python ../../scripts/generate_stickers_manifest.py

Semua SUBFOLDER di dalam assets/stickers/ dibaca otomatis, nama bebas
(lucu, keren, estetik, lucu2, apapun). Tidak perlu daftar nama tetap.

Hasil ditulis ke:
    assets/stickers/manifest.json

PENTING: manifest.json ini snapshot, bukan baca folder langsung tiap saat.
Jalankan ulang skrip ini tiap kali menambah, menghapus, atau bikin folder
baru berisi stiker — kalau tidak, galeri di editor masih pakai daftar lama.
"""

import json
import sys
from pathlib import Path


def main():
    stickers_root = Path("assets/stickers")
    if not stickers_root.is_dir():
        print(f"Folder tidak ditemukan: {stickers_root}")
        print("Jalankan skrip ini dari dalam folder minigame/photobooth/")
        sys.exit(1)

    manifest = {}
    subfolders = sorted(f for f in stickers_root.iterdir() if f.is_dir())

    if not subfolders:
        print("Tidak ada subfolder di assets/stickers/. Buat folder dulu, mis. assets/stickers/lucu/")
        return

    for folder in subfolders:
        files = sorted(f.name for f in folder.glob("*.webp"))
        manifest[folder.name] = files
        print(f"{folder.name}: {len(files)} stiker")

    out_path = stickers_root / "manifest.json"
    out_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"\nTersimpan ke {out_path} ({len(manifest)} folder terdeteksi)")


if __name__ == "__main__":
    main()
