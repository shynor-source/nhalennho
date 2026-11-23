"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, MessageCircle, PenLine, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { FacebookIcon, ZaloIcon } from "@/components/brand-icons";

type Props = {
  zaloUrl: string;
  facebookUrl: string;
};

/**
 * Floating speed dial (bottom-right): one main chat button that fans out into
 * the actions — "Đặt làm riêng", Zalo and Facebook. A separate back-to-top
 * button sits below the dial and only appears after scrolling down. Tap/press
 * to open, tap outside or Escape to close. Actions are only focusable while
 * open.
 */
export function FloatingContact({ zaloUrl, facebookUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Reset on navigation so a new page starts closed.
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const roundClass =
    "inline-flex size-12 items-center justify-center rounded-full border border-line bg-white text-ink shadow-soft transition-colors hover:border-rose-soft hover:text-rose-deep";

  const itemClass = (visible: boolean) =>
    `flex items-center justify-end gap-2 transition-all duration-200 ease-out ${
      visible
        ? "translate-y-0 opacity-100"
        : "pointer-events-none absolute translate-y-2 opacity-0"
    }`;

  const actions: { key: string; node: React.ReactNode }[] = [
    {
      key: "custom-order",
      node: (
        <Link
          href="/custom-order"
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
          className="flex items-center justify-end gap-2"
        >
          <span className="rounded-control bg-white px-2 py-1 text-xs text-ink shadow-soft">
            Đặt làm riêng
          </span>
          <span className="inline-flex size-12 items-center justify-center rounded-full border border-rose-deep bg-rose-deep text-white shadow-soft transition-colors hover:bg-[#7a444e]">
            <PenLine aria-hidden="true" className="size-5" />
          </span>
        </Link>
      ),
    },
    {
      key: "zalo",
      node: (
        <a
          href={zaloUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
          aria-label="Nhắn Zalo"
          className="flex items-center justify-end gap-2"
        >
          <span className="rounded-control bg-white px-2 py-1 text-xs text-ink shadow-soft">
            Nhắn Zalo
          </span>
          <span className={roundClass}>
            <ZaloIcon className="size-6 text-[#0180c7]" />
          </span>
        </a>
      ),
    },
    {
      key: "facebook",
      node: (
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
          aria-label="Nhắn Facebook"
          className="flex items-center justify-end gap-2"
        >
          <span className="rounded-control bg-white px-2 py-1 text-xs text-ink shadow-soft">
            Nhắn Facebook
          </span>
          <span className={roundClass}>
            <FacebookIcon className="size-6 text-[#1877f2]" />
          </span>
        </a>
      ),
    },
  ];

  return (
    <div
      ref={rootRef}
      className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2 pb-[env(safe-area-inset-bottom)]"
    >
      <ul
        id="fab-actions"
        aria-hidden={!open}
        className="flex flex-col items-end gap-2"
      >
        {actions.map((action, index) => (
          <li
            key={action.key}
            className={itemClass(open)}
            style={
              open
                ? { transitionDelay: `${(actions.length - 1 - index) * 40}ms` }
                : undefined
            }
          >
            {action.node}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="fab-actions"
        aria-label={open ? "Đóng menu liên hệ" : "Mở menu liên hệ"}
        className="inline-flex size-14 items-center justify-center rounded-full bg-rose-deep text-white shadow-soft transition-colors duration-300 hover:bg-[#7a444e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-deep"
      >
        {open ? (
          <X aria-hidden="true" className="size-6" />
        ) : (
          <MessageCircle aria-hidden="true" className="size-6" />
        )}
      </button>

      <button
        type="button"
        onClick={onBackToTop}
        aria-label="Về đầu trang"
        tabIndex={showTop ? 0 : -1}
        className={`${roundClass} transition-opacity duration-300 ${
          showTop ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <ArrowUp aria-hidden="true" className="size-5" />
      </button>
    </div>
  );

  function onBackToTop() {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }
}
