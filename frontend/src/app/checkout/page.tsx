import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout-form";

export const metadata: Metadata = { title: "Thanh toán" };

export default function CheckoutPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl text-ink sm:text-4xl">Thanh toán</h1>
        <p className="mt-3 text-muted">
          Nhập thông tin người nhận và chọn cách thanh toán.
        </p>
      </header>
      <CheckoutForm />
    </div>
  );
}
