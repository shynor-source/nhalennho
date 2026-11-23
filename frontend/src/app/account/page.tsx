"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PasswordForm } from "@/components/password-form";
import { customerApi, setCsrfToken } from "@/lib/api-client";
import { formatDate, formatVND } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/order-status";
import type { AccountOrder } from "@/lib/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default function AccountPage() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready">("checking");
  const [customer, setCustomer] = useState<{
    fullName: string;
    email: string;
    phone: string;
  } | null>(null);
  const [orders, setOrders] = useState<AccountOrder[] | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    customerApi.me().then((me) => {
      if (!active) return;
      if (!(me.ok && me.data.authenticated)) {
        router.replace("/account/login?next=/account");
        return;
      }
      setCsrfToken(me.data.csrfToken ?? null);
      setCustomer(me.data.customer ?? null);
      setState("ready");
      customerApi.listOrders().then((res) => {
        if (!active) return;
        setOrders(res.ok ? (res.data.items as AccountOrder[]) : []);
      });
    });
    return () => {
      active = false;
    };
  }, [router]);

  async function onLogout() {
    setLoggingOut(true);
    await customerApi.logout();
    setCsrfToken(null);
    router.replace("/");
  }

  if (state !== "ready") {
    return (
      <div className="container-page py-16">
        <p className="text-sm text-muted">Đang kiểm tra đăng nhập…</p>
      </div>
    );
  }

  return (
    <div className="container-page py-12 md:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl text-ink sm:text-4xl">Tài khoản của tôi</h1>
        <p className="mt-3 text-muted">
          Quản lý thông tin cá nhân và theo dõi đơn hàng của bạn.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-card border border-line bg-white p-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-blush/70 font-display text-lg text-rose-deep"
            >
              {initials(customer?.fullName ?? "")}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-lg text-ink">
                {customer?.fullName}
              </p>
              <p className="truncate text-sm text-muted">{customer?.email}</p>
            </div>
          </div>

          {customer?.phone ? (
            <p className="mt-4 text-sm text-muted">
              Số điện thoại:{" "}
              <span className="text-ink">{customer.phone}</span>
            </p>
          ) : null}

          <div className="mt-5 border-t border-line pt-4">
            <nav aria-label="Liên kết tài khoản">
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/wishlist"
                    className="text-muted transition-colors hover:text-rose-deep"
                  >
                    Sản phẩm yêu thích
                  </Link>
                </li>
                <li>
                  <Link
                    href="/custom-order"
                    className="text-muted transition-colors hover:text-rose-deep"
                  >
                    Yêu cầu đặt làm riêng
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="btn btn-outline mt-5 w-full disabled:opacity-60"
          >
            {loggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
        </aside>

        <section className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl text-ink">
                Đơn hàng của tôi
              </h2>
              <p className="mt-1 text-sm text-muted">
                Theo dõi trạng thái đơn và thanh toán.
              </p>
            </div>
            <Link
              href="/categories"
              className="text-sm text-rose-deep underline-offset-4 hover:underline"
            >
              Tiếp tục mua sắm
            </Link>
          </div>

          {orders === null ? (
            <p className="mt-6 text-sm text-muted">Đang tải đơn hàng…</p>
          ) : orders.length === 0 ? (
            <div className="mt-6 rounded-card border border-line bg-white p-10 text-center">
              <p className="text-muted">Bạn chưa có đơn hàng nào.</p>
              <Link href="/categories" className="btn btn-primary mt-5">
                Xem sản phẩm
              </Link>
            </div>
          ) : (
            <ul className="mt-6 grid gap-3">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/account/orders/${order.code}`}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-white p-5 transition-colors hover:border-rose-soft"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{order.code}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatDate(order.createdAt)} ·{" "}
                        {PAYMENT_STATUS_LABELS[order.paymentStatus] ??
                          order.paymentStatus}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="rounded-full border border-rose-soft bg-blush/40 px-3 py-1 text-xs text-rose-deep">
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                      <span className="text-sm font-medium text-ink">
                        {formatVND(order.totalVnd)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <section className="mt-8 rounded-card border border-line bg-white p-6">
            <h2 className="font-display text-lg text-ink">Đổi mật khẩu</h2>
            <p className="mt-1 text-sm text-muted">
              Nên đổi mật khẩu định kỳ. Các thiết bị khác sẽ bị đăng xuất sau
              khi đổi.
            </p>
            <div className="mt-5 max-w-md">
              <PasswordForm
                onSubmit={async (currentPassword, newPassword) => {
                  const res = await customerApi.changePassword(
                    currentPassword,
                    newPassword,
                  );
                  return res.ok
                    ? { ok: true }
                    : { ok: false, error: res.data.error };
                }}
              />
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
