"use client";

import "react-easy-crop/react-easy-crop.css";

import Cropper, { type Area } from "react-easy-crop";
import { useEffect, useMemo, useRef, useState } from "react";

import { cropToSquareJpeg } from "@/lib/crop-image";

type Props = {
  file: File;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
};

/**
 * Modal crop editor opened when the admin adds a product photo. The crop area
 * is locked to 1:1 so every product image has the same square shape.
 */
export function ImageCropperModal({ file, onCancel, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onCancel]);

  async function onSave() {
    if (!area || busy) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await cropToSquareJpeg(url, area, 1000);
      const name = file.name.replace(/\.[^.]+$/, "") || "product";
      onConfirm(new File([blob], `${name}-square.jpg`, { type: "image/jpeg" }));
    } catch {
      setError("Không cắt được ảnh. Vui lòng thử ảnh khác.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Cắt ảnh sản phẩm"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-lg rounded-card border border-line bg-white p-4 shadow-soft outline-none sm:p-6"
      >
        <h2 className="font-display text-xl text-ink">Cắt ảnh vuông 1:1</h2>
        <p className="mt-1 text-sm text-muted">
          Kéo ảnh và thu phóng để chọn vùng hiển thị. Ảnh sản phẩm được lưu ở
          tỉ lệ vuông để giao diện luôn đều nhau.
        </p>

        <div className="relative mt-4 h-72 w-full overflow-hidden rounded-control bg-linen">
          <Cropper
            image={url}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, areaPixels) => setArea(areaPixels)}
            showGrid={false}
          />
        </div>

        <label className="mt-4 block text-sm text-muted">
          Thu phóng
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mt-1 w-full accent-rose-deep"
          />
        </label>

        {error ? (
          <p className="mt-2 text-sm text-rose-deep" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn btn-outline disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={busy || !area}
            className="btn btn-primary disabled:opacity-60"
          >
            {busy ? "Đang lưu…" : "Lưu ảnh vuông"}
          </button>
        </div>
      </div>
    </div>
  );
}
