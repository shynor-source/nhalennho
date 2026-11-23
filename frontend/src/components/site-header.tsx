import Image from "next/image";
import Link from "next/link";
import { Heart, Search } from "lucide-react";

import { AccountLink } from "@/components/account-link";
import { CartLink } from "@/components/cart-link";
import { MobileNav } from "@/components/mobile-nav";
import { navLinks } from "@/lib/nav";

type Props = {
  siteName: string;
};

/**
 * Site header. Desktop navigation plus search and wishlist entry points.
 * The mobile menu is an isolated client component; the rest stays server-side.
 */
export function SiteHeader({ siteName }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-cream/95 backdrop-blur-[2px]">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 transition-colors hover:text-rose-deep"
        >
          <Image
            src="/brand/logo.jpg"
            alt=""
            aria-hidden="true"
            width={1254}
            height={1254}
            className="size-10 rounded-full border border-line object-cover"
          />
          <span className="font-display hidden text-lg tracking-tight whitespace-nowrap text-ink sm:inline sm:text-xl">
            {siteName}
          </span>
        </Link>

        <nav aria-label="Điều hướng chính" className="hidden md:block">
          <ul className="flex items-center gap-8">
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

        <div className="flex items-center gap-1">
          <Link
            href="/search"
            aria-label="Tìm kiếm sản phẩm"
            className="inline-flex size-11 items-center justify-center rounded-control text-muted transition-colors hover:bg-blush/60 hover:text-rose-deep"
          >
            <Search aria-hidden="true" className="size-5" />
          </Link>
          <Link
            href="/wishlist"
            aria-label="Sản phẩm yêu thích"
            className="inline-flex size-11 items-center justify-center rounded-control text-muted transition-colors hover:bg-blush/60 hover:text-rose-deep"
          >
            <Heart aria-hidden="true" className="size-5" />
          </Link>
          <AccountLink />

          <CartLink />

          <MobileNav />
        </div>
      </div>
    </header>
  );
}
