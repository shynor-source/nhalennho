"use client";

import { useEffect, useState } from "react";

import { adminApi } from "@/lib/api-client";
import { formatDate, formatVND } from "@/lib/format";
import type { AdminCustomer } from "@/lib/types";

export default function AdminCustomersPage() {
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [items, setItems] = useState<AdminCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminCustomer | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    adminApi
      .listCustomers(applied ? `?q=${encodeURIComponent(applied)}` : "")
      .then((res) => {
        if (!active) return;
        setLoading(false);
        if (res.ok) {
          const data = res.data as { items: AdminCustomer[]; total: number };
          setItems(data.items);
          setTotal(data.total);
        } else {
          setError(res.data.error ?? "Không tải được danh sách khách hàng.");
        }
      });
    return () => {
      active = false;
    };
  }, [applied]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await adminApi.updateCustomer(editing.id, {
      fullName: String(data.get("fullName") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.data.error ?? "Cập nhật thất bại.");
      return;
    }
    setItems((current) =>
      current.map((c) =>
        c.id === editing.id
          ? {
              ...c,
              fullName: String(data.get("fullName") ?? "").trim(),
              phone: String(data.get("phone") ?? "").trim(),
            }
          : c,
      ),
    );
    setMessage(`Đã cập nhật thông tin của ${editing.email}.`);
    setEditing(null);
  }

  async function remove(customer: AdminCustomer) {
    const ok = window.confirm(
      `Xóa tài khoản ${customer.email}? Đơn hàng cũ sẽ được ẩn danh (giữ số liệu doanh thu) nhưng thông tin cá nhân sẽ bị xoá. Hành động này không hoàn tác.`,
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await adminApi.deleteCustomer(customer.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.data.error ?? "Xóa thất bại.");
      return;
    }
    setItems((current) => current.filter((c) => c.id !== customer.id));
    setTotal((n) => Math.max(0, n - 1));
    setMessage(`Đã xóa dữ liệu cá nhân của ${customer.email}.`);
  }

  return (
    <div>
      <h1 className="text-2xl text-ink">Khách hàng</h1>
      <p className="mt-1 text-sm text-muted">
        Tra cứu khách, sửa thông tin liên hệ hoặc xóa dữ liệu cá nhân khi khách
        yêu cầu.
      </p>

      <form
        method="get"
        className="mt-5 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setLoading(true);
          setApplied(query.trim());
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm theo email, tên hoặc số điện thoại"
          className="h-11 min-w-[240px] flex-1 rounded-control border border-line bg-white px-3 text-sm text-ink focus-visible:border-rose-soft"
        />
        <button type="submit" className="btn btn-primary">
          Tìm
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{total} khách hàng</p>
        {applied ? (
          <button
            type="button"
            className="text-sm text-rose-deep hover:underline"
            onClick={() => {
              setQuery("");
              setLoading(true);
              setApplied("");
            }}
          >
            Xóa bộ lọc
          </button>
        ) : null}
      </div>

      {message ? (
        <p className="mt-4 text-sm text-rose-deep" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-rose-deep" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-muted">Đang tải…</p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-card border border-line bg-white p-10 text-center">
          <p className="text-muted">Không có khách hàng phù hợp.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Khách</th>
                <th className="px-4 py-3 font-medium">Liên hệ</th>
                <th className="px-4 py-3 font-medium">Đơn</th>
                <th className="px-4 py-3 font-medium">Đã chi</th>
                <th className="px-4 py-3 font-medium">Tham gia</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3">
                    <p className="text-ink">{customer.fullName || "—"}</p>
                    <p className="text-xs text-muted">{customer.email}</p>
                  </td>
                  <td className="px-4 py-3 text-ink">{customer.phone || "—"}</td>
                  <td className="px-4 py-3 text-ink">{customer.orderCount}</td>
                  <td className="px-4 py-3 text-ink">
                    {formatVND(customer.totalSpent)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(customer.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(customer);
                          setMessage(null);
                          setError(null);
                        }}
                        className="text-sm text-rose-deep hover:underline"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(customer)}
                        className="text-sm text-rose-deep hover:underline"
                      >
                        Xóa dữ liệu
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded-card border border-line bg-white p-6">
            <h2 className="font-display text-lg text-ink">
              Sửa thông tin khách
            </h2>
            <p className="mt-1 text-sm text-muted">{editing.email}</p>
            <form method="post" onSubmit={saveProfile} className="mt-4 grid gap-4">
              <div>
                <label htmlFor="cust-name" className="mb-1 block text-sm text-muted">
                  Họ và tên
                </label>
                <input
                  id="cust-name"
                  name="fullName"
                  defaultValue={editing.fullName}
                  required
                  minLength={2}
                  maxLength={120}
                  className="h-11 w-full rounded-control border border-line bg-white px-3 text-sm text-ink focus-visible:border-rose-soft"
                />
              </div>
              <div>
                <label htmlFor="cust-phone" className="mb-1 block text-sm text-muted">
                  Số điện thoại
                </label>
                <input
                  id="cust-phone"
                  name="phone"
                  defaultValue={editing.phone}
                  required
                  minLength={8}
                  maxLength={20}
                  className="h-11 w-full rounded-control border border-line bg-white px-3 text-sm text-ink focus-visible:border-rose-soft"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="btn btn-outline"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn btn-primary disabled:opacity-60"
                >
                  {busy ? "Đang lưu…" : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
