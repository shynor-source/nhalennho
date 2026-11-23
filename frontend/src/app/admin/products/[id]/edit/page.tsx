"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProductForm } from "@/components/admin/product-form";
import { adminApi } from "@/lib/api-client";
import type { Product } from "@/lib/types";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const invalidId = !Number.isFinite(id);
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invalidId) return;
    let active = true;
    adminApi.getProduct(id).then((res) => {
      if (!active) return;
      if (res.ok) setProduct(res.data as Product);
      else setError(res.data.error ?? "Không tìm thấy sản phẩm.");
    });
    return () => {
      active = false;
    };
  }, [id, invalidId]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl text-ink">Sửa sản phẩm</h1>
        <Link href="/admin/products" className="text-sm text-rose-deep hover:underline">
          ← Danh sách
        </Link>
      </div>

      {invalidId ? (
        <p className="mt-6 text-sm text-rose-deep" role="alert">
          ID sản phẩm không hợp lệ.
        </p>
      ) : error ? (
        <p className="mt-6 text-sm text-rose-deep" role="alert">
          {error}
        </p>
      ) : !product ? (
        <p className="mt-6 text-sm text-muted">Đang tải…</p>
      ) : (
        <div className="mt-6">
          <ProductForm
            initial={product}
            onSaved={() => router.push("/admin/products")}
          />
        </div>
      )}
    </div>
  );
}
