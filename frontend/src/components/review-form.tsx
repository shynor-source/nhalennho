"use client";

import { useState } from "react";

import { publicApi } from "@/lib/api-client";

const fieldClass =
  "h-11 w-full rounded-control border border-line bg-white px-3 text-sm text-ink focus-visible:border-rose-soft";

export function ReviewForm({ slug }: { slug: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    setError(null);

    const res = await publicApi.createReview(slug, {
      authorName: String(data.get("authorName") ?? ""),
      rating: Number(data.get("rating") ?? 5),
      body: String(data.get("body") ?? ""),
    });

    setSubmitting(false);
    if (!res.ok) {
      setError(res.data.error ?? "Gửi đánh giá thất bại, vui lòng thử lại.");
      return;
    }
    setMessage(res.data.message);
    form.reset();
  }

  return (
    <form
      method="post" onSubmit={onSubmit}
      className="rounded-card border border-line bg-white p-5"
      aria-label="Viết đánh giá"
    >
      <h3 className="font-display text-lg text-ink">Viết đánh giá</h3>
      {message ? (
        <p className="mt-3 text-sm text-rose-deep" aria-live="polite">
          {message}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rv-name" className="mb-1 block text-sm text-muted">
            Tên hiển thị
          </label>
          <input
            id="rv-name"
            name="authorName"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="rv-rating" className="mb-1 block text-sm text-muted">
            Số sao
          </label>
          <select id="rv-rating" name="rating" defaultValue="5" className={fieldClass}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} sao
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="rv-body" className="mb-1 block text-sm text-muted">
            Nhận xét
          </label>
          <textarea
            id="rv-body"
            name="body"
            rows={3}
            maxLength={1000}
            className="w-full rounded-control border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:border-rose-soft"
          />
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-rose-deep" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="btn btn-outline mt-4 disabled:opacity-60"
      >
        {submitting ? "Đang gửi…" : "Gửi đánh giá"}
      </button>
    </form>
  );
}
