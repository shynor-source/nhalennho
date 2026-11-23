"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { customerApi, setCsrfToken } from "@/lib/api-client";
import { describeOptions, useCart } from "@/lib/cart";
import { formatVND } from "@/lib/format";

const fieldClass =
  "h-11 w-full rounded-control border border-line bg-white px-3 text-sm text-ink focus-visible:border-rose-soft";

type PaymentMethod = "bank_transfer" | "cod";

export function CheckoutForm() {
  const router = useRouter();
  const { items, total, clear } = useCart();
  const [state, setState] = useState<"checking" | "ready">("checking");
  const [customer, setCustomer] = useState<{
    fullName: string;
    phone: string;
    email: string;
  } | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stable per checkout attempt: protects against duplicate orders when the
  // network times out or the user double-submits.
  const idempotencyKey = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    customerApi.me().then((res) => {
      if (!active) return;
      if ("crypto" in window && "randomUUID" in crypto) {
        idempotencyKey.current = crypto.randomUUID();
      } else {
        const bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        idempotencyKey.current = Array.from(bytes, (b) =>
          b.toString(16).padStart(2, "0"),
        ).join("");
      }
      if (res.ok && res.data.authenticated) {
        setCsrfToken(res.data.csrfToken ?? null);
        setCustomer(res.data.customer ?? null);
        setState("ready");
      } else {
        router.replace("/account/login?next=/checkout");
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);

    const res = await customerApi.checkout({
      customerName: String(data.get("customerName") ?? ""),
      phone: String(data.get("phone") ?? ""),
      address: String(data.get("address") ?? ""),
      note: String(data.get("note") ?? ""),
      consent: data.get("consent") === "on",
      paymentMethod: method,
      idempotencyKey: idempotencyKey.current,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        options: i.options ?? [],
      })),
    });

    setSubmitting(false);
    if (!res.ok) {
      setError(res.data.error ?? "Đặt hàng thất bại, vui lòng thử lại.");
      return;
    }
    clear();
    router.push(`/order-success/${res.data.code}`);
  }

  if (state !== "ready") {
    return (
      <p className="mt-8 text-sm text-muted">Đang kiểm tra đăng nhập…</p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-card border border-line bg-white p-10 text-center">
        <p className="text-muted">Giỏ hàng của bạn đang trống.</p>
        <Link href="/categories" className="btn btn-primary mt-5">
          Xem sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]"
    >
      <div className="grid gap-5 rounded-card border border-line bg-white p-6">
        <h2 className="font-display text-xl text-ink">Thông tin người nhận</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="co-name" className="mb-1 block text-sm text-muted">
              Họ và tên
            </label>
            <input
              id="co-name"
              name="customerName"
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              defaultValue={customer?.fullName ?? ""}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="co-phone" className="mb-1 block text-sm text-muted">
              Số điện thoại
            </label>
            <input
              id="co-phone"
              name="phone"
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              defaultValue={customer?.phone ?? ""}
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="co-address" className="mb-1 block text-sm text-muted">
              Địa chỉ nhận hàng
            </label>
            <textarea
              id="co-address"
              name="address"
              required
              rows={2}
              autoComplete="street-address"
              className="w-full rounded-control border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:border-rose-soft"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="co-note" className="mb-1 block text-sm text-muted">
              Ghi chú (không bắt buộc)
            </label>
            <textarea
              id="co-note"
              name="note"
              rows={2}
              className="w-full rounded-control border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:border-rose-soft"
            />
          </div>
        </div>

        <fieldset className="rounded-card border border-line p-4">
          <legend className="px-1 text-sm font-medium text-ink">
            Phương thức thanh toán
          </legend>
          <div className="mt-2 grid gap-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-control border border-line p-3 text-sm">
              <input
                type="radio"
                name="paymentMethod"
                value="bank_transfer"
                checked={method === "bank_transfer"}
                onChange={() => setMethod("bank_transfer")}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-ink">
                  Chuyển khoản QR (VietQR)
                </span>
                <span className="mt-1 block text-muted">
                  Quét mã, chuyển khoản. Shop kiểm tra và xác nhận thanh toán.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-control border border-line p-3 text-sm">
              <input
                type="radio"
                name="paymentMethod"
                value="cod"
                checked={method === "cod"}
                onChange={() => setMethod("cod")}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-ink">
                  Ship COD (nhận hàng trả tiền)
                </span>
                <span className="mt-1 block text-muted">
                  Shop sẽ liên hệ Zalo để chốt phí ship và giao hàng.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <label className="flex items-start gap-3 text-sm text-muted">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-1 size-4 rounded border-line text-rose-deep"
          />
          <span>
            Tôi đồng ý để Nhà Len Nhỏ liên hệ và xử lý thông tin cá nhân nhằm
            thực hiện đơn hàng.
          </span>
        </label>

        {error ? (
          <p className="text-sm text-rose-deep" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary w-full disabled:opacity-60 sm:w-auto"
        >
          {submitting ? "Đang đặt hàng…" : "Đặt hàng"}
        </button>
      </div>

      <aside className="h-fit rounded-card border border-line bg-white p-5">
        <h2 className="font-display text-lg text-ink">Đơn hàng của bạn</h2>
        <ul className="mt-4 divide-y divide-line text-sm">
          {items.map((item, index) => (
            <li key={index} className="flex justify-between gap-3 py-2">
              <span className="min-w-0 text-ink">
                {item.name}
                {describeOptions(item.options) ? (
                  <span className="block text-xs text-muted">
                    {describeOptions(item.options)}
                  </span>
                ) : null}
                <span className="text-muted"> × {item.quantity}</span>
              </span>
              <span className="shrink-0 text-muted">
                {formatVND(item.unitPriceVnd * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-line pt-3 text-sm">
          <span className="text-muted">Tạm tính</span>
          <span className="font-medium text-ink">{formatVND(total)}</span>
        </div>
        <p className="mt-2 text-xs text-muted">
          Phí vận chuyển sẽ được shop xác nhận khi liên hệ.
        </p>
      </aside>
    </form>
  );
}
