"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { adminApi } from "@/lib/api-client";
import { formatPriceFrom } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await adminApi.listProducts("per_page=100");
    if (res.ok) {
      setProducts(res.data.items as Product[]);
      setError(null);
    } else {
      setError("Không tải được danh sách sản phẩm.");
    }
  }

  useEffect(() => {
    let active = true;
    adminApi.listProducts("per_page=100").then((res) => {
      if (!active) return;
      if (res.ok) {
        setProducts(res.data.items as Product[]);
        setError(null);
      } else {
        setError("Không tải được danh sách sản phẩm.");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function onDelete(product: Product) {
    if (!window.confirm(`Xóa sản phẩm “${product.name}”?`)) return;
    const res = await adminApi.deleteProduct(product.id);
    if (!res.ok) {
      setError(res.data.error ?? "Xóa thất bại.");
      return;
    }
    await refresh();
  }

  const loading = products === null;
  const list = products ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl text-ink">Sản phẩm</h1>
        <Link href="/admin/products/new" className="btn btn-primary">
          Thêm sản phẩm
        </Link>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-rose-deep" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-muted">Đang tải…</p>
      ) : list.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Chưa có sản phẩm nào.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Danh sách sản phẩm</caption>
            <thead className="border-b border-line text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Tên
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Giá
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Trạng thái
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((product) => (
                <tr key={product.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink">{product.name}</td>
                  <td className="px-4 py-3 text-muted">
                    {formatPriceFrom(product.priceVnd, product.priceMaxVnd)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        product.isActive ? "text-ink" : "text-muted line-through"
                      }
                    >
                      {product.isActive ? "Đang bán" : "Ngừng bán"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="text-rose-deep hover:underline"
                      >
                        Sửa
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDelete(product)}
                        className="text-rose-deep hover:underline"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
