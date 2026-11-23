import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị",
  robots: { index: false, follow: false },
};

// One login form for everyone. Unified login redirects admins to /admin.
export default function AdminLoginPage() {
  redirect("/account/login?next=/admin");
}
