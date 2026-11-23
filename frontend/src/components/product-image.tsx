import Image from "next/image";

import { mediaUrl } from "@/lib/media";

/**
 * Renders a stored product image. `unoptimized` keeps the original file (they
 * are already re-encoded and bounded on upload) and lets the browser fetch it
 * directly, which works for both the API origin in dev and the public domain in
 * production.
 */
export function ProductImage({
  path,
  alt,
  className = "",
  priority = false,
}: {
  path: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={mediaUrl(path)}
      alt={alt}
      width={800}
      height={1000}
      unoptimized
      priority={priority}
      className={className}
    />
  );
}
