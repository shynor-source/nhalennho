import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  robots: { index: false, follow: true },
};

/**
 * PLACEHOLDER PAGE.
 *
 * The owner must write and approve the real terms (brief section 2.6). This
 * page intentionally does NOT contain invented legal text.
 */
export default function TermsPage() {
  return (
    <div className="container-page max-w-3xl py-12 md:py-16">
      <h1 className="text-3xl text-ink sm:text-4xl">Điều khoản sử dụng</h1>
      <p className="mt-4 rounded-card border border-rose-soft bg-blush/40 p-5 text-sm text-ink">
        Nội dung điều khoản đang chờ chủ cửa hàng cung cấp và phê duyệt. Đây là
        trang tạm, không phải nội dung pháp lý chính thức.
      </p>

      <h2 className="mt-8 text-xl text-ink">Gửi đơn hàng và đặt làm</h2>
      <p className="mt-3 text-sm text-muted">
        Khi bạn gửi đơn hàng hoặc yêu cầu đặt làm, website chỉ ghi nhận thông
        tin. Đơn hàng chưa được xem là xác nhận cho đến khi cửa hàng liên hệ và
        xác nhận với bạn.
      </p>

      <h2 className="mt-8 text-xl text-ink">Mua hàng trên Shopee</h2>
      <p className="mt-3 text-sm text-muted">
        Một số sản phẩm có thể được mua trên gian hàng Shopee của cửa hàng. Việc
        mua hàng trên Shopee tuân theo chính sách của Shopee.
      </p>
    </div>
  );
}
