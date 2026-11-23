"use client";

import { useState } from "react";

import { adminApi } from "@/lib/api-client";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/order-status";
import type { OrderStatus } from "@/lib/types";

type Props = {
  id: number;
  current: OrderStatus;
  kind: "orders" | "custom-orders";
  onChanged?: (status: OrderStatus) => void;
};

export function StatusSelect({ id, current, kind, onChanged }: Props) {
  const [value, setValue] = useState<OrderStatus>(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: OrderStatus) {
    setValue(next);
    setSaving(true);
    setError(null);
    const res =
      kind === "orders"
        ? await adminApi.updateOrderStatus(id, next)
        : await adminApi.updateCustomOrderStatus(id, next);
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
      <label className="sr-only" htmlFor={`status-${kind}-${id}`}>
        Trạng thái
      </label>
      <select
        id={`status-${kind}-${id}`}
        value={value}
        disabled={saving}
        onChange={(e) => change(e.target.value as OrderStatus)}
        className="h-9 rounded-control border border-line bg-white px-2 text-sm text-ink focus-visible:border-rose-soft disabled:opacity-60"
      >
        {ORDER_STATUSES.map((status) => (
          <option key={status} value={status}>
            {ORDER_STATUS_LABELS[status]}
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
