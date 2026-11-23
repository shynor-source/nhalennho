"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminNoteEditor } from "@/components/admin/admin-note-editor";
import { StatusSelect } from "@/components/admin/status-select";
import { adminApi } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { AdminCustomOrder } from "@/lib/types";

export default function AdminCustomOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const invalidId = !Number.isFinite(id);
  const [order, setOrder] = useState<AdminCustomOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invalidId) return;
    let active = true;
    adminApi.getCustomOrder(id).then((res) => {
      if (!active) return;
      if (res.ok) setOrder(res.data as AdminCustomOrder);
      else setError(res.data.error ?? "Không tìm thấy yêu cầu.");
    });
    return () => {
      active = false;
    };
  }, [id, invalidId]);

  async function onDelete() {
    if (!order) return;
    if (!window.confirm(`Xóa yêu cầu “${order.code}”?`)) return;
    const res = await adminApi.deleteCustomOrder(order.id);
    if (!res.ok) {
      setError(res.data.error ?? "Xóa thất bại.");
      return;
    }
    router.push("/admin/custom-orders");
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl text-ink">Chi tiết yêu cầu đặt làm</h1>
        <Link
          href="/admin/custom-orders"
          className="text-sm text-rose-deep hover:underline"
        >
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
        <section className="mt-6 rounded-card border border-line bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Mã yêu cầu</p>
              <p className="font-display text-xl text-ink">{order.code}</p>
            </div>
            <StatusSelect
              id={order.id}
              current={order.status}
              kind="custom-orders"
              onChanged={(s) => setOrder({ ...order, status: s })}
            />
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted">Khách</dt>
              <dd className="text-ink">{order.customerName}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Số điện thoại</dt>
              <dd className="text-ink">{order.phone}</dd>
            </div>
            {order.address ? (
              <div className="sm:col-span-2">
                <dt className="text-sm text-muted">Địa chỉ</dt>
                <dd className="text-ink">{order.address}</dd>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted">Mô tả yêu cầu</dt>
              <dd className="whitespace-pre-line text-ink">{order.note}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Ngày gửi</dt>
              <dd className="text-ink">{formatDate(order.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Đồng ý xử lý dữ liệu</dt>
              <dd className="text-ink">{order.consentGiven ? "Có" : "Không"}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={onDelete}
            className="btn btn-outline mt-6 text-rose-deep"
          >
            Xóa yêu cầu
          </button>

          <div className="mt-6 border-t border-line pt-6">
            <AdminNoteEditor
              initialNote={order.adminNote ?? ""}
              onSave={async (note) => {
                const res = await adminApi.updateCustomOrderNote(order.id, note);
                if (res.ok) setOrder({ ...order, adminNote: note });
                return res.ok
                  ? { ok: true }
                  : { ok: false, error: res.data.error };
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
