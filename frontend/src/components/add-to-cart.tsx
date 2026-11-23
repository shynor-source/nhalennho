"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";

import { addToCart } from "@/lib/cart";
import { OPTION_KIND_LABELS } from "@/lib/types";
import type { Product, SelectedOption } from "@/lib/types";

/** Add-to-cart panel with the product's option selectors. */
export function AddToCart({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Default selection: the first value of every axis (packaging defaults to
  // regular wrapping). Options may be absent on legacy data.
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const option of product.options ?? []) {
      const first = option.values[0];
      if (first) initial[option.kind] = first.value;
    }
    return initial;
  });

  const labels = OPTION_KIND_LABELS;
  const options: SelectedOption[] = (product.options ?? []).map((o) => ({
    kind: o.kind,
    value: selected[o.kind] ?? "",
  }));
  const delta = (product.options ?? []).reduce((sum, o) => {
    const value = o.values.find((v) => v.value === selected[o.kind]);
    return sum + (value?.priceDeltaVnd ?? 0);
  }, 0);
  const unitPrice = product.priceVnd + delta;

  function pick(kind: string, value: string) {
    setSelected((prev) => ({ ...prev, [kind]: value }));
    setAdded(false);
  }

  function onAdd() {
    addToCart(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        unitPriceVnd: unitPrice,
        priceVnd: product.priceVnd,
        priceMaxVnd: product.priceMaxVnd,
        coverImage: product.coverImage,
        options,
      },
      quantity,
    );
    setAdded(true);
  }

  return (
    <div className="mt-2">
      {(product.options ?? []).map((option) => (
        <fieldset key={option.kind} className="mt-4">
          <legend className="mb-2 text-sm text-muted">
            {labels[option.kind] ?? option.kind}
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={labels[option.kind] ?? option.kind}>
            {option.values.map((value) => {
              const active = selected[option.kind] === value.value;
              const suffix =
                value.priceDeltaVnd && value.priceDeltaVnd > 0
                  ? ` (+${new Intl.NumberFormat("vi-VN").format(value.priceDeltaVnd)}đ)`
                  : "";
              return (
                <button
                  key={value.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => pick(option.kind, value.value)}
                  className={`rounded-control border px-3 py-2 text-sm transition-colors ${
                    active
                      ? "border-rose-deep bg-blush text-ink"
                      : "border-line bg-white text-muted hover:border-rose-soft hover:text-rose-deep"
                  }`}
                >
                  {value.value}
                  {suffix}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="add-qty" className="mb-1 block text-sm text-muted">
            Số lượng
          </label>
          <input
            id="add-qty"
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.min(99, Math.max(1, Number(e.target.value) || 1)))
            }
            className="h-11 w-24 rounded-control border border-line bg-white px-3 text-sm text-ink focus-visible:border-rose-soft"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onAdd} className="btn btn-primary">
            <ShoppingBag aria-hidden="true" className="size-4" />
            Thêm vào giỏ hàng
          </button>
          {added ? (
            <Link href="/cart" className="btn btn-outline" aria-live="polite">
              Xem giỏ hàng
            </Link>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-sm text-ink" aria-live="polite">
        Thành tiền: <span className="font-medium">{new Intl.NumberFormat("vi-VN").format(unitPrice)}đ</span>
      </p>
    </div>
  );
}
