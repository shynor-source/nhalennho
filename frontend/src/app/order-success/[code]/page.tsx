import type { Metadata } from "next";

import { OrderSuccessView } from "@/components/order-success-view";

export const metadata: Metadata = {
  title: "Đặt hàng thành công",
  robots: { index: false, follow: false },
};

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <div className="container-page max-w-3xl py-12 md:py-16">
      <OrderSuccessView code={code} />
    </div>
  );
}
