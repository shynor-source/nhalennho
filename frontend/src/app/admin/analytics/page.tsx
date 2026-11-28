"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { adminApi, type AnalyticsSummary } from "@/lib/api-client";

const RANGES = [
  { days: 7, label: "7 ngày" },
  { days: 30, label: "30 ngày" },
  { days: 90, label: "90 ngày" },
] as const;

const fmt = new Intl.NumberFormat("vi-VN");

function labelForDay(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

/** Simple CSS bar chart — no chart library, matches the admin design tokens. */
function DailyChart({ series }: { series: AnalyticsSummary["series"] }) {
  const points = series ?? [];
  if (points.length === 0) {
    return (
      <p className="text-sm text-muted">
        Chưa có dữ liệu — dữ liệu bắt đầu tính từ hôm nay.
      </p>
    );
  }
  const max = Math.max(...points.map((p) => p.hits), 1);
  return (
    <div className="flex h-40 items-end gap-1">
      {points.map((point) => (
        <div
          key={point.day}
          className="group relative flex h-full flex-1 items-end"
          title={`${labelForDay(point.day)}: ${fmt.format(point.hits)} lượt xem`}
        >
          <div
            className="w-full rounded-t-control bg-rose-soft/70 transition-colors group-hover:bg-rose-deep"
            style={{ height: `${Math.max((point.hits / max) * 100, 2)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function TopProductsTable({
  title,
  rows,
  emptyHint,
}: {
  title: string;
  rows: { productId: number; name: string; slug: string; hits: number }[];
  emptyHint: string;
}) {
  return (
    <div className="rounded-card border border-line bg-white p-6">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{emptyHint}</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="pb-2 font-medium">Sản phẩm</th>
              <th className="pb-2 text-right font-medium">Số lượt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.productId} className="border-t border-line/60">
                <td className="py-2 pr-3">
                  <Link
                    href={`/admin/products/${row.productId}/edit`}
                    className="text-ink hover:text-rose-deep hover:underline"
                  >
                    {index + 1}. {row.name}
                  </Link>
                </td>
                <td className="py-2 text-right tabular-nums text-ink">
                  {fmt.format(row.hits)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** First/last date captions under the chart (guarded against empty data). */
function ChartAxisLabels({ series }: { series: AnalyticsSummary["series"] }) {
  const [firstPoint] = series;
  const lastPoint = series[series.length - 1];
  if (!firstPoint || !lastPoint) return null;
  return (
    <div className="mt-2 flex justify-between text-xs text-muted">
      <span>{labelForDay(firstPoint.day)}</span>
      <span>{labelForDay(lastPoint.day)}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  // Only setState asynchronously (inside the fetch callback) — keeps the
  // react-hooks/set-state-in-effect rule happy and avoids flicker.
  const [loaded, setLoaded] = useState<{
    days: number;
    summary: AnalyticsSummary | null;
    error: string | null;
  } | null>(null);
  const summary = loaded?.days === days ? loaded.summary : null;
  const error = loaded?.days === days ? loaded.error : null;

  useEffect(() => {
    let active = true;
    adminApi.analytics(days).then((res) => {
      if (!active) return;
      setLoaded({
        days,
        summary: res.ok ? res.data : null,
        error: res.ok ? null : (res.data.error ?? "Không tải được thống kê."),
      });
    });
    return () => {
      active = false;
    };
  }, [days]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-ink">Thống kê</h1>
          <p className="mt-2 text-sm text-muted">
            Lượt xem web, lượt xem từng sản phẩm và lượt thích — ẩn danh, không
            lưu thông tin cá nhân.
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Khoảng thời gian">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              aria-pressed={days === r.days}
              className={`h-9 rounded-control border px-4 text-sm transition-colors ${
                days === r.days
                  ? "border-rose-deep bg-rose-deep text-white"
                  : "border-line bg-white text-ink hover:border-rose-soft"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="mt-6 text-sm text-rose-deep" role="alert">
          {error}
        </p>
      ) : null}

      {/* KPI cards — one metric per card, values compared side by side. */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary ? (
          <>
            <div className="rounded-card border border-line bg-white p-6">
              <p className="text-sm text-muted">Lượt xem web hôm nay</p>
              <p className="mt-2 font-display text-3xl text-ink">
                {fmt.format(summary.siteViews.today)}
              </p>
            </div>
            <div className="rounded-card border border-line bg-white p-6">
              <p className="text-sm text-muted">
                Lượt xem web trong {days} ngày
              </p>
              <p className="mt-2 font-display text-3xl text-ink">
                {fmt.format(summary.siteViews.window)}
              </p>
            </div>
            <div className="rounded-card border border-line bg-white p-6">
              <p className="text-sm text-muted">Lượt thích hôm nay</p>
              <p className="mt-2 font-display text-3xl text-ink">
                {fmt.format(summary.favorites.today)}
              </p>
            </div>
            <div className="rounded-card border border-line bg-white p-6">
              <p className="text-sm text-muted">Lượt thích trong {days} ngày</p>
              <p className="mt-2 font-display text-3xl text-ink">
                {fmt.format(summary.favorites.window)}
              </p>
            </div>
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-card border border-line bg-white"
            />
          ))
        )}
      </div>

      {/* Trend chart */}
      <div className="mt-6 rounded-card border border-line bg-white p-6">
        <h2 className="font-display text-lg text-ink">
          Lượt xem web theo ngày
        </h2>
        <div className="mt-4">
          {summary ? (
            <DailyChart series={summary.series} />
          ) : (
            <div className="h-40 animate-pulse rounded-control bg-cream/60" />
          )}
        </div>
        {summary && (summary.series ?? []).length > 0 ? (
          <ChartAxisLabels series={summary.series} />
        ) : null}
      </div>

      {/* Top products */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {summary ? (
          <>
            <TopProductsTable
              title={`Sản phẩm được xem nhiều nhất (${days} ngày)`}
              rows={summary.topViewed ?? []}
              emptyHint="Chưa có lượt xem sản phẩm nào."
            />
            <TopProductsTable
              title={`Sản phẩm được yêu thích nhất (${days} ngày)`}
              rows={summary.topFavorited ?? []}
              emptyHint="Chưa có lượt thích nào."
            />
          </>
        ) : (
          <>
            <div className="h-48 animate-pulse rounded-card border border-line bg-white" />
            <div className="h-48 animate-pulse rounded-card border border-line bg-white" />
          </>
        )}
      </div>
    </div>
  );
}
