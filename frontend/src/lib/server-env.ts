import "server-only";

/**
 * Server-only environment values. The `server-only` import makes any accidental
 * client import a build error, so these values cannot leak into a browser
 * bundle (brief sections 6.1, 6.2).
 */
export function getInternalApiUrl(): string {
  const value = process.env.INTERNAL_API_URL;
  if (!value || value.trim() === "") {
    throw new Error(
      "Missing INTERNAL_API_URL. It must point at the API over the private Docker network.",
    );
  }
  return value.trim().replace(/\/$/, "");
}
