"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  CUSTOMER_AUTH_EVENT,
  authApi,
  setCsrfToken,
} from "@/lib/api-client";

type Role = "admin" | "customer" | null;

export function AccountLink() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      authApi.me().then((res) => {
        if (!active) return;
        if (res.ok && res.data.authenticated) {
          setRole(res.data.role ?? "customer");
          setCsrfToken(res.data.csrfToken ?? null);
        } else {
          setRole(null);
        }
      });
    };
    load();
    window.addEventListener(CUSTOMER_AUTH_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      active = false;
      window.removeEventListener(CUSTOMER_AUTH_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function onLogout() {
    setBusy(true);
    await authApi.logout();
    setCsrfToken(null);
    setRole(null);
    setOpen(false);
    setBusy(false);
    router.replace("/");
    router.refresh();
  }

  if (!role) {
    return (
      <Link
        href="/account/login"
        aria-label="Đăng nhập"
        className="inline-flex h-11 items-center gap-1.5 rounded-control px-2 text-sm text-muted transition-colors hover:bg-blush/60 hover:text-rose-deep sm:px-3"
      >
        <User aria-hidden="true" className="size-5" />
        <span className="hidden sm:inline">Đăng nhập</span>
      </Link>
    );
  }

  const isAdmin = role === "admin";

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="account-menu"
        className="inline-flex h-11 items-center gap-1.5 rounded-control px-2 text-sm text-muted transition-colors hover:bg-blush/60 hover:text-rose-deep sm:px-3"
      >
        {isAdmin ? (
          <LayoutDashboard aria-hidden="true" className="size-5" />
        ) : (
          <User aria-hidden="true" className="size-5" />
        )}
        <span className="hidden sm:inline">
          {isAdmin ? "Quản trị" : "Tài khoản"}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`hidden size-4 transition-transform sm:inline ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          id="account-menu"
          role="menu"
          aria-label={isAdmin ? "Quản trị" : "Tài khoản"}
          className="absolute top-full right-0 z-50 mt-2 w-48 rounded-card border border-line bg-white p-1 shadow-soft"
        >
          {isAdmin ? (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-control px-3 py-2 text-sm text-ink transition-colors hover:bg-blush/40 hover:text-rose-deep"
            >
              <LayoutDashboard aria-hidden="true" className="size-4" />
              Trang quản trị
            </Link>
          ) : (
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-control px-3 py-2 text-sm text-ink transition-colors hover:bg-blush/40 hover:text-rose-deep"
            >
              <User aria-hidden="true" className="size-4" />
              Trang tài khoản
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            disabled={busy}
            className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm text-rose-deep transition-colors hover:bg-blush/40 disabled:opacity-60"
          >
            <LogOut aria-hidden="true" className="size-4" />
            {busy ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
