import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chính sách bảo mật",
  robots: { index: false, follow: true },
};

/**
 * PLACEHOLDER PAGE.
 *
 * The owner must write and approve the real privacy policy (brief section 2.6).
 * This page intentionally does NOT contain invented legal text. It only lists
 * the technical facts the owner can build on.
 */
export default function PrivacyPage() {
  return (
    <div className="container-page max-w-3xl py-12 md:py-16">
      <h1 className="text-3xl text-ink sm:text-4xl">Chính sách bảo mật</h1>
      <p className="mt-4 rounded-card border border-rose-soft bg-blush/40 p-5 text-sm text-ink">
        Nội dung chính sách đang chờ chủ cửa hàng cung cấp và phê duyệt. Đây là
        trang tạm, không phải nội dung pháp lý chính thức.
      </p>

      <h2 className="mt-8 text-xl text-ink">Thông tin website thu thập</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
        <li>Họ tên, số điện thoại, địa chỉ giao hàng khi bạn gửi đơn hàng.</li>
        <li>Nội dung mô tả khi bạn gửi yêu cầu đặt làm riêng.</li>
        <li>Tên hiển thị, số sao và nội dung khi bạn gửi đánh giá.</li>
      </ul>

      <h2 className="mt-8 text-xl text-ink">Mục đích sử dụng</h2>
      <p className="mt-3 text-sm text-muted">
        Thông tin chỉ được dùng để liên hệ và thực hiện đơn hàng/yêu cầu của bạn.
      </p>

      <h2 className="mt-8 text-xl text-ink">Liên hệ về dữ liệu cá nhân</h2>
      <p className="mt-3 text-sm text-muted">
        Để yêu cầu xem, chỉnh sửa hoặc xóa dữ liệu của bạn, vui lòng liên hệ
        cửa hàng qua Zalo hoặc Facebook ở chân trang.
      </p>
    </div>
  );
}
