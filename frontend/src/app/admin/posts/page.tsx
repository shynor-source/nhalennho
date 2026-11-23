"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { adminApi } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { AdminPost, AdminPostState } from "@/lib/types";

const STATE_LABEL: Record<AdminPostState, string> = {
  draft: "Nháp",
  scheduled: "Hẹn giờ",
  published: "Đã đăng",
};

const STATE_CLASS: Record<AdminPostState, string> = {
  draft: "text-muted",
  scheduled: "text-rose-deep",
  published: "text-ink",
};

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<AdminPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await adminApi.listPosts("per_page=200");
    if (res.ok) {
      setPosts(res.data.items as AdminPost[]);
      setError(null);
    } else {
      setError("Không tải được danh sách bài viết.");
    }
  }

  useEffect(() => {
    let active = true;
    adminApi.listPosts("per_page=200").then((res) => {
      if (!active) return;
      if (res.ok) {
        setPosts(res.data.items as AdminPost[]);
        setError(null);
      } else {
        setError("Không tải được danh sách bài viết.");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function onDelete(post: AdminPost) {
    if (!window.confirm(`Xóa bài viết “${post.title}”?`)) return;
    const res = await adminApi.deletePost(post.id);
    if (!res.ok) {
      setError(res.data.error ?? "Xóa thất bại.");
      return;
    }
    await refresh();
  }

  const list = posts ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl text-ink">Bài viết</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/posts/bulk" className="btn btn-outline">
            Đăng hàng loạt
          </Link>
          <Link href="/admin/posts/new" className="btn btn-primary">
            Thêm bài viết
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-rose-deep" role="alert">
          {error}
        </p>
      ) : null}

      {posts === null ? (
        <p className="mt-6 text-sm text-muted">Đang tải…</p>
      ) : list.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Chưa có bài viết nào.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Danh sách bài viết</caption>
            <thead className="border-b border-line text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Tiêu đề
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Trạng thái
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Ngày đăng
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((post) => {
                const state: AdminPostState = post.state ?? "draft";
                return (
                  <tr key={post.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-ink">{post.title}</td>
                    <td className={`px-4 py-3 ${STATE_CLASS[state]}`}>
                      {STATE_LABEL[state]}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {post.publishedAt ? formatDate(post.publishedAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={`/admin/posts/${post.id}/edit`}
                          className="text-rose-deep hover:underline"
                        >
                          Sửa
                        </Link>
                        <button
                          type="button"
                          onClick={() => onDelete(post)}
                          className="text-rose-deep hover:underline"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
