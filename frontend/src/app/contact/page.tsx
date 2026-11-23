import type { Metadata } from "next";

import { FacebookIcon, ShopeeIcon, ZaloIcon } from "@/components/brand-icons";
import { pageMetadata } from "@/lib/metadata";
import { getSiteConfig } from "@/lib/site-config";

export const metadata: Metadata = pageMetadata({
  title: "Liên hệ",
  description: "Liên hệ Nhà Len Nhỏ qua Zalo, Facebook hoặc Shopee.",
  path: "/contact",
});

export default function ContactPage() {
  const site = getSiteConfig();

  const links = [
    {
      href: site.zaloUrl,
      label: "Zalo",
      description: "Nhắn tin nhanh để được tư vấn.",
      icon: <ZaloIcon className="size-6 text-[#0180c7]" />,
    },
    {
      href: site.facebookUrl,
      label: "Facebook",
      description: "Theo dõi và nhắn tin qua trang Facebook.",
      icon: <FacebookIcon className="size-6 text-[#1877f2]" />,
    },
    {
      href: site.shopeeUrl,
      label: "Shopee",
      description: "Mua hàng trên gian hàng Shopee.",
      icon: <ShopeeIcon className="size-6 text-[#ee4d2d]" />,
    },
  ];

  return (
    <div className="container-page max-w-3xl py-12 md:py-16">
      <header>
        <h1 className="text-3xl text-ink sm:text-4xl">Liên hệ</h1>
        <p className="mt-3 text-muted">
          Bạn có thể nhắn tiệm qua các kênh dưới đây, hoặc đặt hàng và thanh toán
          ngay trên website.
        </p>
      </header>

      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-full flex-col rounded-card border border-line bg-white p-6 transition-colors hover:border-rose-soft"
            >
              {link.icon}
              <span className="mt-3 font-display text-lg text-ink">
                {link.label}
              </span>
              <span className="mt-1 text-sm text-muted">
                {link.description}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
