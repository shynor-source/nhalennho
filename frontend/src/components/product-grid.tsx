import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/types";

export function ProductGrid({
  products,
  emptyMessage = "Không tìm thấy sản phẩm phù hợp.",
}: {
  products: Product[];
  emptyMessage?: string;
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-card border border-line bg-white p-6 text-sm text-muted">
        {emptyMessage}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
}
