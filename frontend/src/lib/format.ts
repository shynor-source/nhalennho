const numberFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

/** Format a VND amount as e.g. "720.000đ". */
export function formatVND(value: number): string {
  return `${numberFormatter.format(value)}đ`;
}

/** "Từ X" when a product has several price tiers, otherwise just the price. */
export function formatPriceFrom(
  min: number,
  max: number | null | undefined,
): string {
  return max && max > min ? `Từ ${formatVND(min)}` : formatVND(min);
}

/** "X – Y" for price ranges, otherwise a single price. */
export function formatPriceRange(
  min: number,
  max: number | null | undefined,
): string {
  return max && max > min ? `${formatVND(min)} – ${formatVND(max)}` : formatVND(min);
}

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return dateFormatter.format(date);
}
