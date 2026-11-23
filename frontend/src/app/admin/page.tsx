"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { adminApi } from "@/lib/api-client";
import type { AdminStats } from "@/lib/types";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminApi.stats().then((res) => {
      if (!active) return;
      if (res.ok) {
        setStats({
          newOrders: Number(res.data.newOrders ?? 0),
          newCustomOrders: Number(res.data.newCustomOrders ?? 0),
          totalOrders: Number(res.data.totalOrders ?? 0),
          totalCustomOrders: Number(res.data.totalCustomOrders ?? 0),
        });
      } else {
        setError("Không tải được số liệu.");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const cards = [
    {
      href: "/admin/orders",
      label: "Đơn hàng mới",
      value: stats?.newOrders,
      hint: `Tổng: ${stats?.totalOrders ?? 0}`,
    },
    {
      href: "/admin/custom-orders",
      label: "Yêu cầu đặt làm mới",
      value: stats?.newCustomOrders,
      hint: `Tổng: ${stats?.totalCustomOrders ?? 0}`,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl text-ink">Tổng quan</h1>
      <p className="mt-2 text-sm text-muted">
        Yêu cầu mới được lưu vào hộp thư quản trị này. Hãy kiểm tra thường xuyên.
      </p>

      {error ? (
        <p className="mt-6 text-sm text-rose-deep" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-card border border-line bg-white p-6 transition-colors hover:border-rose-soft"
          >
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-2 font-display text-3xl text-ink">
              {card.value ?? "…"}
            </p>
            <p className="mt-1 text-xs text-muted">{card.hint}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/admin/products" className="btn btn-outline">
          Quản lý sản phẩm
        </Link>
        <Link href="/admin/products/new" className="btn btn-primary">
          Thêm sản phẩm
        </Link>
      </div>
    </div>
  );
}
