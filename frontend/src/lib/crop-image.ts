import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không tải được ảnh."));
    image.src = src;
  });
}

/**
 * Render the selected crop area to a square JPEG. The admin cropper uses a 1:1
 * aspect, so the result is always square.
 */
export async function cropToSquareJpeg(
  imageSrc: string,
  crop: Area,
  size = 1000,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas không khả dụng.");

  // White background for transparent PNGs.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    size,
    size,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Không tạo được ảnh."));
      },
      "image/jpeg",
      0.9,
    );
  });
}
