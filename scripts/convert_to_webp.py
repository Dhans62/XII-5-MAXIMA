"""
Konversi gambar ke WebP dengan dua mode.

MODE photo (default) - untuk foto anggota, momen, foto bersama:
    - Transparansi diratakan ke latar putih
    - Diperkecil jika lebih lebar dari --max-width
    - Nama file tidak diubah

MODE sticker - untuk stiker photobooth (latar polos, mis. hijau, dengan outline putih):
    - Transparansi DIPERTAHANKAN
    - Ruang kosong dipangkas, stiker dipasang di tengah kanvas persegi
    - Ukuran file dibatasi (--max-kb) dengan menurunkan kualitas bertahap
    - --remove-bg : hapus latar polos (juga bayangan dan goresan di luar outline putih)
    - --rename numbered --prefix cute : nama hasil cute-01.webp, cute-02.webp, dst.
        * Nomor STABIL: dicatat di _peta-nomor.json (di folder tujuan). Dijalankan ulang,
          file yang sudah punya nomor tidak berganti nomor, file baru mendapat nomor lanjutan.
        * File yang sudah dikonversi dilewati (pakai --force untuk memproses ulang).
    - --credits CREDITS.md : tambahkan baris per file baru (kolom catatan berisi nama file mentah)

Contoh alur stiker:
    python scripts/convert_to_webp.py mentah/stiker/cute/pilihan --mode sticker --remove-bg \\
        --rename numbered --prefix cute \\
        --out minigame/photobooth/assets/stickers/cute --credits CREDITS.md

File asli tidak pernah dihapus.

Instalasi (sekali saja):
    pip install Pillow --break-system-packages      (Linux/Mac)
    pkg install python-pillow                       (Termux, jika pip gagal)
Opsional untuk membaca foto HEIC dari iPhone:
    pip install pillow-heif --break-system-packages
"""

import argparse
import json
import re
import sys
from io import BytesIO
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageDraw, ImageFilter
except ImportError:
    print("Library Pillow belum terinstall. Jalankan dulu:")
    print("    pip install Pillow --break-system-packages")
    sys.exit(1)

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".heic", ".heif"}
SENTINEL = (1, 254, 3, 255)  # warna penanda internal untuk hapus latar
MAP_FILE = "_peta-nomor.json"


# ------------------------------------------------------------------
# Umum
# ------------------------------------------------------------------
def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "stiker"


def flatten_to_rgb(img: Image.Image) -> Image.Image:
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        img = img.convert("RGBA")
        background = Image.new("RGB", img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[-1])
        return background
    return img.convert("RGB")


# ------------------------------------------------------------------
# Mode photo
# ------------------------------------------------------------------
def convert_photo(src: Path, dst: Path, max_width: int, quality: int) -> None:
    with Image.open(src) as img:
        img = flatten_to_rgb(img)
        if img.width > max_width:
            new_height = int(img.height * max_width / img.width)
            img = img.resize((max_width, new_height), Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        img.save(dst, "WEBP", quality=quality, method=6)


# ------------------------------------------------------------------
# Mode sticker
# ------------------------------------------------------------------
def remove_flat_background(img: Image.Image, tolerance: int):
    """Hapus latar polos yang tersambung ke keempat sudut.
    tolerance = selisih warna total (R+G+B) yang masih dianggap latar.
    Rentang aman untuk latar hijau AI: sekitar 60-200. Terlalu kecil -> bercak tersisa,
    terlalu besar (>210) -> outline putih ikut terkikis.
    Mengembalikan (gambar RGBA, pesan_peringatan atau None)."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    colors = [rgba.getpixel(c) for c in corners]

    # Jika sudut sudah transparan, tidak perlu apa-apa
    if all(c[3] == 0 for c in colors):
        return rgba, None

    # Latar harus polos: keempat sudut harus mirip
    for ch in range(3):
        values = [c[ch] for c in colors]
        if max(values) - min(values) > tolerance:
            return rgba, "latar tidak polos (warna sudut berbeda), hapus latar secara manual"

    work = rgba.copy()
    for c in corners:
        ImageDraw.floodfill(work, c, SENTINEL, thresh=tolerance)

    r, g, b, _ = work.split()
    is_bg = ImageChops.multiply(
        ImageChops.multiply(
            r.point(lambda v: 255 if v == SENTINEL[0] else 0),
            g.point(lambda v: 255 if v == SENTINEL[1] else 0),
        ),
        b.point(lambda v: 255 if v == SENTINEL[2] else 0),
    )

    alpha = ImageChops.multiply(rgba.split()[3], ImageChops.invert(is_bg))
    # Kikis 1px tepi (buang sisa halo) lalu haluskan
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    rgba.putalpha(alpha)
    return rgba, None


def edge_white_ratio(rgba: Image.Image) -> float:
    """Seberapa besar bagian tepi stiker yang berwarna putih (outline die-cut).
    Rendah berarti outline terputus dan latar kemungkinan bocor ke dalam stiker."""
    alpha = rgba.split()[3]
    solid = alpha.point(lambda v: 255 if v > 128 else 0)
    ring = ImageChops.subtract(solid, solid.filter(ImageFilter.MinFilter(5)))
    ring_bytes = ring.tobytes()
    rgb_bytes = rgba.convert("RGB").tobytes()
    total = white = 0
    for i, flag in enumerate(ring_bytes):
        if flag:
            total += 1
            j = i * 3
            if min(rgb_bytes[j], rgb_bytes[j + 1], rgb_bytes[j + 2]) > 195:
                white += 1
    return white / total if total else 0.0


def fit_to_square(img: Image.Image, size: int, padding: float):
    """Pangkas ruang kosong, lalu pasang di tengah kanvas persegi transparan.
    Mengembalikan (gambar, faktor_skala)."""
    bbox = img.split()[3].getbbox()
    if bbox is None:
        raise ValueError("gambar sepenuhnya transparan")
    img = img.crop(bbox)

    inner = max(1, int(size * (1 - 2 * padding)))
    scale = min(inner / img.width, inner / img.height)
    new_w = max(1, round(img.width * scale))
    new_h = max(1, round(img.height * scale))
    img = img.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(img, ((size - new_w) // 2, (size - new_h) // 2), img)
    return canvas, scale


def encode_under_limit(img: Image.Image, max_kb: int, quality: int, min_quality: int = 40):
    """Simpan WebP; turunkan kualitas bertahap sampai ukuran di bawah batas."""
    q = quality
    while True:
        buf = BytesIO()
        img.save(buf, "WEBP", quality=q, method=6, alpha_quality=100)
        data = buf.getvalue()
        if len(data) <= max_kb * 1024 or q <= min_quality:
            return data, q
        q -= 5


def convert_sticker(src: Path, dst: Path, args):
    notes = []
    with Image.open(src) as img:
        img = img.convert("RGBA")
        if args.remove_bg:
            img, warning = remove_flat_background(img, args.bg_tolerance)
            if warning:
                notes.append(warning)
            else:
                ratio = edge_white_ratio(img)
                if ratio < 0.6:
                    notes.append(
                        f"tepi stiker hanya {ratio*100:.0f}% putih: outline mungkin terputus "
                        "dan latar bocor ke dalam, CEK hasilnya"
                    )
        square, scale = fit_to_square(img, args.size, args.padding)
        if scale > 1.5:
            notes.append(f"sumber kecil, diperbesar {scale:.1f}x (hasil bisa kurang tajam)")

    data, used_q = encode_under_limit(square, args.max_kb, args.quality)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(data)
    if len(data) > args.max_kb * 1024:
        notes.append(f"masih {len(data)/1024:.0f}KB (di atas batas {args.max_kb}KB), coba sumber lebih sederhana")
    return len(data), used_q, notes


# ------------------------------------------------------------------
# Peta nomor & kredit
# ------------------------------------------------------------------
def load_map(out_root: Path) -> dict:
    path = out_root / MAP_FILE
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {"next": 1, "map": {}}


def save_map(out_root: Path, data: dict) -> None:
    out_root.mkdir(parents=True, exist_ok=True)
    (out_root / MAP_FILE).write_text(
        json.dumps(data, indent=2, ensure_ascii=False, sort_keys=True), encoding="utf-8"
    )


def update_credits(credits_path: Path, entries):
    header = (
        "# Kredit Aset\n\n"
        "| File | Sumber / tool | Lisensi | Catatan |\n"
        "|---|---|---|---|\n"
    )
    existing = credits_path.read_text(encoding="utf-8") if credits_path.exists() else header
    rows = [f"| {name} |  |  | {note} |" for name, note in entries if f"| {name} |" not in existing]
    if rows:
        credits_path.write_text(existing.rstrip("\n") + "\n" + "\n".join(rows) + "\n", encoding="utf-8")
    return len(rows)


# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------
def main():
    p = argparse.ArgumentParser(description="Konversi gambar ke WebP (mode photo / sticker).")
    p.add_argument("folder", help="Folder berisi gambar sumber")
    p.add_argument("--mode", choices=["photo", "sticker"], default="photo")
    p.add_argument("--out", help="Folder tujuan (default: sama dengan folder sumber)")
    p.add_argument("--quality", type=int, default=85, help="Kualitas WebP 1-100 (default 85)")
    p.add_argument("--max-width", type=int, default=1000, help="[photo] lebar maksimal px")
    p.add_argument("--size", type=int, default=512, help="[sticker] sisi kanvas persegi px")
    p.add_argument("--max-kb", type=int, default=100, help="[sticker] batas ukuran file KB")
    p.add_argument("--padding", type=float, default=0.04, help="[sticker] margin kosong, pecahan 0-0.4")
    p.add_argument("--remove-bg", action="store_true", help="[sticker] hapus latar polos")
    p.add_argument("--bg-tolerance", type=int, default=120,
                   help="[sticker] toleransi warna latar (default 120, rentang aman 60-200)")
    p.add_argument("--rename", choices=["slug", "numbered"], default="slug",
                   help="[sticker] slug = nama kebab-case, numbered = prefix-01, prefix-02, ...")
    p.add_argument("--prefix", help="[sticker] awalan nama untuk --rename numbered, mis. cute")
    p.add_argument("--force", action="store_true", help="[sticker numbered] proses ulang file yang sudah dikonversi")
    p.add_argument("--credits", help="[sticker] path CREDITS.md yang diperbarui")
    args = p.parse_args()

    src_root = Path(args.folder)
    if not src_root.is_dir():
        print(f"Folder tidak ditemukan: {src_root}")
        sys.exit(1)
    out_root = Path(args.out) if args.out else src_root

    numbered = args.mode == "sticker" and args.rename == "numbered"
    if numbered and not args.prefix:
        print("Mode --rename numbered butuh --prefix (contoh: --prefix cute)")
        sys.exit(1)

    files = sorted(f for f in src_root.rglob("*") if f.suffix.lower() in VALID_EXTENSIONS)
    if not files:
        print("Tidak ada gambar yang cocok ditemukan di folder ini.")
        return

    print(f"Mode {args.mode}: {len(files)} gambar ditemukan.\n")

    peta = load_map(out_root) if numbered else None
    before_total = after_total = 0
    credit_entries = []
    used_names = set()
    done = skipped = failed = 0

    for src in files:
        rel = src.relative_to(src_root)
        key = rel.as_posix()

        # --- tentukan nama hasil ---
        is_new_number = False
        if numbered:
            if key in peta["map"]:
                dst = out_root / peta["map"][key]
                if dst.exists() and not args.force:
                    print(f"SKIP  {key} (sudah jadi {dst.name})")
                    skipped += 1
                    continue
            else:
                dst = out_root / f"{args.prefix}-{peta['next']:02d}.webp"
                is_new_number = True
        else:
            stem = slugify(src.stem) if args.mode == "sticker" else src.stem
            dst = out_root / rel.parent / f"{stem}.webp"
            base, n = dst, 2
            while dst in used_names:
                dst = base.with_name(f"{base.stem}-{n}.webp")
                n += 1
            used_names.add(dst)

        # --- konversi ---
        try:
            if args.mode == "photo":
                convert_photo(src, dst, args.max_width, args.quality)
                size_after = dst.stat().st_size
                notes = []
            else:
                size_after, _, notes = convert_sticker(src, dst, args)
        except Exception as e:
            print(f"GAGAL {key}: {e}")
            failed += 1
            continue

        if is_new_number:
            peta["map"][key] = dst.name
            peta["next"] += 1

        before_total += src.stat().st_size
        after_total += size_after
        done += 1
        rel_out = dst.relative_to(out_root).as_posix()
        credit_entries.append((rel_out, f"mentah: {src.name}"))
        print(f"OK    {key} -> {rel_out} ({src.stat().st_size/1024:.0f}KB -> {size_after/1024:.0f}KB)")
        for note in notes:
            print(f"      PERHATIAN: {note}")

    if numbered:
        save_map(out_root, peta)

    print(f"\nSelesai: {done} dikonversi, {skipped} dilewati, {failed} gagal.")
    if before_total:
        print(f"Total ukuran berkurang sekitar {(1 - after_total / before_total) * 100:.0f}%.")
    if args.mode == "sticker" and args.credits and credit_entries:
        added = update_credits(Path(args.credits), credit_entries)
        print(f"{args.credits}: {added} baris baru ditambahkan (isi kolom sumber dan lisensi).")
    print("File asli tidak dihapus.")


if __name__ == "__main__":
    main()
