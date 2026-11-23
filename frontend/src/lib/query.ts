export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Return the first value of a possibly repeated query parameter. */
export function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

const PRODUCT_KEYS = [
  "q",
  "category",
  "color",
  "min_price",
  "max_price",
  "sort",
  "page",
] as const;

/** Build a validated product query string from URL search params. */
export function buildProductQuery(
  sp: RawSearchParams,
  extra?: Record<string, string | undefined>,
): string {
  const usp = new URLSearchParams();
  for (const key of PRODUCT_KEYS) {
    const value = first(sp[key]);
    if (value) usp.set(key, value);
  }
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) usp.set(key, value);
    }
  }
  return usp.toString();
}
