import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";

import { AddToCart } from "@/components/add-to-cart";
import { ShopeeIcon } from "@/components/brand-icons";
import { ProductViewTracker } from "@/components/page-view-tracker";
import { ProductGallery } from "@/components/product-gallery";
import { ReviewForm } from "@/components/review-form";
import { StarRating } from "@/components/star-rating";
import { WishlistButton } from "@/components/wishlist-button";
import { ProductJsonLd } from "@/components/json-ld";
import { apiServer, ApiError } from "@/lib/api-server";
import { formatDate, formatPriceRange } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { getSiteConfig } from "@/lib/site-config";
import type { Product, Review } from "@/lib/types";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { product } = await apiServer.product(slug);
    const site = getSiteConfig();
    const image = product.coverImage
      ? product.coverImage.startsWith("http")
        ? product.coverImage
        : `${site.url}${product.coverImage}`
      : undefined;
    return pageMetadata({
      title: product.name,
      description: product.description.slice(0, 160),
      path: `/products/${product.slug}`,
      image,
    });
  } catch {
    return { title: "Sản phẩm" };
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const site = getSiteConfig();

  let product: Product;
  let reviews: Review[];
  try {
    const res = await apiServer.product(slug);
    product = res.product;
    reviews = res.reviews;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    return (
      <div className="container-page py-16">
        <p className="rounded-card border border-line bg-white p-6 text-sm text-muted">
          Chưa kết nối được tới máy chủ. Vui lòng thử lại sau.
        </p>
      </div>
    );
  }

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="container-page py-10 md:py-14">
      <ProductJsonLd product={product} siteUrl={site.url} />
      <nav aria-label="Đường dẫn" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-rose-deep">
              Trang chủ
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/categories" className="hover:text-rose-deep">
              Danh mục
            </Link>
          </li>
          {product.category ? (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/categories/${product.category.slug}`}
                  className="hover:text-rose-deep"
                >
                  {product.category.name}
                </Link>
              </li>
            </>
          ) : null}
        </ol>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="relative">
          <ProductGallery images={product.images ?? []} name={product.name} />
          <div className="absolute top-4 right-4">
            <WishlistButton
              item={{
                slug: product.slug,
                name: product.name,
                priceVnd: product.priceVnd,
                productId: product.id,
              }}
            />
          </div>
        </div>

        <div>
          {product.category ? (
            <p className="text-sm text-muted">{product.category.name}</p>
          ) : null}
          <h1 className="mt-1 text-3xl text-ink sm:text-4xl">{product.name}</h1>

          {reviews.length > 0 ? (
            <div className="mt-2">
              <StarRating value={average} count={reviews.length} />
            </div>
          ) : null}

          <p className="mt-4 text-2xl text-ink">
            {formatPriceRange(product.priceVnd, product.priceMaxVnd)}
          </p>

          {product.colors.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm text-muted">Màu có sẵn</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <li
                    key={color}
                    className="rounded-control border border-line bg-white px-3 py-1 text-sm text-ink"
                  >
                    {color}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-5 text-base leading-relaxed text-muted">
            {product.description}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {/* Link Shopee riêng của sản phẩm nếu admin đã điền; nếu chưa,
                dẫn tới trang shop trên Shopee. */}
            <a
              href={product.shopeeUrl || site.shopeeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <ShopeeIcon aria-hidden="true" className="size-4" />
              Mua trên Shopee
            </a>
            <a
              href={site.zaloUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              Nhắn Zalo
            </a>
          </div>

          <div className="mt-8"><AddToCart product={product} /></div>
          <ProductViewTracker productId={product.id} />
        </div>
      </div>

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="text-2xl text-ink">Đánh giá của khách</h2>
        {reviews.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Chưa có đánh giá nào cho sản phẩm này.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-card border border-line bg-white p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">
                    {review.authorName}
                  </span>
                  <StarRating value={review.rating} />
                </div>
                {review.body ? (
                  <p className="mt-2 text-sm text-muted">{review.body}</p>
                ) : null}
                <p className="mt-2 text-xs text-muted">
                  {formatDate(review.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 max-w-2xl">
          <ReviewForm slug={product.slug} />
        </div>
      </section>
    </div>
  );
}
