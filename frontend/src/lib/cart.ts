"use client";

import { useSyncExternalStore } from "react";

import type { SelectedOption } from "./types";
import { OPTION_KIND_LABELS } from "./types";

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  /** Effective unit price (base price + chosen option deltas). */
  unitPriceVnd: number;
  /** Kept for backwards-compatible storage parsing; informational only. */
  priceVnd: number;
  priceMaxVnd: number | null;
  coverImage: string;
  options: SelectedOption[];
  quantity: number;
};

const STORAGE_KEY = "nhallennho:cart:v2";
const CART_EVENT = "nhallennho:cart";
const EMPTY: CartItem[] = [];

function stableOptions(options: SelectedOption[]): SelectedOption[] {
  return [...options].sort((a, b) => a.kind.localeCompare(b.kind));
}

/** Two cart lines are the same product when their option picks match. */
function sameLine(
  a: Pick<CartItem, "productId" | "options">,
  b: Pick<CartItem, "productId" | "options">,
): boolean {
  if (a.productId !== b.productId) return false;
  const ao = stableOptions(a.options ?? []);
  const bo = stableOptions(b.options ?? []);
  if (ao.length !== bo.length) return false;
  return ao.every((o, i) => o.kind === bo[i]?.kind && o.value === bo[i]?.value);
}

/** Human-readable option list, e.g. "Màu sắc: Hồng · Đóng gói: Quà tặng". */
export function describeOptions(options: SelectedOption[] | undefined): string {
  if (!options || options.length === 0) return "";
  return options
    .map((o) => `${OPTION_KIND_LABELS[o.kind] ?? o.kind}: ${o.value}`)
    .join(" · ");
}

function parse(raw: string | null): CartItem[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const items = parsed
      .filter(
        (x): x is CartItem =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as CartItem).productId === "number" &&
          typeof (x as CartItem).slug === "string" &&
          typeof (x as CartItem).name === "string" &&
          typeof (x as CartItem).quantity === "number",
      )
      .map((x) => ({
        ...x,
        // Legacy v1 entries have no options or unit price.
        options: Array.isArray(x.options) ? x.options : [],
        unitPriceVnd:
          typeof x.unitPriceVnd === "number" ? x.unitPriceVnd : x.priceVnd,
      }));
    return items.length > 0 ? items : EMPTY;
  } catch {
    return EMPTY;
  }
}

let cachedRaw: string | null | undefined;
let cachedItems: CartItem[] = EMPTY;

function getSnapshot(): CartItem[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedItems = parse(raw);
  }
  return cachedItems;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CART_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CART_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function commit(items: CartItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function addToCart(item: Omit<CartItem, "quantity">, quantity = 1) {
  const items = getSnapshot();
  const existing = items.find((x) => sameLine(x, item));
  const next = existing
    ? items.map((x) =>
        sameLine(x, item)
          ? { ...x, quantity: Math.min(99, x.quantity + quantity) }
          : x,
      )
    : [...items, { ...item, quantity: Math.min(99, Math.max(1, quantity)) }];
  commit(next);
}

export function clearCart() {
  commit([]);
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    items,
    count: items.reduce((sum, x) => sum + x.quantity, 0),
    total: items.reduce((sum, x) => sum + x.unitPriceVnd * x.quantity, 0),
    add: addToCart,
    setQuantity: (lineIndex: number, quantity: number) => {
      const current = getSnapshot();
      const line = current[lineIndex];
      if (!line) return;
      if (quantity < 1) {
        commit(current.filter((_, i) => i !== lineIndex));
        return;
      }
      commit(
        current.map((x, i) =>
          i === lineIndex ? { ...x, quantity: Math.min(99, quantity) } : x,
        ),
      );
    },
    remove: (lineIndex: number) =>
      commit(getSnapshot().filter((_, i) => i !== lineIndex)),
    clear: clearCart,
  };
}
