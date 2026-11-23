import type { MetadataRoute } from "next";

import { apiServer } from "@/lib/api-server";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/**
 * Sitemap covering static pages, categories, products and published posts.
 * Failing to reach the API must not break the build: we fall back to the
 * static pages only.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteConfig();
  const base = site.url.replace(/\/$/, "");
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/custom-order`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  try {
    const [categories, products, posts] = await Promise.all([
      apiServer.categories(),
      apiServer.products("per_page=100"),
      apiServer.posts("per_page=100"),
    ]);

    for (const category of categories.items) {
      entries.push({
        url: `${base}/categories/${category.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
    for (const product of products.items) {
      entries.push({
        url: `${base}/products/${product.slug}`,
        lastModified: product.createdAt ? new Date(product.createdAt) : now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
    for (const post of posts.items) {
      entries.push({
        url: `${base}/blog/${post.slug}`,
        lastModified: post.publishedAt ? new Date(post.publishedAt) : now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch {
    // API unavailable: keep the static entries only.
  }

  return entries;
}
