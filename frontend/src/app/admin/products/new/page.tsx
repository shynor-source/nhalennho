"use client";

import { useRouter } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";

export default function NewProductPage() {
  const router = useRouter();
  return (
    <div>
      <h1 className="text-2xl text-ink">Thêm sản phẩm</h1>
      <div className="mt-6">
        <ProductForm onSaved={() => router.push("/admin/products")} />
      </div>
    </div>
  );
}
