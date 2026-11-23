import Link from "next/link";

import { ProductImage } from "@/components/product-image";
import { QuickAddButton } from "@/components/quick-add-button";
import { WishlistButton } from "@/components/wishlist-button";
import { formatPriceFrom } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-line bg-white transition-colors hover:border-rose-soft">
      <div className="relative">
        <Link href={`/products/${product.slug}`} className="block">
          {product.coverImage ? (
            <ProductImage
              path={product.coverImage}
              alt={`Ảnh sản phẩm ${product.name}`}
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div
              className="aspect-square w-full bg-blush/50"
              role="img"
              aria-label={`Ảnh sản phẩm ${product.name} (đang cập nhật)`}
            />
          )}
        </Link>
        <div className="absolute top-3 right-3">
          <WishlistButton
            item={{
              slug: product.slug,
              name: product.name,
              priceVnd: product.priceVnd,
            }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.category ? (
          <p className="text-xs text-muted">{product.category.name}</p>
        ) : null}
        <h3 className="font-display text-lg text-ink">
          <Link
            href={`/products/${product.slug}`}
            className="transition-colors hover:text-rose-deep"
          >
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <p className="text-sm text-ink">
            {formatPriceFrom(product.priceVnd, product.priceMaxVnd)}
          </p>
          <QuickAddButton product={product} />
        </div>
      </div>
    </article>
  );
}
