"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";

import { customerApi, setCsrfToken } from "@/lib/api-client";
import { formatDate, formatVND } from "@/lib/format";
import { getSiteConfig } from "@/lib/site-config";
import type { AccountOrder, PaymentInfo } from "@/lib/types";

import { PaymentBlock } from "@/components/payment-block";

export function OrderSuccessView({ code }: { code: string }) {
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
        router.replace(`/account/login?next=/order-success/${code}`);
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
    return <p className="mt-8 text-sm text-muted">Đang tải đơn hàng…</p>;
  }

  if (error || !order || !payment) {
    return (
      <div className="mt-8 rounded-card border border-line bg-white p-8">
        <p className="text-rose-deep" role="alert">
          {error ?? "Không tìm thấy đơn hàng."}
        </p>
        <Link href="/account" className="btn btn-outline mt-4">
          Đến quản lý đơn hàng
        </Link>
      </div>
    );
  }

  const isCod = order.paymentMethod === "cod";
  const zaloMessage = encodeURIComponent(
    `Xin chào Nhà Len Nhỏ, mình vừa đặt đơn ${order.code} (${formatVND(order.totalVnd)}). Mình muốn liên hệ để ship COD.`,
  );
  const zaloLink = `${site.zaloUrl}${site.zaloUrl.includes("?") ? "&" : "?"}text=${zaloMessage}`;

  return (
    <div className="mt-8 grid gap-6">
      <section className="rounded-card border border-line bg-white p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 size-6 text-rose-deep"
          />
          <div>
            <h2 className="font-display text-2xl text-ink">
              Đặt hàng thành công
            </h2>
            <p className="mt-1 text-sm text-muted">
              Mã đơn <span className="font-medium text-ink">{order.code}</span>{" "}
              · {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
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
          <div>
            <dt className="text-muted">Tạm tính</dt>
            <dd className="text-ink">{formatVND(order.totalVnd)}</dd>
          </div>
          <div>
            <dt className="text-muted">Thanh toán</dt>
            <dd className="text-ink">
              {isCod ? "Ship COD" : "Chuyển khoản QR"} ·{" "}
              {order.paymentStatus === "paid"
                ? "Đã thanh toán"
                : order.paymentStatus === "submitted"
                  ? "Đã báo chuyển khoản"
                  : "Chưa thanh toán"}
            </dd>
          </div>
        </dl>
      </section>

      {isCod ? (
        <section className="rounded-card border border-line bg-blush/40 p-6">
          <h2 className="font-display text-xl text-ink">
            Shop sẽ liên hệ để giao hàng
          </h2>
          <p className="mt-2 text-sm text-muted">
            Bạn chọn Ship COD. Hãy nhắn Zalo cho shop để chốt phí ship và thời
            gian giao hàng.
          </p>
          <a
            href={zaloLink}
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
              <p className="mt-2 text-xs text-muted">
                Sau khi bấm, shop sẽ kiểm tra ngân hàng và xác nhận đơn của bạn.
              </p>
            </div>
          ) : (
            <p className="rounded-control border border-rose-soft bg-blush/40 px-3 py-2 text-sm text-ink">
              {notice ??
                "Shop đã ghi nhận thanh toán. Bạn có thể theo dõi trạng thái trong mục quản lý đơn hàng."}
            </p>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href={`/account/orders/${order.code}`} className="btn btn-outline">
          Theo dõi đơn hàng
        </Link>
        <Link href="/categories" className="btn btn-outline">
          Tiếp tục mua sắm
        </Link>
      </div>
    </div>
  );
}
