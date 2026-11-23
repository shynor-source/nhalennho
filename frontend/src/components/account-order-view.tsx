"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

import { PaymentBlock } from "@/components/payment-block";
import { customerApi, setCsrfToken } from "@/lib/api-client";
import { formatDate, formatVND } from "@/lib/format";
import { describeOptions } from "@/lib/cart";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/order-status";
import { getSiteConfig } from "@/lib/site-config";
import type { AccountOrder, PaymentInfo } from "@/lib/types";

export function AccountOrderView({ code }: { code: string }) {
  const router = useRouter();
  const site = getSiteConfig();
  const [order, setOrder] = useState<AccountOrder | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    customerApi.me().then((me) => {
      if (!active) return;
      if (!(me.ok && me.data.authenticated)) {
        router.replace(`/account/login?next=/account/orders/${code}`);
        return;
      }
      setCsrfToken(me.data.csrfToken ?? null);
      customerApi.getOrder(code).then((res) => {
        if (!active) return;
        setLoading(false);
        if (!res.ok) {
          setError(res.data.error ?? "Không tải được đơn hàng.");
          return;
        }
        const data = res.data as { order: AccountOrder; payment: PaymentInfo };
        setOrder(data.order);
        setPayment(data.payment);
      });
    });
    return () => {
      active = false;
    };
  }, [code, router]);

  async function onPaymentSubmitted() {
    if (submitting) return;
    setSubmitting(true);
    const res = await customerApi.paymentSubmitted(code);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.data.error ?? "Chưa ghi nhận được, vui lòng thử lại.");
      return;
    }
    setNotice(res.data.message);
    setOrder((prev) => (prev ? { ...prev, paymentStatus: "submitted" } : prev));
  }

  if (loading) {
    return <p className="text-sm text-muted">Đang tải đơn hàng…</p>;
  }

  if (error || !order || !payment) {
    return (
      <div className="rounded-card border border-line bg-white p-8">
        <p className="text-rose-deep" role="alert">
          {error ?? "Không tìm thấy đơn hàng."}
        </p>
        <Link href="/account" className="btn btn-outline mt-4">
          ← Về quản lý đơn hàng
        </Link>
      </div>
    );
  }

  const isCod = order.paymentMethod === "cod";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl text-ink">Đơn {order.code}</h1>
          <p className="mt-1 text-sm text-muted">
            Đặt ngày {formatDate(order.createdAt)}
          </p>
        </div>
        <Link href="/account" className="text-sm text-rose-deep hover:underline">
          ← Danh sách đơn
        </Link>
      </div>

      <section className="rounded-card border border-line bg-white p-6">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Người nhận</dt>
            <dd className="text-ink">{order.customerName}</dd>
          </div>
          <div>
            <dt className="text-muted">Số điện thoại</dt>
            <dd className="text-ink">{order.phone}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted">Địa chỉ</dt>
            <dd className="text-ink">{order.address}</dd>
          </div>
          {order.note ? (
            <div className="sm:col-span-2">
              <dt className="text-muted">Ghi chú</dt>
              <dd className="text-ink">{order.note}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted">Trạng thái đơn</dt>
            <dd className="text-rose-deep">
              {ORDER_STATUS_LABELS[order.status] ?? order.status}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Thanh toán</dt>
            <dd className="text-ink">
              {PAYMENT_METHOD_LABELS[order.paymentMethod] ??
                order.paymentMethod}{" "}
              ·{" "}
              {PAYMENT_STATUS_LABELS[order.paymentStatus] ??
                order.paymentStatus}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-card border border-line bg-white p-6">
        <h2 className="font-display text-lg text-ink">Sản phẩm</h2>
        <ul className="mt-4 divide-y divide-line text-sm">
          {(order.items ?? []).map((item, index) => (
            <li
              key={index}
              className="flex items-center justify-between gap-3 py-2"
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
        <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
          <span className="text-muted">Tổng</span>
          <span className="font-medium text-ink">{formatVND(order.totalVnd)}</span>
        </div>
      </section>

      {isCod ? (
        <section className="rounded-card border border-line bg-blush/40 p-6">
          <p className="text-sm text-muted">
            Đơn của bạn là Ship COD. Shop sẽ liên hệ Zalo để chốt phí ship và
            giao hàng.
          </p>
          <a
            href={site.zaloUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary mt-4"
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            Liên hệ Zalo
          </a>
        </section>
      ) : (
        <section className="grid gap-3">
          <PaymentBlock payment={payment} total={order.totalVnd} />
          {order.paymentStatus === "unpaid" ? (
            <div>
              <button
                type="button"
                onClick={onPaymentSubmitted}
                disabled={submitting}
                className="btn btn-primary disabled:opacity-60"
              >
                {submitting ? "Đang gửi…" : "Tôi đã chuyển khoản"}
              </button>
            </div>
          ) : null}
          {notice ? (
            <p className="rounded-control border border-rose-soft bg-blush/40 px-3 py-2 text-sm text-ink">
              {notice}
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}
