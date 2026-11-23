"use client";

import { Plus, X } from "lucide-react";

import type { ProductOption } from "@/lib/types";

export type OptionKindState = {
  enabled: boolean;
  /** When true, every value has a price input (added to the base price). */
  hasPrice: boolean;
  values: string[];
  prices: string[];
};

export type OptionsState = Record<string, OptionKindState>;

export const EDITABLE_OPTION_KINDS = [
  { kind: "color", label: "Màu sắc" },
  { kind: "size", label: "Kích thước" },
  { kind: "material", label: "Chất liệu" },
] as const;

export const PACKAGING_DEFAULT_VALUES = ["Đóng gói thường", "Đóng gói quà tặng"];

/** Build the editor state from the product's existing options (edit mode). */
export function optionsStateFromProduct(
  options: ProductOption[] | undefined,
): OptionsState {
  const state: OptionsState = {
    // Packaging is mandatory on every product.
    packaging: {
      enabled: true,
      hasPrice: false,
      values: [...PACKAGING_DEFAULT_VALUES],
      prices: ["", ""],
    },
    color: { enabled: false, hasPrice: false, values: ["", "", ""], prices: ["", "", ""] },
    size: { enabled: false, hasPrice: false, values: ["", "", ""], prices: ["", "", ""] },
    material: { enabled: false, hasPrice: false, values: ["", "", ""], prices: ["", "", ""] },
  };
  for (const o of options ?? []) {
    const entry = state[o.kind];
    if (!entry) continue;
    entry.enabled = true;
    entry.values = o.values.map((v) => v.value);
    entry.prices = o.values.map((v) =>
      v.priceDeltaVnd == null ? "" : String(v.priceDeltaVnd),
    );
    entry.hasPrice = o.values.some((v) => v.priceDeltaVnd != null);
  }
  return state;
}

type Props = {
  state: OptionsState;
  onChange: (next: OptionsState) => void;
};

function getEntry(state: OptionsState, kind: string): OptionKindState {
  const entry = state[kind];
  return (
    entry ?? { enabled: false, hasPrice: false, values: ["", "", ""], prices: ["", "", ""] }
  );
}

/**
 * Editor for the product's variation axes. Packaging is always on; the other
 * three kinds are opt-in checkboxes. Each enabled axis expands into value
 * inputs (3 empty rows to start, "+" to add more) and an optional
 * "thay đổi giá" switch that reveals a price input per value.
 */
export function OptionEditor({ state, onChange }: Props) {
  function update(kind: string, patch: Partial<OptionKindState>) {
    onChange({ ...state, [kind]: { ...getEntry(state, kind), ...patch } });
  }

  function addValue(kind: string) {
    const entry = getEntry(state, kind);
    if (entry.values.length >= 24) return;
    update(kind, {
      values: [...entry.values, ""],
      prices: [...entry.prices, ""],
    });
  }

  function removeValue(kind: string, index: number) {
    const entry = getEntry(state, kind);
    if (entry.values.length <= 1) return;
    update(kind, {
      values: entry.values.filter((_, i) => i !== index),
      prices: entry.prices.filter((_, i) => i !== index),
    });
  }

  const renderAxis = (kind: string, label: string, locked = false) => {
    const entry = getEntry(state, kind);
    return (
      <div key={kind} className="rounded-card border border-line bg-cream/60 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={entry.enabled}
              disabled={locked}
              onChange={(e) => update(kind, { enabled: e.target.checked })}
              className="size-4 accent-[#8a4b57]"
            />
            {label}
            {locked ? (
              <span className="text-xs text-muted">(mặc định, luôn bật)</span>
            ) : null}
          </label>
          {entry.enabled ? (
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={entry.hasPrice}
                onChange={(e) => update(kind, { hasPrice: e.target.checked })}
                className="size-4 accent-[#8a4b57]"
              />
              Các lựa chọn này có giá khác nhau
            </label>
          ) : null}
        </div>

        {entry.enabled ? (
          <div className="mt-3 space-y-2">
            {entry.values.map((value, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={value}
                  maxLength={40}
                  placeholder={`Lựa chọn ${i + 1}, ví dụ: ${i === 0 ? "Hồng" : i === 1 ? "Kem" : "Trắng"}`}
                  onChange={(e) => {
                    const values = [...entry.values];
                    values[i] = e.target.value;
                    update(kind, { values });
                  }}
                  className="h-10 min-w-0 flex-1 rounded-control border border-line bg-white px-3 text-sm text-ink focus-visible:border-rose-soft"
                />
                {entry.hasPrice ? (
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={entry.prices[i] ?? ""}
                      placeholder="Giá thêm (đ)"
                      onChange={(e) => {
                        const prices = [...entry.prices];
                        prices[i] = e.target.value;
                        update(kind, { prices });
                      }}
                      className="h-10 w-36 rounded-control border border-line bg-white pl-3 pr-8 text-sm text-ink focus-visible:border-rose-soft"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">
                      đ
                    </span>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeValue(kind, i)}
                  aria-label={`Xóa lựa chọn ${i + 1}`}
                  disabled={entry.values.length <= 1}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-line text-muted hover:border-rose-soft hover:text-rose-deep disabled:opacity-40"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addValue(kind)}
              className="inline-flex items-center gap-1 text-sm text-rose-deep hover:underline"
            >
              <Plus aria-hidden="true" className="size-4" />
              Thêm lựa chọn
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {renderAxis("color", "Màu sắc")}
      {renderAxis("size", "Kích thước")}
      {renderAxis("material", "Chất liệu")}
      {renderAxis("packaging", "Đóng gói", true)}
    </div>
  );
}
