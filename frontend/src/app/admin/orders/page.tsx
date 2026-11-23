"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StatusSelect } from "@/components/admin/status-select";
import { adminApi } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/order-status";
import type { AdminOrder, OrderStatus } from "@/lib/types";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [error, setError] = useState<string | null>(null);

  const query = status ? `status=${status}&per_page=100` : "per_page=100";

  async function refresh() {
    const res = await adminApi.listOrders(query);
    if (res.ok) {
      setOrders(res.data.items as AdminOrder[]);
      setError(null);
    } else {
      setError("Không tải được danh sách đơn hàng.");
    }
  }

  useEffect(() => {
    let active = true;
    const current = status ? `status=${status}&per_page=100` : "per_page=100";
    adminApi.listOrders(current).then((res) => {
      if (!active) return;
      if (res.ok) {
        setOrders(res.data.items as AdminOrder[]);
        setError(null);
      } else {
        setError("Không tải được danh sách đơn hàng.");
      }
    });
    return () => {
      active = false;
    };
  }, [status]);

  async function onDelete(order: AdminOrder) {
    if (!window.confirm(`Xóa đơn “${order.code}”?`)) return;
    const res = await adminApi.deleteOrder(order.id);
    if (!res.ok) {
      setError(res.data.error ?? "Xóa thất bại.");
      return;
    }
    await refresh();
  }

  const loading = orders === null;
  const list = orders ?? [];

  return (
    <div>
      <h1 className="text-2xl text-ink">Đơn hàng</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label htmlFor="filter-status" className="text-sm text-muted">
          Lọc theo trạng thái
        </label>
        <select
          id="filter-status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | "");
            setOrders(null);
          }}
          className="h-10 rounded-control border border-line bg-white px-3 text-sm text-ink"
        >
          <option value="">Tất cả</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-rose-deep" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-muted">Đang tải…</p>
      ) : list.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Chưa có đơn hàng nào.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Danh sách đơn hàng</caption>
            <thead className="border-b border-line text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Mã
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Khách
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Ngày
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Trạng thái
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((order) => (
                <tr key={order.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-rose-deep hover:underline"
                    >
                      {order.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {order.customerName}
                    <span className="block text-xs text-muted">
                      {order.phone}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusSelect
                      id={order.id}
                      current={order.status}
                      kind="orders"
                      onChanged={() => void refresh()}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onDelete(order)}
                      className="text-rose-deep hover:underline"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
