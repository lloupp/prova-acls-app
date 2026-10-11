#!/usr/bin/env python3
"""Otimiza as imagens de ECG do PDF para uso no app (tablet).

Converte para WebP com largura máx 1200px, qualidade 75%.
Origem: imagens-ecg/   Destino: www/imagens-ecg/
"""
import sys
from pathlib import Path
from PIL import Image

SRC = Path("imagens-ecg")
DST = Path("www/imagens-ecg")
MAX_WIDTH = 1200
WEBP_QUALITY = 75

def main():
    DST.mkdir(parents=True, exist_ok=True)
    pngs = sorted(SRC.glob("*.png"))
    if not pngs:
        print("Nenhuma imagem encontrada em", SRC)
        return 1
    total_in = total_out = 0
    for src in pngs:
        img = Image.open(src)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        if img.width > MAX_WIDTH:
            h = round(img.height * MAX_WIDTH / img.width)
            img = img.resize((MAX_WIDTH, h), Image.LANCZOS)
        dst_name = src.stem + ".webp"
        dst = DST / dst_name
        img.save(dst, "WEBP", quality=WEBP_QUALITY, method=6)
        si, so = src.stat().st_size, dst.stat().st_size
        total_in += si
        total_out += so
        print(f"  {src.name}: {si/1e6:.1f}MB -> {so/1e6:.2f}MB  ({img.width}x{img.height}) WebP q{WEBP_QUALITY}")
    print(f"Total: {total_in/1e6:.1f}MB -> {total_out/1e6:.1f}MB "
          f"({100*total_out/total_in:.0f}% do original) | {len(pngs)} imagens")
    return 0

if __name__ == "__main__":
    sys.exit(main())
