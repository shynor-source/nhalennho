"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminNoteEditor } from "@/components/admin/admin-note-editor";
import { PaymentSelect } from "@/components/admin/payment-select";
import { StatusSelect } from "@/components/admin/status-select";
import { adminApi } from "@/lib/api-client";
import { describeOptions } from "@/lib/cart";
import { formatDate, formatVND } from "@/lib/format";
import type { AdminOrder } from "@/lib/types";

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const invalidId = !Number.isFinite(id);
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invalidId) return;
    let active = true;
    adminApi.getOrder(id).then((res) => {
      if (!active) return;
      if (res.ok) setOrder(res.data as AdminOrder);
      else setError(res.data.error ?? "Không tìm thấy đơn hàng.");
    });
    return () => {
      active = false;
    };
  }, [id, invalidId]);

  async function onDelete() {
    if (!order) return;
    if (!window.confirm(`Xóa đơn “${order.code}”?`)) return;
    const res = await adminApi.deleteOrder(order.id);
    if (!res.ok) {
      setError(res.data.error ?? "Xóa thất bại.");
      return;
    }
    router.push("/admin/orders");
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl text-ink">Chi tiết đơn hàng</h1>
        <Link href="/admin/orders" className="text-sm text-rose-deep hover:underline">
          ← Danh sách
        </Link>
      </div>

      {invalidId ? (
        <p className="mt-6 text-sm text-rose-deep" role="alert">
          ID không hợp lệ.
        </p>
      ) : error ? (
        <p className="mt-6 text-sm text-rose-deep" role="alert">
          {error}
        </p>
      ) : !order ? (
        <p className="mt-6 text-sm text-muted">Đang tải…</p>
      ) : (
        <div className="mt-6 grid gap-6">
          <section className="rounded-card border border-line bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted">Mã đơn</p>
                <p className="font-display text-xl text-ink">{order.code}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusSelect
                  id={order.id}
                  current={order.status}
                  kind="orders"
                  onChanged={(s) => setOrder({ ...order, status: s })}
                />
                <PaymentSelect
                  id={order.id}
                  current={order.paymentStatus}
                  onChanged={(s) => setOrder({ ...order, paymentStatus: s })}
                />
              </div>
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted">Người nhận</dt>
                <dd className="text-ink">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Số điện thoại</dt>
                <dd className="text-ink">{order.phone}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-muted">Địa chỉ</dt>
                <dd className="text-ink">{order.address}</dd>
              </div>
              {order.note ? (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted">Ghi chú</dt>
                  <dd className="text-ink">{order.note}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-sm text-muted">Ngày gửi</dt>
                <dd className="text-ink">{formatDate(order.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Đồng ý xử lý dữ liệu</dt>
                <dd className="text-ink">
                  {order.consentGiven ? "Có" : "Không"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Hình thức thanh toán</dt>
                <dd className="text-ink">
                  {order.paymentMethod === "cod"
                    ? "Ship COD"
                    : "Chuyển khoản QR"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Tổng tiền</dt>
                <dd className="text-ink">{formatVND(order.totalVnd)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-card border border-line bg-white p-6">
            <h2 className="font-display text-lg text-ink">Sản phẩm</h2>
            {order.items && order.items.length > 0 ? (
              <ul className="mt-4 divide-y divide-line">
                {order.items.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-4 py-3 text-sm"
                  >
                    <span className="text-ink">
                      {item.productName}
                      {item.options && item.options.length > 0 ? (
                        <span className="block text-xs text-muted">
                          {describeOptions(item.options)}
                        </span>
                      ) : null}
                      <span className="text-muted"> × {item.quantity}</span>
                    </span>
                    <span className="text-muted">
                      {formatVND(item.unitPriceVnd * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">Không có sản phẩm.</p>
            )}
          </section>

          <AdminNoteEditor
            initialNote={order.adminNote ?? ""}
            onSave={async (note) => {
              const res = await adminApi.updateOrderNote(order.id, note);
              if (res.ok) setOrder({ ...order, adminNote: note });
              return res.ok ? { ok: true } : { ok: false, error: res.data.error };
            }}
          />

          <div>
            <button
              type="button"
              onClick={onDelete}
              className="btn btn-outline text-rose-deep"
            >
              Xóa đơn hàng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
