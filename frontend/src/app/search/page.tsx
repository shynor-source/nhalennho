import type { Metadata } from "next";

import { ProductFilters } from "@/components/product-filters";
import { pageMetadata } from "@/lib/metadata";
import { ProductGrid } from "@/components/product-grid";
import { apiServer } from "@/lib/api-server";
import { buildProductQuery, first, type RawSearchParams } from "@/lib/query";

export const metadata: Metadata = pageMetadata({
  title: "Tìm kiếm sản phẩm",
  description: "Tìm và lọc đồ len handmade theo danh mục, màu sắc và giá.",
  path: "/search",
});

type PageProps = { searchParams: Promise<RawSearchParams> };

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const query = buildProductQuery(sp);

  let categories = [] as Awaited<ReturnType<typeof apiServer.categories>>["items"];
  let colors: string[] = [];
  let products = [] as Awaited<ReturnType<typeof apiServer.products>>["items"];
  let total = 0;
  let failed = false;
  try {
    const [catRes, colorRes, prodRes] = await Promise.all([
      apiServer.categories(),
      apiServer.colors(),
      apiServer.products(query),
    ]);
    categories = catRes.items;
    colors = colorRes.items;
    products = prodRes.items;
    total = prodRes.total;
  } catch {
    failed = true;
  }

  const q = first(sp.q);

  return (
    <div className="container-page py-12 md:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl text-ink sm:text-4xl">Tìm kiếm sản phẩm</h1>
        <p className="mt-3 text-muted">
          {q ? `Kết quả cho “${q}”.` : "Tìm theo tên sản phẩm và bộ lọc."}
        </p>
      </header>

      <div className="mt-8">
        <ProductFilters
          categories={categories}
          colors={colors}
          current={{
            q: q ?? "",
            category: first(sp.category) ?? "",
            color: first(sp.color) ?? "",
            minPrice: first(sp.min_price) ?? "",
            maxPrice: first(sp.max_price) ?? "",
            sort: first(sp.sort) ?? "newest",
          }}
        />
      </div>

      <p className="mt-6 text-sm text-muted">
        {failed ? "" : `${total} sản phẩm`}
      </p>
      <div className="mt-4">
        {failed ? (
          <p className="rounded-card border border-line bg-white p-6 text-sm text-muted">
            Chưa tải được sản phẩm. Vui lòng thử lại sau.
          </p>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </div>
  );
}
