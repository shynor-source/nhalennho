import { Search } from "lucide-react";

import type { Category } from "@/lib/types";

type Current = {
  q?: string;
  category?: string;
  color?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
};

/** Server-rendered filter form. Submitting updates the URL (GET). */
export function ProductFilters({
  categories,
  colors,
  current,
}: {
  categories: Category[];
  colors: string[];
  current: Current;
}) {
  const fieldClass =
    "h-11 w-full rounded-control border border-line bg-white px-3 text-sm text-ink focus-visible:border-rose-soft";

  return (
    <form
      method="get"
      className="grid gap-4 rounded-card border border-line bg-white p-5 md:grid-cols-2 lg:grid-cols-3"
      aria-label="Bộ lọc sản phẩm"
    >
      <div className="lg:col-span-3">
        <label htmlFor="q" className="mb-1 block text-sm text-muted">
          Tìm kiếm
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={current.q ?? ""}
            placeholder="Ví dụ: móc khóa…"
            autoComplete="off"
            className={`${fieldClass} pl-9`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="category" className="mb-1 block text-sm text-muted">
          Danh mục
        </label>
        <select
          id="category"
          name="category"
          defaultValue={current.category ?? ""}
          className={fieldClass}
        >
          <option value="">Tất cả</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="color" className="mb-1 block text-sm text-muted">
          Màu
        </label>
        <select
          id="color"
          name="color"
          defaultValue={current.color ?? ""}
          className={fieldClass}
        >
          <option value="">Tất cả</option>
          {colors.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="sort" className="mb-1 block text-sm text-muted">
          Sắp xếp
        </label>
        <select
          id="sort"
          name="sort"
          defaultValue={current.sort ?? "newest"}
          className={fieldClass}
        >
          <option value="newest">Mới nhất</option>
          <option value="price_asc">Giá thấp đến cao</option>
          <option value="price_desc">Giá cao đến thấp</option>
        </select>
      </div>

      <div>
        <label htmlFor="min_price" className="mb-1 block text-sm text-muted">
          Giá từ (đ)
        </label>
        <input
          id="min_price"
          name="min_price"
          type="number"
          min={0}
          step={1000}
          inputMode="numeric"
          defaultValue={current.minPrice ?? ""}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="max_price" className="mb-1 block text-sm text-muted">
          Giá đến (đ)
        </label>
        <input
          id="max_price"
          name="max_price"
          type="number"
          min={0}
          step={1000}
          inputMode="numeric"
          defaultValue={current.maxPrice ?? ""}
          className={fieldClass}
        />
      </div>

      <div className="flex items-end gap-3">
        <button type="submit" className="btn btn-primary">
          Lọc
        </button>
        <a href="?" className="btn btn-outline">
          Xóa lọc
        </a>
      </div>
    </form>
  );
}
