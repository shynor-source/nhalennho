import type { Metadata } from "next";

import { getSiteConfig } from "@/lib/site-config";

type Options = {
  title: string;
  description: string;
  /** Site-relative path used for the canonical URL, e.g. "/about". */
  path: string;
  type?: "website" | "article";
  image?: string;
};

/**
 * Builds consistent page metadata: title, description, canonical URL and
 * Open Graph/Twitter cards. Falls back to the shop banner when no image is
 * supplied so every shared link has a preview.
 */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  image,
}: Options): Metadata {
  const site = getSiteConfig();
  const canonical = path === "/" ? site.url : `${site.url}${path}`;
  const ogImage = image ?? `${site.url}/brand/banner.jpg`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type,
      locale: "vi_VN",
      siteName: site.name,
      title,
      description,
      url: canonical,
      images: [{ url: ogImage, width: 1536, height: 1024, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
