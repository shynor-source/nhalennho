import Link from "next/link";

import { FacebookIcon, ZaloIcon } from "@/components/brand-icons";
import { navLinks } from "@/lib/nav";

type Props = {
  siteName: string;
  zaloUrl: string;
  facebookUrl: string;
};

export function SiteFooter({ siteName, zaloUrl, facebookUrl }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-line bg-linen">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="font-display text-lg text-ink">{siteName}</p>
          <p className="mt-3 max-w-xs text-sm text-muted">
            Đồ thủ công và sản phẩm đặt làm riêng, làm theo yêu cầu của bạn.
          </p>
        </div>

        <nav aria-label="Liên kết chân trang">
          <h2 className="text-sm font-medium text-ink">Khám phá</h2>
          <ul className="mt-4 space-y-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted transition-colors hover:text-rose-deep"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-medium text-ink">Liên hệ</h2>
          <ul className="mt-4 space-y-2">
            <li>
              <a
                href={zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-rose-deep"
              >
                <ZaloIcon className="size-4 text-[#0180c7]" />
                Zalo
              </a>
            </li>
            <li>
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-rose-deep"
              >
                <FacebookIcon className="size-4 text-[#1877f2]" />
                Facebook
              </a>
            </li>
            <li>
              <Link
                href="/custom-order"
                className="text-sm text-muted transition-colors hover:text-rose-deep"
              >
                Đặt làm riêng
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink">Thông tin</h2>
          {/* Privacy/terms pages are hidden until the owner supplies the real
              legal content (brief section 2.6). The routes still exist and are
              unlinked-only, so links can be re-added without new work. */}
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteName}. Bảo lưu mọi quyền.
          </p>
          <p>Hình ảnh và nội dung thuộc về cửa hàng.</p>
        </div>
      </div>
    </footer>
  );
}
