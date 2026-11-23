import type { BlogPost, Product } from "@/lib/types";
import type { SiteConfig } from "@/lib/site-config";

/**
 * JSON-LD structured data. Rendered server-side; content is JSON-serialized
 * from typed values only (never raw user HTML), so there is no injection risk.
 */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Data is produced by JSON.stringify from typed objects.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd({ site }: { site: SiteConfig }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Store",
        name: site.name,
        description: site.description,
        url: site.url,
        logo: `${site.url}/brand/logo.jpg`,
        image: `${site.url}/brand/banner.jpg`,
        sameAs: [site.zaloUrl, site.facebookUrl, site.shopeeUrl].filter(
          (value) => value && !value.endsWith("/"),
        ),
      }}
    />
  );
}

export function ProductJsonLd({
  product,
  siteUrl,
}: {
  product: Product;
  siteUrl: string;
}) {
  const url = `${siteUrl}/products/${product.slug}`;
  const image = product.coverImage
    ? product.coverImage.startsWith("http")
      ? product.coverImage
      : `${siteUrl}${product.coverImage}`
    : `${siteUrl}/brand/banner.jpg`;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description,
        image: [image],
        url,
        brand: { "@type": "Brand", name: "Nhà Len Nhỏ" },
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: "VND",
          price: product.priceVnd,
          availability: "https://schema.org/InStock",
        },
      }}
    />
  );
}

export function ArticleJsonLd({
  post,
  siteUrl,
}: {
  post: BlogPost;
  siteUrl: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt,
        url: `${siteUrl}/blog/${post.slug}`,
        datePublished: post.publishedAt ?? undefined,
        publisher: { "@type": "Organization", name: "Nhà Len Nhỏ" },
      }}
    />
  );
}
