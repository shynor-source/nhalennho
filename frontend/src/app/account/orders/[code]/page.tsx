import type { Metadata } from "next";

import { AccountOrderView } from "@/components/account-order-view";

export const metadata: Metadata = {
  title: "Chi tiết đơn hàng",
  robots: { index: false, follow: false },
};

export default async function AccountOrderPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <div className="container-page max-w-3xl py-12 md:py-16">
      <AccountOrderView code={code} />
    </div>
  );
}
