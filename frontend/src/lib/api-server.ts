import "server-only";

import { getInternalApiUrl } from "@/lib/server-env";
import type { BlogPost, Category, Paginated, Product, Review } from "@/lib/types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${getInternalApiUrl()}/api/v1${path}`, { cache: "no-store" });
  } catch {
    throw new ApiError(503, "Không kết nối được tới máy chủ.");
  }
  if (!res.ok) {
    throw new ApiError(res.status, `Yêu cầu thất bại (${res.status}).`);
  }
  return (await res.json()) as T;
}

/** Server-side API access used by React Server Components. */
export const apiServer = {
  categories: () => request<{ items: Category[] }>("/categories"),
  products: (query: string) =>
    request<Paginated<Product>>(`/products${query ? `?${query}` : ""}`),
  product: (slug: string) =>
    request<{ product: Product; reviews: Review[] }>(
      `/products/${encodeURIComponent(slug)}`,
    ),
  colors: () => request<{ items: string[] }>("/colors"),
  posts: (query = "") =>
    request<Paginated<BlogPost>>(`/posts${query ? `?${query}` : ""}`),
  post: (slug: string) =>
    request<BlogPost>(`/posts/${encodeURIComponent(slug)}`),
};
