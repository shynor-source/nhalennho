import type { NextConfig } from "next";

/**
 * Next.js configuration.
 *
 * - `output: "standalone"` produces a minimal production server image.
 * - Security headers are set here for HTML responses; Nginx Proxy Manager
 *   terminates TLS and adds HSTS. The backend API sets its own headers.
 */
function apiImagePatterns() {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return [];
  try {
    const url = new URL(raw);
    return [
      {
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        pathname: "/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  // `standalone` is only needed for the Docker/VPS image (ADR-0012 fallback).
  // The Cloudflare Workers build (OpenNext, ADR-0013) must not use it.
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  // Device/LAN hosts used to open the dev server (harmless in production).
  allowedDevOrigins: ["host.docker.internal"],
  images: {
    // Product images are served by the backend at /media/*; allow the configured
    // API host (never a hard-coded hostname).
    formats: ["image/avif", "image/webp"],
    remotePatterns: apiImagePatterns(),
    // Cloudflare Workers builds cannot use the Next.js image optimizer (it
    // requires the paid Cloudflare Images binding — ADR-0013). The backend
    // already re-encodes uploads into small squares, so serving them as-is is
    // fine.
    ...(process.env.OPENNEXT === "1" ? { unoptimized: true } : {}),
  },
  async headers() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    let apiOrigin = "";
    try {
      apiOrigin = apiUrl ? new URL(apiUrl).origin : "";
    } catch {
      apiOrigin = "";
    }
    const isDev = process.env.NODE_ENV !== "production";

    const connectSrc = ["'self'", apiOrigin];
    const scriptSrc = ["'self'", "'unsafe-inline'"];
    const imgSrc = ["'self'", "data:", "blob:", "https:"];
    if (isDev) {
      // Next.js dev/Turbopack needs eval() (React debug callstacks) and a
      // WebSocket for HMR. Production keeps the strict policy below.
      scriptSrc.push("'unsafe-eval'");
      connectSrc.push("ws:", "wss:");
      // Dev serves media from the local backend over plain http.
      imgSrc.push("http:");
    }
    const connectSrcValue = connectSrc.filter(Boolean).join(" ");
    // Next.js injects inline bootstrap scripts/styles, so 'unsafe-inline' is
    // required for those directives. Everything else is locked to same-origin
    // and the configured API host. Fonts are self-hosted by next/font.
    const csp = [
      "default-src 'self'",
      `script-src ${scriptSrc.join(" ")}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src " + imgSrc.join(" "),
      `font-src 'self' data:`,
      `connect-src ${connectSrcValue}`,
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
