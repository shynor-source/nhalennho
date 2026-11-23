"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PostForm } from "@/components/admin/post-form";
import { adminApi } from "@/lib/api-client";
import type { AdminPost } from "@/lib/types";

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const invalidId = !Number.isFinite(id);
  const [post, setPost] = useState<AdminPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invalidId) return;
    let active = true;
    adminApi.getPost(id).then((res) => {
      if (!active) return;
      if (res.ok) setPost(res.data as AdminPost);
      else setError(res.data.error ?? "Không tìm thấy bài viết.");
    });
    return () => {
      active = false;
    };
  }, [id, invalidId]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl text-ink">Sửa bài viết</h1>
        <Link href="/admin/posts" className="text-sm text-rose-deep hover:underline">
          ← Danh sách
        </Link>
      </div>

      {invalidId ? (
        <p className="mt-6 text-sm text-rose-deep" role="alert">
          ID bài viết không hợp lệ.
        </p>
      ) : error ? (
        <p className="mt-6 text-sm text-rose-deep" role="alert">
          {error}
        </p>
      ) : !post ? (
        <p className="mt-6 text-sm text-muted">Đang tải…</p>
      ) : (
        <div className="mt-6">
          <PostForm initial={post} onSaved={() => router.push("/admin/posts")} />
        </div>
      )}
    </div>
  );
}
