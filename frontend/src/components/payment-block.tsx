"use client";

import { formatVND } from "@/lib/format";
import type { PaymentInfo } from "@/lib/types";

export function PaymentBlock({
  payment,
  total,
}: {
  payment: PaymentInfo;
  total: number;
}) {
  if (payment.method === "cod") return null;

  if (!payment.configured) {
    return (
      <div className="rounded-card border border-rose-soft bg-blush/40 p-5">
        <p className="font-medium text-ink">Thông tin thanh toán</p>
        <p className="mt-1 text-sm text-muted">
          Shop chưa cấu hình tài khoản ngân hàng. Vui lòng liên hệ Zalo để nhận
          thông tin chuyển khoản.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 rounded-card border border-line bg-white p-5 sm:grid-cols-[220px_1fr]">
      {payment.qrUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={payment.qrUrl}
          alt="Mã QR chuyển khoản"
          width={220}
          height={220}
          loading="lazy"
          className="rounded-control border border-line"
        />
      ) : null}
      <div className="text-sm">
        <p className="font-display text-lg text-ink">Quét mã để chuyển khoản</p>
        <dl className="mt-3 space-y-1 text-muted">
          <div className="flex gap-2">
            <dt className="w-28 shrink-0">Ngân hàng</dt>
            <dd className="text-ink">{payment.bankName || payment.bankCode}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0">Số tài khoản</dt>
            <dd className="text-ink">{payment.accountNumber}</dd>
          </div>
          {payment.accountName ? (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0">Chủ tài khoản</dt>
              <dd className="text-ink">{payment.accountName}</dd>
            </div>
          ) : null}
          <div className="flex gap-2">
            <dt className="w-28 shrink-0">Số tiền</dt>
            <dd className="text-ink">{formatVND(total)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0">Nội dung CK</dt>
            <dd className="text-ink">{payment.transferContent}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted">
          Vui lòng ghi đúng nội dung chuyển khoản để shop đối chiếu nhanh.
        </p>
      </div>
    </div>
  );
}
