"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { authApi, setCsrfToken } from "@/lib/api-client";

const fieldClass =
  "h-11 w-full rounded-control border border-line bg-white px-3 text-sm text-ink focus-visible:border-rose-soft";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    const res = await authApi.login(
      String(data.get("email") ?? ""),
      String(data.get("password") ?? ""),
    );
    setSubmitting(false);
    if (!res.ok) {
      setError(res.data.error ?? "Đăng nhập thất bại.");
      return;
    }
    setCsrfToken(res.data.csrfToken);
    const safeNext =
      next.startsWith("/") && !next.startsWith("/admin") ? next : null;
    const dest =
      res.data.role === "admin" ? "/admin" : (safeNext ?? "/account");
    router.replace(dest);
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl text-ink">Đăng nhập</h1>
      <p className="mt-2 text-sm text-muted">
        Đăng nhập để thanh toán và theo dõi đơn hàng.
      </p>
      <form
        method="post"
        onSubmit={onSubmit}
        className="mt-6 grid gap-4 rounded-card border border-line bg-white p-6"
      >
        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            spellCheck={false}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-muted">
            Mật khẩu
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={fieldClass}
          />
        </div>
        {error ? (
          <p className="text-sm text-rose-deep" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary w-full disabled:opacity-60"
        >
          {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Chưa có tài khoản?{" "}
        <Link href="/account/register" className="text-rose-deep hover:underline">
          Đăng ký
        </Link>
      </p>
    </div>
  );
}

export default function AccountLoginPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <Suspense fallback={<p className="text-sm text-muted">Đang tải…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
