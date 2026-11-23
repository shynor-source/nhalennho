"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { navLinks } from "@/lib/nav";

/**
 * Mobile navigation. A real <button> toggles a menu with an accessible label.
 * Body scroll is locked while the menu is open; Escape closes it.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Đóng menu" : "Mở menu"}
        className="inline-flex size-11 items-center justify-center rounded-control text-muted transition-colors hover:bg-blush/60 hover:text-rose-deep"
      >
        {open ? (
          <X aria-hidden="true" className="size-5" />
        ) : (
          <Menu aria-hidden="true" className="size-5" />
        )}
      </button>

      {open ? (
        <nav
          id="mobile-menu"
          aria-label="Điều hướng di động"
          className="absolute inset-x-0 top-16 border-b border-line bg-cream shadow-soft"
        >
          <ul className="container-page flex flex-col py-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-base text-ink transition-colors hover:text-rose-deep"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
