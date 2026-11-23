import type { Metadata } from "next";

import { CustomOrderForm } from "@/components/custom-order-form";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Đặt làm riêng",
  description:
    "Gửi ý tưởng để Nhà Len Nhỏ móc riêng món đồ len theo yêu cầu của bạn.",
  path: "/custom-order",
});

export default function CustomOrderPage() {
  return (
    <div className="container-page max-w-3xl py-12 md:py-16">
      <header>
        <h1 className="text-3xl text-ink sm:text-4xl">Đặt làm riêng</h1>
        <p className="mt-3 text-muted">
          Bạn có ý tưởng cho một món đồ len riêng? Hãy mô tả bên dưới, tiệm sẽ
          liên hệ để trao đổi chi tiết và báo giá.
        </p>
      </header>
      <div className="mt-8">
        <CustomOrderForm />
      </div>
    </div>
  );
}
