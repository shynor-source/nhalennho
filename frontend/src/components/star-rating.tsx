import { Star } from "lucide-react";

/** Read-only star rating with an accessible label. */
export function StarRating({
  value,
  count,
}: {
  value: number;
  count?: number;
}) {
  const rounded = Math.round(value);
  return (
    <span
      className="inline-flex items-center gap-1 text-rose"
      aria-label={`${value} trên 5 sao${count !== undefined ? `, ${count} đánh giá` : ""}`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className="size-4"
          fill={n <= rounded ? "currentColor" : "none"}
        />
      ))}
      {count !== undefined ? (
        <span className="ml-1 text-xs text-muted">({count})</span>
      ) : null}
    </span>
  );
}
