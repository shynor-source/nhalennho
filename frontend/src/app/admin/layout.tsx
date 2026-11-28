"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { adminApi, setCsrfToken } from "@/lib/api-client";

const navItems = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/analytics", label: "Thống kê" },
  { href: "/admin/products", label: "Sản phẩm" },
  { href: "/admin/posts", label: "Bài viết" },
  { href: "/admin/orders", label: "Đơn hàng" },
  { href: "/admin/custom-orders", label: "Đặt làm riêng" },
  { href: "/admin/reviews", label: "Đánh giá" },
  { href: "/admin/customers", label: "Khách hàng" },
  { href: "/admin/settings", label: "Cài đặt" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [state, setState] = useState<"checking" | "authed" | "anon">(
    "checking",
  );

  useEffect(() => {
    if (isLogin) return;
    let active = true;
    adminApi.me().then((res) => {
      if (!active) return;
      if (res.ok && res.data.authenticated) {
        setCsrfToken(res.data.csrfToken ?? null);
        setState("authed");
      } else {
        setState("anon");
        router.replace("/account/login?next=/admin");
      }
    });
    return () => {
      active = false;
    };
  }, [isLogin, pathname, router]);

  if (isLogin) {
    return <div className="container-page py-12">{children}</div>;
  }

  if (state !== "authed") {
    return (
      <div className="container-page py-16">
        <p className="text-sm text-muted">Đang kiểm tra đăng nhập…</p>
      </div>
    );
  }

  return (
    <div className="container-page py-8 md:py-10">
      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <p className="font-display text-lg text-ink">Quản trị</p>
          <nav aria-label="Menu quản trị" className="mt-3">
            <ul className="flex gap-2 overflow-x-auto md:flex-col md:gap-1">
              {navItems.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-control px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-blush/60 text-rose-deep"
                          : "text-muted hover:text-rose-deep"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
