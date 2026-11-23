"use client";

import { useState } from "react";

import { ProductImage } from "@/components/product-image";

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div
        className="aspect-square w-full rounded-card border border-line bg-blush/50"
        role="img"
        aria-label={`Ảnh sản phẩm ${name} (đang cập nhật)`}
      />
    );
  }

  const current = images[active] ?? images[0];
  if (!current) return null;

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-card border border-line bg-white">
        <ProductImage
          path={current}
          alt={`Ảnh sản phẩm ${name} ${active + 1}`}
          priority
          className="h-full w-full object-cover"
        />
      </div>

      {images.length > 1 ? (
        <div
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Chọn ảnh sản phẩm"
        >
          {images.map((img, index) => (
            <button
              key={img}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Xem ảnh ${index + 1}`}
              aria-pressed={index === active}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-control border transition-colors ${
                index === active ? "border-rose-deep" : "border-line hover:border-rose-soft"
              }`}
            >
              <ProductImage
                path={img}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
