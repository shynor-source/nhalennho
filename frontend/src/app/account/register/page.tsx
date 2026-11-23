"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { customerApi, setCsrfToken } from "@/lib/api-client";

const fieldClass =
  "h-11 w-full rounded-control border border-line bg-white px-3 text-sm text-ink focus-visible:border-rose-soft";

export default function AccountRegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    const res = await customerApi.register({
      fullName: String(data.get("fullName") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      password: String(data.get("password") ?? ""),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.data.error ?? "Đăng ký thất bại.");
      return;
    }
    setCsrfToken(res.data.csrfToken);
    router.replace("/account");
  }

  return (
    <div className="container-page py-12 md:py-16">
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl text-ink">Tạo tài khoản</h1>
        <p className="mt-2 text-sm text-muted">
          Tạo tài khoản để đặt hàng và theo dõi đơn.
        </p>
        <form
          method="post"
          onSubmit={onSubmit}
          className="mt-6 grid gap-4 rounded-card border border-line bg-white p-6"
        >
          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm text-muted">
              Họ và tên
            </label>
            <input
              id="fullName"
              name="fullName"
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              className={fieldClass}
            />
          </div>
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
            <label htmlFor="phone" className="mb-1 block text-sm text-muted">
              Số điện thoại (không bắt buộc)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-muted">
              Mật khẩu (tối thiểu 8 ký tự)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
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
            {submitting ? "Đang tạo tài khoản…" : "Đăng ký"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          Đã có tài khoản?{" "}
          <Link href="/account/login" className="text-rose-deep hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
