"use client";

import { ShoppingBag } from "lucide-react";

import { addToCart } from "@/lib/cart";
import type { Product } from "@/lib/types";

/** Compact add-to-cart used on product cards. */
export function QuickAddButton({ product }: { product: Product }) {
  return (
    <button
      type="button"
      onClick={() =>
        addToCart(
          {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            // Quick add takes the base price and default (first) option
            // values — the packaging axis is always present on the detail
            // page for a considered pick.
            unitPriceVnd: product.priceVnd,
            priceVnd: product.priceVnd,
            priceMaxVnd: product.priceMaxVnd,
            coverImage: product.coverImage,
            options: [],
          },
          1,
        )
      }
      aria-label={`Thêm ${product.name} vào giỏ hàng`}
      className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-white text-muted transition-colors hover:border-rose-soft hover:text-rose-deep"
    >
      <ShoppingBag aria-hidden="true" className="size-4" />
    </button>
  );
}
