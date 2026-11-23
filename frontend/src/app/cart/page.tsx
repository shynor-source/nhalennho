import type { Metadata } from "next";

import { CartView } from "@/components/cart-view";

export const metadata: Metadata = { title: "Giỏ hàng" };

export default function CartPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl text-ink sm:text-4xl">Giỏ hàng</h1>
        <p className="mt-3 text-muted">
          Kiểm tra sản phẩm, sau đó nhập thông tin và chọn cách thanh toán.
        </p>
      </header>
      <CartView />
    </div>
  );
}
