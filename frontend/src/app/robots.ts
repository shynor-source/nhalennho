import type { MetadataRoute } from "next";

import { getSiteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  const site = getSiteConfig();
  const base = site.url.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private areas and endpoints should never be indexed.
        disallow: [
          "/admin",
          "/admin/",
          "/account",
          "/account/",
          "/cart",
          "/checkout",
          "/order-success/",
          "/wishlist",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
