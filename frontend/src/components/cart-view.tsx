"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";

import { ProductImage } from "@/components/product-image";
import { formatVND } from "@/lib/format";
import { describeOptions, useCart } from "@/lib/cart";

export function CartView() {
  const { items, total, setQuantity, remove } = useCart();

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
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
      <ul className="divide-y divide-line rounded-card border border-line bg-white">
        {items.map((item, index) => (
          <li key={item.productId} className="flex gap-4 p-4 sm:p-5">
            <Link
              href={`/products/${item.slug}`}
              className="relative size-24 shrink-0 overflow-hidden rounded-control border border-line bg-blush/40"
            >
              {item.coverImage ? (
                <ProductImage
                  path={item.coverImage}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </Link>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Link
                href={`/products/${item.slug}`}
                className="font-medium text-ink hover:text-rose-deep"
              >
                {item.name}
              </Link>
              {describeOptions(item.options) ? (
                <p className="text-xs text-muted">{describeOptions(item.options)}</p>
              ) : null}
              <p className="text-sm text-muted">{formatVND(item.unitPriceVnd)}</p>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(index, item.quantity - 1)}
                  aria-label="Giảm số lượng"
                  className="inline-flex size-8 items-center justify-center rounded-control border border-line text-muted hover:border-rose-soft hover:text-rose-deep"
                >
                  <Minus aria-hidden="true" className="size-4" />
                </button>
                <span className="min-w-8 text-center text-sm text-ink">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(index, item.quantity + 1)}
                  aria-label="Tăng số lượng"
                  className="inline-flex size-8 items-center justify-center rounded-control border border-line text-muted hover:border-rose-soft hover:text-rose-deep"
                >
                  <Plus aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Xóa ${item.name}`}
                  className="ml-auto inline-flex size-8 items-center justify-center rounded-control text-muted hover:text-rose-deep"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>

            <p className="shrink-0 text-sm text-ink">
              {formatVND(item.unitPriceVnd * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-card border border-line bg-white p-5">
        <h2 className="font-display text-lg text-ink">Tóm tắt</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Tạm tính</dt>
            <dd className="text-ink">{formatVND(total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Phí vận chuyển</dt>
            <dd className="text-muted">Shop xác nhận sau</dd>
          </div>
        </dl>
        <Link href="/checkout" className="btn btn-primary mt-5 w-full">
          Tiến hành thanh toán
        </Link>
        <Link
          href="/categories"
          className="mt-3 block text-center text-sm text-rose-deep hover:underline"
        >
          Tiếp tục mua sắm
        </Link>
      </aside>
    </div>
  );
}
