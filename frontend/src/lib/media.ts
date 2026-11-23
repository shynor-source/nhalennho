import { getSiteConfig } from "@/lib/site-config";

/**
 * Turn a stored relative image path (e.g. `/media/<hex>.jpg`) into a URL the
 * browser can load. Absolute URLs are returned unchanged.
 */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${getSiteConfig().apiUrl}${path}`;
}
