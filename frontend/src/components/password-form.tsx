"use client";

import { useState } from "react";

type Props = {
  onSubmit: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: boolean; error?: string }>;
};

const fieldClass =
  "h-11 w-full rounded-control border border-line bg-white px-3 text-sm text-ink focus-visible:border-rose-soft";

/** Change password form shared by customers and admins. */
export function PasswordForm({ onSubmit }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    setMessage(null);
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setBusy(true);
    const res = await onSubmit(currentPassword, newPassword);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Đổi mật khẩu thất bại.");
      return;
    }
    form.reset();
    setMessage("Đã đổi mật khẩu.");
  }

  return (
    <form method="post" onSubmit={handle} className="grid gap-4">
      <div>
        <label htmlFor="pw-current" className="mb-1 block text-sm text-muted">
          Mật khẩu hiện tại
        </label>
        <input
          id="pw-current"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="pw-new" className="mb-1 block text-sm text-muted">
          Mật khẩu mới (tối thiểu 8 ký tự)
        </label>
        <input
          id="pw-new"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={200}
          required
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="pw-confirm" className="mb-1 block text-sm text-muted">
          Nhập lại mật khẩu mới
        </label>
        <input
          id="pw-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={200}
          required
          className={fieldClass}
        />
      </div>
      {message ? (
        <p className="text-sm text-rose-deep" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-rose-deep" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary disabled:opacity-60"
        >
          {busy ? "Đang đổi…" : "Đổi mật khẩu"}
        </button>
      </div>
    </form>
  );
}
