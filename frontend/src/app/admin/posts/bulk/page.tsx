"use client";

import { useState } from "react";

import { adminApi } from "@/lib/api-client";

const fieldClass =
  "h-11 w-full rounded-control border border-line bg-white px-3 text-sm text-ink focus-visible:border-rose-soft";

type ParsedPost = { title: string; content: string; excerpt: string };

function parseBlocks(raw: string): ParsedPost[] {
  return raw
    .split(/\n\s*---\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n");
      const title = (lines.shift() ?? "").trim();
      const content = lines.join("\n").trim();
      const excerpt = content.replace(/\s+/g, " ").slice(0, 160);
      return { title, content, excerpt };
    })
    .filter((p) => p.title.length > 0);
}

export default function BulkPostsPage() {
  const [raw, setRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const parsed = parseBlocks(raw);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const data = new FormData(event.currentTarget);
    const startAtRaw = String(data.get("startAt") ?? "");
    const intervalHours = Number(data.get("intervalHours") ?? 24);

    if (parsed.length === 0) {
      setError("Chưa có bài viết nào. Mỗi bài bắt đầu bằng tiêu đề ở dòng đầu.");
      return;
    }
    if (!startAtRaw) {
      setError("Vui lòng chọn ngày giờ bắt đầu đăng.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    const res = await adminApi.bulkCreatePosts({
      items: parsed,
      startAt: new Date(startAtRaw).toISOString(),
      intervalHours,
    });

    setSubmitting(false);
    if (!res.ok) {
      setError(res.data.error ?? "Tạo hàng loạt thất bại.");
      return;
    }
    setResult(res.data.message);
    setRaw("");
  }

  return (
    <div>
      <h1 className="text-2xl text-ink">Đăng bài hàng loạt</h1>
      <p className="mt-2 text-sm text-muted">
        Dán nhiều bài cùng lúc, hệ thống sẽ tự đăng dần theo lịch. Mỗi bài bắt đầu
        bằng <strong>dòng tiêu đề</strong>, phần còn lại là nội dung. Ngăn cách
        các bài bằng một dòng <code>---</code>.
      </p>

      <form
        method="post"
        onSubmit={onSubmit}
        className="mt-6 grid gap-4 rounded-card border border-line bg-white p-6"
      >
        <div>
          <label htmlFor="bulk-blocks" className="mb-1 block text-sm text-muted">
            Nội dung các bài
          </label>
          <textarea
            id="bulk-blocks"
            name="blocks"
            rows={12}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"Chọn quà len làm quà tặng\nNội dung bài viết…\n\n---\n\nBảo quản đồ len bền đẹp\nNội dung bài viết…"}
            className="w-full rounded-control border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:border-rose-soft"
          />
          <p className="mt-1 text-xs text-muted">
            Đã nhận diện <strong>{parsed.length}</strong> bài.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="bulk-start" className="mb-1 block text-sm text-muted">
              Bắt đầu đăng từ
            </label>
            <input
              id="bulk-start"
              name="startAt"
              type="datetime-local"
              required
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="bulk-interval" className="mb-1 block text-sm text-muted">
              Cách nhau (giờ)
            </label>
            <input
              id="bulk-interval"
              name="intervalHours"
              type="number"
              min={1}
              max={720}
              defaultValue={24}
              required
              className={fieldClass}
            />
          </div>
        </div>

        {error ? (
          <p className="text-sm text-rose-deep" role="alert">
            {error}
          </p>
        ) : null}
        {result ? (
          <p className="rounded-control border border-rose-soft bg-blush/40 px-3 py-2 text-sm text-ink" aria-live="polite">
            {result}
          </p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-60"
          >
            {submitting ? "Đang tạo…" : `Tạo và hẹn giờ ${parsed.length} bài`}
          </button>
        </div>
      </form>
    </div>
  );
}
