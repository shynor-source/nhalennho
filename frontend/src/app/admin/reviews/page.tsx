"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { adminApi } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { AdminReview } from "@/lib/types";

type Filter = "pending" | "approved" | "all";

const filters: { value: Filter; label: string }[] = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "all", label: "Tất cả" },
];

export default function AdminReviewsPage() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const query = filter === "all" ? "" : `?status=${filter}`;
    adminApi.listReviews(query).then((res) => {
      if (!active) return;
      setLoading(false);
      if (res.ok) {
        const data = res.data as { items: AdminReview[]; total: number };
        setItems(data.items);
        setTotal(data.total);
      } else {
        setError(res.data.error ?? "Không tải được đánh giá.");
      }
    });
    return () => {
      active = false;
    };
  }, [filter]);

  async function setApproved(review: AdminReview, approved: boolean) {
    setBusyId(review.id);
    setError(null);
    const res = await adminApi.setReviewApproved(review.id, approved);
    setBusyId(null);
    if (!res.ok) {
      setError(res.data.error ?? "Cập nhật thất bại.");
      return;
    }
    setItems((current) =>
      filter === "all"
        ? current.map((r) => (r.id === review.id ? { ...r, isApproved: approved } : r))
        : current.filter((r) => r.id !== review.id),
    );
    if (filter !== "all") setTotal((n) => Math.max(0, n - 1));
  }

  async function remove(review: AdminReview) {
    if (!window.confirm("Xóa đánh giá này?")) return;
    setBusyId(review.id);
    setError(null);
    const res = await adminApi.deleteReview(review.id);
    setBusyId(null);
    if (!res.ok) {
      setError(res.data.error ?? "Xóa thất bại.");
      return;
    }
    setItems((current) => current.filter((r) => r.id !== review.id));
    setTotal((n) => Math.max(0, n - 1));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl text-ink">Đánh giá của khách</h1>
          <p className="mt-1 text-sm text-muted">
            Đánh giá mới ở trạng thái chờ duyệt cho tới khi bạn duyệt.
          </p>
        </div>
        <p className="text-sm text-muted">{total} đánh giá</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => {
              setLoading(true);
              setFilter(f.value);
            }}
            className={`rounded-control border px-3 py-2 text-sm transition-colors ${
              filter === f.value
                ? "border-rose-soft bg-blush/60 text-rose-deep"
                : "border-line bg-white text-muted hover:text-rose-deep"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-5 text-sm text-rose-deep" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-muted">Đang tải…</p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-card border border-line bg-white p-10 text-center">
          <p className="text-muted">Không có đánh giá nào.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4">
          {items.map((review) => (
            <li
              key={review.id}
              className="rounded-card border border-line bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-ink">
                    <span className="font-medium">{review.authorName}</span>
                    <span className="text-muted"> · </span>
                    <span aria-label={`${review.rating} trên 5 sao`}>
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(review.createdAt)} ·{" "}
                    <Link
                      href={`/products/${review.productSlug}`}
                      className="text-rose-deep hover:underline"
                    >
                      {review.productName}
                    </Link>
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    review.isApproved
                      ? "bg-blush/60 text-rose-deep"
                      : "bg-cream text-muted"
                  }`}
                >
                  {review.isApproved ? "Đã duyệt" : "Chờ duyệt"}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-ink">
                {review.body}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {review.isApproved ? (
                  <button
                    type="button"
                    disabled={busyId === review.id}
                    onClick={() => setApproved(review, false)}
                    className="btn btn-outline disabled:opacity-60"
                  >
                    Ẩn đánh giá
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === review.id}
                    onClick={() => setApproved(review, true)}
                    className="btn btn-primary disabled:opacity-60"
                  >
                    Duyệt hiển thị
                  </button>
                )}
                <button
                  type="button"
                  disabled={busyId === review.id}
                  onClick={() => remove(review)}
                  className="btn btn-outline text-rose-deep disabled:opacity-60"
                >
                  Xóa
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
