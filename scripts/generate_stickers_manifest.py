"""
Membuat manifest.json berisi daftar file stiker per kategori,
dibaca oleh editor.html untuk galeri pemilihan stiker (klik, bukan ketik).

Cara pakai (dijalankan dari folder minigame/photobooth/):
    python ~/XII-5-MAXIMA/scripts/generate_stickers_manifest.py

Struktur folder yang dipindai:
    assets/stickers/lucu/*.webp
    assets/stickers/keren/*.webp
    assets/stickers/estetik/*.webp

Hasil ditulis ke:
    assets/stickers/manifest.json

Jalankan ulang skrip ini tiap kali menambah/menghapus file stiker.
"""

import json
import sys
from pathlib import Path

CATEGORIES = ["lucu", "lucu2", "keren", "estetik"]


def main():
    stickers_root = Path("assets/stickers")
    if not stickers_root.is_dir():
        print(f"Folder tidak ditemukan: {stickers_root}")
        print("Jalankan skrip ini dari dalam folder minigame/photobooth/")
        sys.exit(1)

    manifest = {}
    for cat in CATEGORIES:
        folder = stickers_root / cat
        if not folder.is_dir():
            manifest[cat] = []
            continue
        files = sorted(f.name for f in folder.glob("*.webp"))
        manifest[cat] = files
        print(f"{cat}: {len(files)} stiker")

    out_path = stickers_root / "manifest.json"
    out_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"\nTersimpan ke {out_path}")


if __name__ == "__main__":
    main()
