import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProductFilters } from "@/components/product-filters";
import { ProductGrid } from "@/components/product-grid";
import { apiServer, ApiError } from "@/lib/api-server";
import { pageMetadata } from "@/lib/metadata";
import { buildProductQuery, first, type RawSearchParams } from "@/lib/query";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const cats = (await apiServer.categories()).items;
    const category = cats.find((c) => c.slug === slug);
    if (category) {
      return pageMetadata({
        title: category.name,
        description:
          category.description || `Đồ len handmade thuộc nhóm ${category.name}.`,
        path: `/categories/${category.slug}`,
      });
    }
  } catch {
    // fall through to default metadata
  }
  return pageMetadata({
    title: "Danh mục sản phẩm",
    description: "Các nhóm đồ len handmade của Nhà Len Nhỏ.",
    path: `/categories/${slug}`,
  });
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  let categories = [] as Awaited<ReturnType<typeof apiServer.categories>>["items"];
  let colors: string[] = [];
  try {
    const [catRes, colorRes] = await Promise.all([
      apiServer.categories(),
      apiServer.colors(),
    ]);
    categories = catRes.items;
    colors = colorRes.items;
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) {
      return (
        <div className="container-page py-16">
          <p className="rounded-card border border-line bg-white p-6 text-sm text-muted">
            Chưa kết nối được tới máy chủ. Vui lòng thử lại sau.
          </p>
        </div>
      );
    }
  }

  const category = categories.find((c) => c.slug === slug);
  if (!category) {
    notFound();
  }

  const query = buildProductQuery(sp, { category: slug });
  let products = [] as Awaited<ReturnType<typeof apiServer.products>>["items"];
  let total = 0;
  try {
    const res = await apiServer.products(query);
    products = res.items;
    total = res.total;
  } catch {
    // handled below by empty state
  }

  return (
    <div className="container-page py-12 md:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl text-ink sm:text-4xl">{category.name}</h1>
        <p className="mt-3 text-muted">{category.description}</p>
      </header>

      <div className="mt-8">
        <ProductFilters
          categories={categories}
          colors={colors}
          current={{
            q: first(sp.q) ?? "",
            category: slug,
            color: first(sp.color) ?? "",
            minPrice: first(sp.min_price) ?? "",
            maxPrice: first(sp.max_price) ?? "",
            sort: first(sp.sort) ?? "newest",
          }}
        />
      </div>

      <p className="mt-6 text-sm text-muted">{total} sản phẩm</p>
      <div className="mt-4">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
