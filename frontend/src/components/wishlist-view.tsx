"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

import { formatVND } from "@/lib/format";
import { useWishlist } from "@/lib/wishlist";

export function WishlistView() {
  const { items, remove } = useWishlist();

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-card border border-line bg-white p-8 text-center">
        <Heart aria-hidden="true" className="mx-auto size-8 text-rose-soft" />
        <p className="mt-3 text-muted">
          Bạn chưa lưu sản phẩm yêu thích nào.
        </p>
        <Link href="/categories" className="btn btn-primary mt-5">
          Xem sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li
          key={item.slug}
          className="flex items-center justify-between gap-4 rounded-card border border-line bg-white p-5"
        >
          <div className="min-w-0">
            <Link
              href={`/products/${item.slug}`}
              className="font-medium text-ink transition-colors hover:text-rose-deep"
            >
              {item.name}
            </Link>
            <p className="mt-1 text-sm text-muted">{formatVND(item.priceVnd)}</p>
          </div>
          <button
            type="button"
            onClick={() => remove(item.slug)}
            aria-label={`Bỏ ${item.name} khỏi yêu thích`}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-rose-soft hover:text-rose-deep"
          >
            <Heart aria-hidden="true" className="size-5" fill="currentColor" />
          </button>
        </li>
      ))}
    </ul>
  );
}
