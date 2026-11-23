import type { Metadata } from "next";

import { WishlistView } from "@/components/wishlist-view";

export const metadata: Metadata = { title: "Sản phẩm yêu thích" };

export default function WishlistPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl text-ink sm:text-4xl">Sản phẩm yêu thích</h1>
        <p className="mt-3 text-muted">
          Danh sách được lưu trên thiết bị của bạn.
        </p>
      </header>
      <WishlistView />
    </div>
  );
}
