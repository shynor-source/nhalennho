"use client";

// Anonymous analytics beacon (ADR-0015): fire-and-forget, no identity, no
// cookies. Failures are ignored — tracking must never break browsing.

import { getSiteConfig } from "@/lib/site-config";

export type AnalyticsEventKind = "page_view" | "product_view" | "wishlist_add";

export function trackEvent(kind: AnalyticsEventKind, productId?: number): void {
  if (typeof window === "undefined") return;
  const body: Record<string, unknown> = { kind };
  if (typeof productId === "number" && Number.isFinite(productId) && productId > 0) {
    body.productId = productId;
  }
  try {
    void fetch(`${getSiteConfig().apiUrl}/api/v1/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}
