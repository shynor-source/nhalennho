import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, PenLine } from "lucide-react";

import { OrganizationJsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { apiServer, ApiError } from "@/lib/api-server";
import { pageMetadata } from "@/lib/metadata";
import { getSiteConfig } from "@/lib/site-config";
import type { Category, Product } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const site = getSiteConfig();
  return pageMetadata({
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    path: "/",
  });
}

export default async function HomePage() {
  const site = getSiteConfig();

  let categories: Category[] = [];
  let products: Product[] = [];
  let failed = false;
  try {
    const [catRes, prodRes] = await Promise.all([
      apiServer.categories(),
      apiServer.products("per_page=4&sort=newest"),
    ]);
    categories = catRes.items;
    products = prodRes.items;
  } catch (error) {
    failed = error instanceof ApiError;
  }

  return (
    <>
      <OrganizationJsonLd site={site} />
      {/* Ảnh bìa full-width — 2 file riêng cho 2 tỉ lệ khung (spec:
          docs/banner-spec.md) để KHÔNG crop mất nội dung:
          - Mobile: /brand/banner-mobile.jpg (tỉ lệ 16:9)
          - Desktop: /brand/banner-wide.jpg  (tỉ lệ 8:3)
          Hiện cả hai file tạm là bản sao banner.jpg cũ; chủ shop gửi ảnh
          đúng tỉ lệ thì chỉ cần thay 2 file này. */}
      <section className="border-b border-line">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-blush md:hidden">
          <Image
            src="/brand/banner-mobile.jpg"
            alt="Nhà Len Nhỏ — đồ len xinh xắn, handmade with love"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="relative hidden aspect-[8/3] w-full overflow-hidden bg-blush md:block">
          <Image
            src="/brand/banner-wide.jpg"
            alt="Nhà Len Nhỏ — đồ len xinh xắn, handmade with love"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </section>

      {/* Thanh mô tả + 2 nút, nằm dưới ảnh bìa (một hàng trên desktop). */}
      <section className="border-b border-line bg-blush/40">
        <div className="container-page flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between md:gap-8 md:py-6">
          <div className="max-w-2xl">
            <h1 className="text-[1.65rem] leading-[1.15] text-ink sm:text-3xl md:text-[2rem]">
              {site.tagline}
            </h1>
            <p className="mt-2 text-sm text-muted md:text-base">
              Nhà Len Nhỏ móc tay từng món đồ len nhỏ xinh: móc khóa, thú bông,
              hoa len và quà tặng. Bạn có thể chọn mẫu có sẵn hoặc nhờ tiệm móc
              theo yêu cầu.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:shrink-0 md:flex-nowrap">
            <Link href="/categories" className="btn btn-primary">
              Xem sản phẩm
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link href="/custom-order" className="btn btn-outline">
              <PenLine aria-hidden="true" className="size-4" />
              Đặt làm riêng
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page py-14 md:py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl text-ink sm:text-3xl">Sản phẩm mới</h2>
            <p className="mt-2 text-sm text-muted">
              Một vài mẫu đang có tại tiệm.
            </p>
          </div>
          <Link
            href="/categories"
            className="hidden text-sm text-rose-deep underline-offset-4 hover:underline sm:inline-flex sm:items-center sm:gap-1"
          >
            Xem tất cả
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        {failed ? (
          <p className="mt-8 rounded-card border border-line bg-white p-6 text-sm text-muted">
            Chưa tải được sản phẩm. Vui lòng thử lại sau.
          </p>
        ) : products.length === 0 ? (
          <p className="mt-8 rounded-card border border-line bg-white p-6 text-sm text-muted">
            Tiệm đang cập nhật sản phẩm mới.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-line bg-linen">
        <div className="container-page py-14 md:py-20">
          <h2 className="text-2xl text-ink sm:text-3xl">Danh mục sản phẩm</h2>
          {categories.length === 0 ? (
            <p className="mt-8 text-sm text-muted">Đang cập nhật danh mục.</p>
          ) : (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="flex h-full flex-col justify-between rounded-card border border-line bg-white p-6 transition-colors hover:border-rose-soft"
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
      </section>

      <section className="container-page py-16 md:py-24">
        <div className="rounded-card border border-line bg-blush/60 px-6 py-10 text-center sm:px-10 sm:py-14">
          <h2 className="mx-auto max-w-2xl text-2xl text-ink sm:text-3xl">
            Chưa tìm được món ưng ý? Hãy để tiệm móc riêng cho bạn.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted sm:text-base">
            Gửi ý tưởng của bạn, tiệm sẽ liên hệ để trao đổi chi tiết và báo giá.
          </p>
          <div className="mt-7 flex justify-center">
            <Link href="/custom-order" className="btn btn-primary">
              <PenLine aria-hidden="true" className="size-4" />
              Gửi yêu cầu đặt làm
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
