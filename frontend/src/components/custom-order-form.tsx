"use client";

import { useState } from "react";

import { publicApi } from "@/lib/api-client";

const fieldClass =
  "h-11 w-full rounded-control border border-line bg-white px-3 text-sm text-ink focus-visible:border-rose-soft";

export function CustomOrderForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; message: string } | null>(
    null,
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    setError(null);

    const res = await publicApi.createCustomOrder({
      customerName: String(data.get("customerName") ?? ""),
      phone: String(data.get("phone") ?? ""),
      address: String(data.get("address") ?? ""),
      note: String(data.get("note") ?? ""),
      consent: data.get("consent") === "on",
    });

    setSubmitting(false);
    if (!res.ok) {
      setError(res.data.error ?? "Gửi yêu cầu thất bại, vui lòng thử lại.");
      return;
    }
    setResult(res.data);
    form.reset();
  }

  if (result) {
    return (
      <div
        className="rounded-card border border-rose-soft bg-blush/40 p-6"
        aria-live="polite"
      >
        <p className="font-display text-lg text-ink">Đã nhận yêu cầu đặt làm</p>
        <p className="mt-1 text-sm text-muted">{result.message}</p>
        <p className="mt-2 text-sm text-ink">
          Mã yêu cầu: <span className="font-medium">{result.code}</span>
        </p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="btn btn-outline mt-4"
        >
          Gửi yêu cầu khác
        </button>
      </div>
    );
  }

  return (
    <form
      method="post" onSubmit={onSubmit}
      className="rounded-card border border-line bg-white p-6"
      aria-label="Yêu cầu đặt làm riêng"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="co-name" className="mb-1 block text-sm text-muted">
            Họ và tên
          </label>
          <input
            id="co-name"
            name="customerName"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="co-phone" className="mb-1 block text-sm text-muted">
            Số điện thoại
          </label>
          <input
            id="co-phone"
            name="phone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            className={fieldClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="co-address" className="mb-1 block text-sm text-muted">
            Địa chỉ (nếu cần giao hàng)
          </label>
          <input
            id="co-address"
            name="address"
            autoComplete="street-address"
            className={fieldClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="co-note" className="mb-1 block text-sm text-muted">
            Bạn muốn đặt làm gì?
          </label>
          <textarea
            id="co-note"
            name="note"
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            placeholder="Ví dụ: móc một chú gấu màu hồng, cao khoảng 15cm…"
            className="w-full rounded-control border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:border-rose-soft"
          />
        </div>
      </div>

      {/* Consent text is a placeholder pending the owner-provided wording. */}
      <label className="mt-4 flex items-start gap-3 text-sm text-muted">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-1 size-4 rounded border-line text-rose-deep"
        />
        <span>
          Tôi đồng ý để Nhà Len Nhỏ liên hệ và xử lý thông tin cá nhân nhằm thực
          hiện yêu cầu đặt làm.
        </span>
      </label>

      {error ? (
        <p className="mt-4 text-sm text-rose-deep" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="btn btn-primary mt-5 w-full disabled:opacity-60 sm:w-auto"
      >
        {submitting ? "Đang gửi…" : "Gửi yêu cầu đặt làm"}
      </button>
    </form>
  );
}
