"use client";

import { useRouter } from "next/navigation";

import { PostForm } from "@/components/admin/post-form";

export default function NewPostPage() {
  const router = useRouter();
  return (
    <div>
      <h1 className="text-2xl text-ink">Thêm bài viết</h1>
      <div className="mt-6">
        <PostForm onSaved={() => router.push("/admin/posts")} />
      </div>
    </div>
  );
}
