"use client";

import { useState } from "react";

import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { adminApi } from "@/lib/api-client";
import type { AdminPost } from "@/lib/types";

const fieldClass =
  "h-11 w-full rounded-control border border-line bg-white px-3 text-sm text-ink focus-visible:border-rose-soft";

/** Format an ISO timestamp for a <input type="datetime-local"> value. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostForm({
  initial,
  onSaved,
}: {
  initial?: AdminPost;
  onSaved?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);
  const [contentHtml, setContentHtml] = useState(initial?.content ?? "");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    setOkMessage(null);

    const publishedRaw = String(data.get("publishedAt") ?? "");
    const payload = {
      title: String(data.get("title") ?? "").trim(),
      excerpt: String(data.get("excerpt") ?? ""),
      content: contentHtml,
      isPublished: data.get("isPublished") === "on",
      publishedAt: publishedRaw ? new Date(publishedRaw).toISOString() : null,
    };

    const res = initial
      ? await adminApi.updatePost(initial.id, payload)
      : await adminApi.createPost(payload);

    setSubmitting(false);
    if (!res.ok) {
      setError(res.data.error ?? "Lưu bài viết thất bại.");
      return;
    }
    setOkMessage("Đã lưu bài viết.");
    if (onSaved) onSaved();
  }

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className="grid gap-4 rounded-card border border-line bg-white p-6"
    >
      <div>
        <label htmlFor="post-title" className="mb-1 block text-sm text-muted">
          Tiêu đề
        </label>
        <input
          id="post-title"
          name="title"
          required
          maxLength={200}
          defaultValue={initial?.title ?? ""}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="post-excerpt" className="mb-1 block text-sm text-muted">
          Mô tả ngắn (hiển thị ở danh sách)
        </label>
        <input
          id="post-excerpt"
          name="excerpt"
          maxLength={400}
          defaultValue={initial?.excerpt ?? ""}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="post-content" className="mb-1 block text-sm text-muted">
          Nội dung
        </label>
        <RichTextEditor
          initialContent={initial?.content ?? ""}
          onChange={setContentHtml}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="post-published" className="mb-1 block text-sm text-muted">
            Ngày giờ đăng (để trống = đăng ngay khi bật)
          </label>
          <input
            id="post-published"
            name="publishedAt"
            type="datetime-local"
            defaultValue={toLocalInput(initial?.publishedAt)}
            className={fieldClass}
          />
        </div>
        <label className="flex items-center gap-3 self-end text-sm text-ink">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={initial ? initial.isPublished : true}
            className="size-4 rounded border-line text-rose-deep"
          />
          Xuất bản (hẹn giờ nếu ngày ở tương lai)
        </label>
      </div>

      {error ? (
        <p className="text-sm text-rose-deep" role="alert">
          {error}
        </p>
      ) : null}
      {okMessage ? (
        <p className="text-sm text-rose-deep" aria-live="polite">
          {okMessage}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary disabled:opacity-60"
        >
          {submitting ? "Đang lưu…" : "Lưu bài viết"}
        </button>
      </div>
    </form>
  );
}
