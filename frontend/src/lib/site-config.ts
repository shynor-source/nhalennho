/**
 * Public site configuration.
 *
 * These values are inlined by Next.js at build time (the documented
 * `NEXT_PUBLIC_` behavior), so pages stay statically renderable. They are
 * PUBLIC: never put a secret here. Server-only values live in
 * `src/lib/server-env.ts`, which is guarded by `server-only`.
 *
 * Each variable is referenced explicitly so Next.js can statically inline it.
 */
export type SiteConfig = {
  name: string;
  url: string;
  tagline: string;
  description: string;
  shopeeUrl: string;
  zaloUrl: string;
  facebookUrl: string;
  /** Browser-reachable API base URL (routed via NPM in production). */
  apiUrl: string;
};

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    // Failing loudly at build/runtime is better than shipping a broken link.
    throw new Error(
      `Missing required public environment variable ${name}. Set it in the environment before building.`,
    );
  }
  return value.trim();
}

export function getSiteConfig(): SiteConfig {
  return {
    name: required("NEXT_PUBLIC_SITE_NAME", process.env.NEXT_PUBLIC_SITE_NAME),
    url: required("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL).replace(
      /\/$/,
      "",
    ),
    tagline: required(
      "NEXT_PUBLIC_SITE_TAGLINE",
      process.env.NEXT_PUBLIC_SITE_TAGLINE,
    ),
    description: required(
      "NEXT_PUBLIC_SITE_DESCRIPTION",
      process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
    ),
    shopeeUrl: required(
      "NEXT_PUBLIC_SHOPEE_URL",
      process.env.NEXT_PUBLIC_SHOPEE_URL,
    ),
    zaloUrl: required("NEXT_PUBLIC_ZALO_URL", process.env.NEXT_PUBLIC_ZALO_URL),
    facebookUrl: required(
      "NEXT_PUBLIC_FACEBOOK_URL",
      process.env.NEXT_PUBLIC_FACEBOOK_URL,
    ),
    apiUrl: required("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL).replace(
      /\/$/,
      "",
    ),
  };
}
