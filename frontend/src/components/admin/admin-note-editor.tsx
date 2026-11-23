"use client";

import { useState } from "react";

type Props = {
  initialNote?: string;
  onSave: (note: string) => Promise<{ ok: boolean; error?: string }>;
};

/**
 * Internal admin note for an order or custom request. Only staff can see it.
 * The server enforces the same 2000-character limit.
 */
export function AdminNoteEditor({ initialNote = "", onSave }: Props) {
  const [note, setNote] = useState(initialNote);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    const res = await onSave(note);
    setBusy(false);
    if (res.ok) setMessage("Đã lưu ghi chú nội bộ.");
    else setError(res.error ?? "Lưu thất bại.");
  }

  return (
    <section className="rounded-card border border-line bg-white p-6">
      <h2 className="font-display text-lg text-ink">Ghi chú nội bộ</h2>
      <p className="mt-1 text-sm text-muted">
        Chỉ quản trị viên thấy. Khách hàng không thấy nội dung này.
      </p>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={4}
        maxLength={2000}
        className="mt-4 w-full rounded-control border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:border-rose-soft"
        placeholder="Ví dụ: đã nhận chuyển khoản, chờ len về, khách dặn giao buổi chiều…"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn btn-primary disabled:opacity-60"
        >
          {busy ? "Đang lưu…" : "Lưu ghi chú"}
        </button>
        {message ? (
          <span className="text-sm text-rose-deep" role="status">
            {message}
          </span>
        ) : null}
        {error ? (
          <span className="text-sm text-rose-deep" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </section>
  );
}
