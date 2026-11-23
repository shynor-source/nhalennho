"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { useCart } from "@/lib/cart";

export function CartLink() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Giỏ hàng (${count} sản phẩm)` : "Giỏ hàng"}
      className="relative inline-flex size-11 items-center justify-center rounded-control text-muted transition-colors hover:bg-blush/60 hover:text-rose-deep"
    >
      <ShoppingBag aria-hidden="true" className="size-5" />
      {count > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-deep px-1 text-[10px] leading-5 font-medium text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
