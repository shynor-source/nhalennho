"use client";

import { useEffect, useRef, useState } from "react";
import { Star, Trash2, Upload } from "lucide-react";

import { ImageCropperModal } from "@/components/admin/image-cropper-modal";
import {
  OptionEditor,
  optionsStateFromProduct,
  PACKAGING_DEFAULT_VALUES,
  type OptionsState,
} from "@/components/admin/option-editor";
import { adminApi, publicApi, uploadProductImage } from "@/lib/api-client";
import { ProductImage } from "@/components/product-image";
import type { Category, Product } from "@/lib/types";

const fieldClass =
  "h-11 w-full rounded-control border border-line bg-white px-3 text-sm text-ink focus-visible:border-rose-soft";

type Props = {
  initial?: Product;
  onSaved?: () => void;
};

export function ProductForm({ initial, onSaved }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [cropping, setCropping] = useState<File | null>(null);
  const pendingRef = useRef<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);
  const [optionState, setOptionState] = useState<OptionsState>(() =>
    optionsStateFromProduct(initial?.options),
  );
  // Controlled category selection. The uncontrolled `defaultValue` approach
  // broke edits: the <select> mounted before the async category list arrived,
  // so reopening an edit form always showed "Không chọn" and saving erased the
  // product's existing category. Value stays null until the user changes it,
  // so an empty categories list can never silently wipe the stored value.
  const [categoryId, setCategoryId] = useState<string | null>(null);

  useEffect(() => {
    publicApi.listCategories().then((res) => {
      if (res.ok) setCategories(res.data.items as Category[]);
    });
  }, []);

  /** Collect the enabled option axes into the API payload shape. */
  function buildOptionsPayload() {
    const out: {
      kind: string;
      values: { value: string; priceDeltaVnd: number | null }[];
    }[] = [];
    for (const kind of ["color", "size", "material", "packaging"]) {
      const entry = optionState[kind];
      if (!entry?.enabled) continue;
      let values = entry.values.map((v) => v.trim());
      let prices = entry.prices;
      if (kind === "packaging" && values.every((v) => v === "")) {
        values = [...PACKAGING_DEFAULT_VALUES];
        prices = values.map(() => "");
      }
      const cleaned = values
        .map((value, i) => ({
          value,
          price: entry.hasPrice ? Math.max(0, Math.round(Number(prices[i]) || 0)) : null,
        }))
        .filter((v) => v.value !== "")
        .map((v) => ({ value: v.value, priceDeltaVnd: v.price }));
      if (cleaned.length === 0) continue;
      if (cleaned.length < 2 && kind === "packaging") continue;
      out.push({ kind, values: cleaned });
    }
    return out;
  }

  const initialCategoryId =
    initial?.category != null
      ? categories.find((c) => c.slug === initial.category?.slug)?.id
      : undefined;
  const selectedCategoryId = categoryId ?? (initialCategoryId != null ? String(initialCategoryId) : "");

  function advanceCrop() {
    const next = pendingRef.current.shift();
    setCropping(next ?? null);
  }

  function onFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    if (cropping) {
      pendingRef.current = [...pendingRef.current, ...files];
      return;
    }
    const [first, ...rest] = files;
    setCropping(first ?? null);
    pendingRef.current = rest;
  }

  async function onCropped(file: File) {
    setUploading(true);
    setError(null);
    const res = await uploadProductImage(file);
    setUploading(false);
    if (!res.ok) {
      setError(res.data.error ?? "Tải ảnh thất bại.");
    } else {
      setImages((prev) => [...prev, res.data.url]);
    }
    advanceCrop();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || uploading) return;
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    setOkMessage(null);

    const categoryRaw = String(data.get("categoryId") ?? "");
    const payload = {
      name: String(data.get("name") ?? "").trim(),
      description: String(data.get("description") ?? ""),
      categoryId: categoryRaw ? Number(categoryRaw) : null,
      priceVnd: Number(data.get("priceVnd") ?? 0),
      priceMaxVnd: data.get("priceMaxVnd")
        ? Number(data.get("priceMaxVnd"))
        : null,
      colors: String(data.get("colors") ?? "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      isActive: data.get("isActive") === "on",
      shopeeUrl: String(data.get("shopeeUrl") ?? "").trim(),
      options: buildOptionsPayload(),
      images,
    };

    const res = initial
      ? await adminApi.updateProduct(initial.id, payload)
      : await adminApi.createProduct(payload);

    setSubmitting(false);
    if (!res.ok) {
      setError(res.data.error ?? "Lưu sản phẩm thất bại.");
      return;
    }
    setOkMessage("Đã lưu sản phẩm.");
    if (onSaved) onSaved();
  }

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className="grid gap-5 rounded-card border border-line bg-white p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-name" className="mb-1 block text-sm text-muted">
            Tên sản phẩm
          </label>
          <input
            id="p-name"
            name="name"
            required
            maxLength={200}
            defaultValue={initial?.name ?? ""}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="p-category" className="mb-1 block text-sm text-muted">
            Danh mục
          </label>
          <select
            id="p-category"
            name="categoryId"
            value={selectedCategoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Không chọn</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p-price" className="mb-1 block text-sm text-muted">
            Giá (VND)
          </label>
          <input
            id="p-price"
            name="priceVnd"
            type="number"
            min={0}
            step={1000}
            required
            inputMode="numeric"
            defaultValue={initial?.priceVnd ?? 0}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="p-pricemax" className="mb-1 block text-sm text-muted">
            Giá cao nhất (nếu có nhiều mức giá)
          </label>
          <input
            id="p-pricemax"
            name="priceMaxVnd"
            type="number"
            min={0}
            step={1000}
            inputMode="numeric"
            defaultValue={initial?.priceMaxVnd ?? ""}
            placeholder="Để trống nếu chỉ có một giá"
            className={fieldClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="p-shopee" className="mb-1 block text-sm text-muted">
            Link Shopee của sản phẩm (tuỳ chọn)
          </label>
          <input
            id="p-shopee"
            name="shopeeUrl"
            type="url"
            defaultValue={initial?.shopeeUrl ?? ""}
            placeholder="https://shopee.vn/product/<shop-id>/<item-id>"
            className="w-full rounded-control border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:border-rose-soft"
          />
          <p className="mt-1 text-xs text-muted">
            Khi có link, nút “Mua trên Shopee” sẽ hiện ở trang sản phẩm và dẫn
            thẳng tới sản phẩm đó trên Shopee.
          </p>
        </div>
        <div>
          <label htmlFor="p-colors" className="mb-1 block text-sm text-muted">
            Màu (phân cách bằng dấu phẩy)
          </label>
          <input
            id="p-colors"
            name="colors"
            defaultValue={initial?.colors.join(", ") ?? ""}
            placeholder="Hồng, Kem, Trắng"
            className={fieldClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="p-desc" className="mb-1 block text-sm text-muted">
            Mô tả
          </label>
          <textarea
            id="p-desc"
            name="description"
            rows={4}
            defaultValue={initial?.description ?? ""}
            className="w-full rounded-control border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:border-rose-soft"
          />
        </div>
      </div>

      <section className="mt-6 rounded-card border border-line bg-white p-5">
        <h3 className="font-display text-lg text-ink">Đặc điểm phân loại</h3>
        <p className="mt-1 text-sm text-muted">
          Tick vào các đặc điểm mà sản phẩm này phân loại theo (màu sắc, kích
          thước, chất liệu). “Đóng gói” luôn bật cho mọi đơn hàng. Nếu một
          đặc điểm có giá khác nhau giữa các lựa chọn, tick “Các lựa chọn này
          có giá khác nhau” rồi nhập giá phụ thêm cho từng lựa chọn.
        </p>
        <div className="mt-4">
          <OptionEditor state={optionState} onChange={setOptionState} />
        </div>
      </section>

      {/* Images */}
      <fieldset className="rounded-card border border-line p-4">
        <legend className="px-1 text-sm font-medium text-ink">Ảnh sản phẩm</legend>
        <p className="text-xs text-muted">
          JPEG hoặc PNG, tối đa 5MB mỗi ảnh. Ảnh đầu tiên là ảnh chính.
        </p>

        {images.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-3">
            {images.map((img, index) => (
              <li
                key={img}
                className="relative size-28 overflow-hidden rounded-control border border-line bg-white"
              >
                <ProductImage
                  path={img}
                  alt={`Ảnh ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-white/90 px-1 py-1">
                  <button
                    type="button"
                    onClick={() =>
                      setImages((prev) => [
                        img,
                        ...prev.filter((p) => p !== img),
                      ])
                    }
                    aria-label="Đặt làm ảnh chính"
                    title="Đặt làm ảnh chính"
                    className={`inline-flex size-6 items-center justify-center rounded ${
                      index === 0 ? "text-rose-deep" : "text-muted hover:text-rose-deep"
                    }`}
                  >
                    <Star
                      aria-hidden="true"
                      className="size-4"
                      fill={index === 0 ? "currentColor" : "none"}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setImages((prev) => prev.filter((p) => p !== img))
                    }
                    aria-label="Xóa ảnh"
                    title="Xóa ảnh"
                    className="inline-flex size-6 items-center justify-center rounded text-muted hover:text-rose-deep"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Chưa có ảnh nào.</p>
        )}

        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-ink hover:border-rose-soft">
          <Upload aria-hidden="true" className="size-4" />
          {uploading ? "Đang tải ảnh…" : "Thêm ảnh (cắt vuông)"}
          <input
            type="file"
            accept="image/jpeg,image/png"
            multiple
            onChange={onFilesSelected}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      </fieldset>

      <label className="flex items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial ? initial.isActive : true}
          className="size-4 rounded border-line text-rose-deep"
        />
        Đang bán
      </label>

      {error ? (
        <p className="text-sm text-rose-deep" role="alert">
          {error}
        </p>
      ) : null}
      {okMessage ? (
        <p className="text-sm text-rose-deep" aria-live="polite">
          {okMessage}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting || uploading}
          className="btn btn-primary disabled:opacity-60"
        >
          {submitting ? "Đang lưu…" : "Lưu sản phẩm"}
        </button>
      </div>

      {cropping ? (
        <ImageCropperModal
          file={cropping}
          onCancel={advanceCrop}
          onConfirm={onCropped}
        />
      ) : null}
    </form>
  );
}
