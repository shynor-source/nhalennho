"use client";

import { Heart } from "lucide-react";

import { useWishlist, type WishlistItem } from "@/lib/wishlist";

type Props = {
  item: WishlistItem;
  className?: string;
};

/** Toggle a product in the local wishlist. */
export function WishlistButton({ item, className = "" }: Props) {
  const { isWishlisted, toggle } = useWishlist();
  const active = isWishlisted(item.slug);

  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      aria-pressed={active}
      aria-label={active ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
      className={`inline-flex size-10 items-center justify-center rounded-full border border-line bg-white transition-colors hover:border-rose-soft hover:text-rose-deep ${
        active ? "text-rose-deep" : "text-muted"
      } ${className}`}
    >
      <Heart
        aria-hidden="true"
        className="size-5"
        fill={active ? "currentColor" : "none"}
      />
    </button>
  );
}
