import Link from "next/link";
import type { Metadata } from "next";

import { pageMetadata } from "@/lib/metadata";
import { apiServer } from "@/lib/api-server";
import type { Category } from "@/lib/types";

export const metadata: Metadata = pageMetadata({
  title: "Danh mục sản phẩm",
  description: "Các nhóm đồ len handmade của Nhà Len Nhỏ.",
  path: "/categories",
});

export default async function CategoriesPage() {
  let categories: Category[] = [];
  let failed = false;
  try {
    categories = (await apiServer.categories()).items;
  } catch {
    failed = true;
  }

  return (
    <div className="container-page py-12 md:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl text-ink sm:text-4xl">Danh mục sản phẩm</h1>
        <p className="mt-3 text-muted">
          Chọn nhóm sản phẩm bạn quan tâm để xem các mẫu có sẵn.
        </p>
      </header>

      {failed ? (
        <p className="mt-10 rounded-card border border-line bg-white p-6 text-sm text-muted">
          Chưa tải được danh mục. Vui lòng thử lại sau.
        </p>
      ) : categories.length === 0 ? (
        <p className="mt-10 text-sm text-muted">Đang cập nhật danh mục.</p>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/categories/${category.slug}`}
                className="flex h-full flex-col rounded-card border border-line bg-white p-6 transition-colors hover:border-rose-soft"
              >
                <span className="font-display text-xl text-ink">
                  {category.name}
                </span>
                <span className="mt-2 text-sm text-muted">
                  {category.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
