#!/bin/sh
# Bulk-crop product photos to a uniform 1:1 square, strip metadata, export JPEG.
# Useful when the owner sends a ZIP of original photos. The admin UI also has a
# per-image square cropper for normal uploads.
#
# Usage: ./scripts/crop-product-images.sh <input-dir> [output-dir]
# Requires Docker (ImageMagick runs in a throwaway Debian container; it includes
# JPEG support, unlike Alpine's minimal package).
set -eu
cd "$(dirname "$0")/.."

SRC="${1:-}"
OUT="${2:-product-images-processed}"
if [ -z "$SRC" ] || [ ! -d "$SRC" ]; then
  echo "usage: $0 <input-dir> [output-dir]" >&2
  exit 1
fi
mkdir -p "$OUT"

SRC_ABS="$(cd "$SRC" && pwd -W 2>/dev/null || pwd)"
OUT_ABS="$(cd "$OUT" && pwd -W 2>/dev/null || pwd)"

echo "==> Cropping images from $SRC_ABS to $OUT_ABS (1:1, 1000x1000)"
docker run --rm -v "$SRC_ABS:/in:ro" -v "$OUT_ABS:/out" debian:bookworm-slim sh -c '
  apt-get update -qq >/dev/null 2>&1
  apt-get install -y -qq imagemagick >/dev/null 2>&1
  count=0
  for f in /in/*; do
    [ -f "$f" ] || continue
    case "$f" in
      *.jpg|*.jpeg|*.JPG|*.JPEG|*.png|*.PNG|*.webp|*.WEBP) ;;
      *) continue ;;
    esac
    base=$(basename "$f")
    name=${base%.*}
    convert "$f" -auto-orient -strip \
      -resize "1000x1000^" -gravity center -extent 1000x1000 \
      -quality 88 "/out/${name}.jpg"
    count=$((count+1))
  done
  echo "processed $count image(s)"
'
echo "==> Done. Processed files are in $OUT_ABS"
