"""
Konversi gambar (JPG, PNG, HEIC, dll) ke format WebP + kompresi otomatis,
tanpa membuat gambar pecah/burik.

Cara pakai:
    python convert_to_webp.py <folder_input> [--max-width 1000] [--quality 85]

Contoh:
    python convert_to_webp.py public/images/anggota --max-width 800 --quality 85
    python convert_to_webp.py public/images/momen --max-width 1200 --quality 82

Hasil konversi disimpan di folder yang sama dengan nama file sama,
ekstensi diganti jadi .webp. File asli TIDAK dihapus (aman untuk dicoba dulu).

Instalasi library yang dibutuhkan (sekali saja):
    pip install Pillow --break-system-packages
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Library Pillow belum terinstall. Jalankan dulu:")
    print("    pip install Pillow --break-system-packages")
    sys.exit(1)

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".heic", ".heif"}


def convert_image(input_path: Path, max_width: int, quality: int) -> Path:
    """Konversi satu file gambar ke WebP, resize jika lebih lebar dari max_width."""
    with Image.open(input_path) as img:
        # Konversi mode warna supaya kompatibel (misal PNG dengan transparansi / CMYK)
        if img.mode in ("RGBA", "LA"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # Resize hanya jika gambar lebih lebar dari batas maksimal (tidak upscale)
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.LANCZOS)

        output_path = input_path.with_suffix(".webp")
        img.save(output_path, "WEBP", quality=quality, method=6)
        return output_path


def main():
    parser = argparse.ArgumentParser(description="Konversi gambar ke WebP + kompresi.")
    parser.add_argument("folder", type=str, help="Folder berisi gambar yang mau dikonversi")
    parser.add_argument("--max-width", type=int, default=1000,
                         help="Lebar maksimal gambar hasil konversi (default: 1000px)")
    parser.add_argument("--quality", type=int, default=85,
                         help="Kualitas WebP 1-100 (default: 85, aman tanpa terlihat pecah)")
    args = parser.parse_args()

    folder = Path(args.folder)
    if not folder.is_dir():
        print(f"Folder tidak ditemukan: {folder}")
        sys.exit(1)

    image_files = [
        p for p in folder.rglob("*")
        if p.suffix.lower() in VALID_EXTENSIONS
    ]

    if not image_files:
        print("Tidak ada gambar yang cocok ditemukan di folder ini.")
        return

    print(f"Menemukan {len(image_files)} gambar. Memulai konversi...\n")

    total_before = 0
    total_after = 0

    for path in image_files:
        size_before = path.stat().st_size
        try:
            output_path = convert_image(path, args.max_width, args.quality)
            size_after = output_path.stat().st_size
            total_before += size_before
            total_after += size_after
            print(f"OK  {path.name} -> {output_path.name} "
                  f"({size_before/1024:.0f}KB -> {size_after/1024:.0f}KB)")
        except Exception as e:
            print(f"GAGAL {path.name}: {e}")

    if total_before > 0:
        saved_percent = (1 - total_after / total_before) * 100
        print(f"\nSelesai. Total ukuran berkurang sekitar {saved_percent:.0f}%.")
        print("File asli tidak dihapus — cek dulu hasil .webp, baru hapus manual jika sudah yakin.")


if __name__ == "__main__":
    main()
