"use client";

import { useSyncExternalStore } from "react";

export type WishlistItem = {
  slug: string;
  name: string;
  priceVnd: number;
  /** Present on current data — used for anonymous favorite analytics. */
  productId?: number;
};

const STORAGE_KEY = "nhallennho:wishlist:v1";
export const WISHLIST_EVENT = "nhallennho:wishlist";
const EMPTY: WishlistItem[] = [];

function parse(raw: string | null): WishlistItem[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const items = parsed.filter(
      (x): x is WishlistItem =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as WishlistItem).slug === "string" &&
        typeof (x as WishlistItem).name === "string" &&
        typeof (x as WishlistItem).priceVnd === "number",
    );
    return items.length > 0 ? items : EMPTY;
  } catch {
    return EMPTY;
  }
}

// Cache the parsed value so getSnapshot returns a stable reference between
// renders (required by useSyncExternalStore).
let cachedRaw: string | null | undefined;
let cachedItems: WishlistItem[] = EMPTY;

function getSnapshot(): WishlistItem[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedItems = parse(raw);
  }
  return cachedItems;
}

function getServerSnapshot(): WishlistItem[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(WISHLIST_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(WISHLIST_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function commit(items: WishlistItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(WISHLIST_EVENT));
}

export function toggleWishlist(item: WishlistItem): boolean {
  const items = getSnapshot();
  const exists = items.some((x) => x.slug === item.slug);
  const next = exists
    ? items.filter((x) => x.slug !== item.slug)
    : [...items, item];
  commit(next);
  const added = !exists;
  if (added && item.productId != null) {
    // Count "add" actions only (ADR-0015); removals are not a like signal.
    void import("@/lib/analytics").then((m) =>
      m.trackEvent("wishlist_add", item.productId),
    );
  }
  return added;
}

export function useWishlist() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    items,
    isWishlisted: (slug: string) => items.some((x) => x.slug === slug),
    toggle: toggleWishlist,
    remove: (slug: string) =>
      commit(getSnapshot().filter((x) => x.slug !== slug)),
  };
}
