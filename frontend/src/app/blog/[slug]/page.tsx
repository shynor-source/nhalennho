import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ArticleJsonLd } from "@/components/json-ld";
import { apiServer, ApiError } from "@/lib/api-server";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { getSiteConfig } from "@/lib/site-config";
import type { BlogPost } from "@/lib/types";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await apiServer.post(slug);
    return pageMetadata({
      title: post.title,
      description: post.excerpt,
      path: `/blog/${post.slug}`,
      type: "article",
    });
  } catch {
    return { title: "Bài viết" };
  }
}

function renderContent(content: string) {
  // Content is rich HTML authored solely by the admin through the Tiptap
  // editor (trusted input, brief 2.5 admin scope). React escapes regular
  // text everywhere else; here we opt into the stored HTML and rely on the
  // editor's allowlist of tags. Images inside are media-store URLs.
  return (
    <div
      className="rich-post-content mt-6"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  let post: BlogPost;
  try {
    post = await apiServer.post(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    return (
      <div className="container-page py-16">
        <p className="rounded-card border border-line bg-white p-6 text-sm text-muted">
          Chưa kết nối được tới máy chủ. Vui lòng thử lại sau.
        </p>
      </div>
    );
  }

  return (
    <article className="container-page max-w-3xl py-12 md:py-16">
      <ArticleJsonLd post={post} siteUrl={getSiteConfig().url} />
      <nav className="text-sm text-muted">
        <Link href="/blog" className="hover:text-rose-deep">
          ← Về danh sách bài viết
        </Link>
      </nav>
      <h1 className="mt-4 text-3xl text-ink sm:text-4xl">{post.title}</h1>
      {post.publishedAt ? (
        <p className="mt-2 text-sm text-muted">{formatDate(post.publishedAt)}</p>
      ) : null}
      <div className="mt-6">{renderContent(post.content ?? "")}</div>
    </article>
  );
}
