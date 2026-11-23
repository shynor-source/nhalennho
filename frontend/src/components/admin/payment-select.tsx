"use client";

import { useState } from "react";

import { adminApi } from "@/lib/api-client";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";

const PAYMENT_OPTIONS = [
  { value: "unpaid", label: "Chưa thanh toán" },
  { value: "submitted", label: "Khách báo đã chuyển" },
  { value: "paid", label: "Đã thanh toán" },
];

export function PaymentSelect({
  id,
  current,
  onChanged,
}: {
  id: number;
  current: string;
  onChanged?: (status: string) => void;
}) {
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: string) {
    setValue(next);
    setSaving(true);
    setError(null);
    const res = await adminApi.updateOrderPayment(id, next);
    setSaving(false);
    if (!res.ok) {
      setError(res.data.error ?? "Cập nhật thất bại.");
      setValue(current);
      return;
    }
    onChanged?.(next);
  }

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`payment-${id}`}>
        Trạng thái thanh toán
      </label>
      <select
        id={`payment-${id}`}
        value={value}
        disabled={saving}
        onChange={(e) => change(e.target.value)}
        className="h-9 rounded-control border border-line bg-white px-2 text-sm text-ink focus-visible:border-rose-soft disabled:opacity-60"
      >
        {PAYMENT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <span className="text-xs text-rose-deep" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

// Keep the import used even if callers only need labels.
export const adminOrderStatusLabels = ORDER_STATUS_LABELS;
