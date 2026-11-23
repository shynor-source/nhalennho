import Link from "next/link";
import type { Metadata } from "next";

import { pageMetadata } from "@/lib/metadata";
import { apiServer } from "@/lib/api-server";
import { formatDate } from "@/lib/format";
import type { BlogPost } from "@/lib/types";

export const metadata: Metadata = pageMetadata({
  title: "Bài viết",
  description: "Chia sẻ về đồ len handmade và cách bảo quản.",
  path: "/blog",
});

export default async function BlogPage() {
  let posts: BlogPost[] = [];
  let failed = false;
  try {
    posts = (await apiServer.posts()).items;
  } catch {
    failed = true;
  }

  return (
    <div className="container-page py-12 md:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl text-ink sm:text-4xl">Bài viết</h1>
        <p className="mt-3 text-muted">
          Chuyện nhỏ về đồ len, cách chọn quà và bảo quản.
        </p>
      </header>

      {failed ? (
        <p className="mt-10 rounded-card border border-line bg-white p-6 text-sm text-muted">
          Chưa tải được bài viết. Vui lòng thử lại sau.
        </p>
      ) : posts.length === 0 ? (
        <p className="mt-10 text-sm text-muted">Đang cập nhật bài viết.</p>
      ) : (
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="flex h-full flex-col rounded-card border border-line bg-white p-6 transition-colors hover:border-rose-soft">
                <h2 className="font-display text-xl text-ink">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="transition-colors hover:text-rose-deep"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm text-muted">{post.excerpt}</p>
                {post.publishedAt ? (
                  <p className="mt-auto pt-4 text-xs text-muted">
                    {formatDate(post.publishedAt)}
                  </p>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
