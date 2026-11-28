"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics";

// Fires one page_view event per pathname change. Admin/account areas are
// excluded — the shop owner cares about storefront traffic (ADR-0015).
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/account") ||
      pathname.startsWith("/checkout") ||
      pathname.startsWith("/order-success")
    ) {
      return;
    }
    trackEvent("page_view");
  }, [pathname]);

  return null;
}

// Fires one product_view event when a product page mounts.
export function ProductViewTracker({ productId }: { productId: number }) {
  useEffect(() => {
    trackEvent("product_view", productId);
  }, [productId]);

  return null;
}
