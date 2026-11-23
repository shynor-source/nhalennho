"use client";

import { getSiteConfig } from "@/lib/site-config";

/** CSRF token for admin mutations, set after login or a /me check. */
let csrfToken: string | null = null;
export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; data: { error?: string } };

/** Upload one product image (multipart, admin + CSRF). */
export async function uploadProductImage(
  file: File,
): Promise<ApiResult<{ url: string; width: number; height: number }>> {
  const form = new FormData();
  form.append("image", file);
  const headers: Record<string, string> = { "X-Requested-With": "fetch" };
  if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  try {
    const res = await fetch(`${getSiteConfig().apiUrl}/api/v1/admin/uploads`, {
      method: "POST",
      headers,
      credentials: "include",
      body: form,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) return { ok: false, status: res.status, data };
    return { ok: true, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Không kết nối được tới máy chủ." } };
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; admin?: boolean } = {},
): Promise<ApiResult<T>> {
  const { method = "GET", body, admin = false } = options;
  const headers: Record<string, string> = { "X-Requested-With": "fetch" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (admin && csrfToken) headers["X-CSRF-Token"] = csrfToken;

  try {
    const res = await fetch(`${getSiteConfig().apiUrl}/api/v1${path}`, {
      method,
      headers,
      credentials: admin ? "include" : "same-origin",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      return { ok: false, status: res.status, data };
    }
    return { ok: true, status: res.status, data: data as T };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { error: "Không kết nối được tới máy chủ." },
    };
  }
}

/** Public form submissions (orders, custom orders, reviews). */
export const publicApi = {
  listCategories: () => request<{ items: unknown[] }>("/categories"),
  createOrder: (payload: unknown) =>
    request<{ code: string; message: string }>("/order-requests", {
      method: "POST",
      body: payload,
    }),
  createCustomOrder: (payload: unknown) =>
    request<{ code: string; message: string }>("/custom-order-requests", {
      method: "POST",
      body: payload,
    }),
  createReview: (slug: string, payload: unknown) =>
    request<{ message: string }>(
      `/products/${encodeURIComponent(slug)}/reviews`,
      { method: "POST", body: payload },
    ),
};

/** Admin API (session cookie + CSRF). */
export const adminApi = {
  login: (email: string, password: string) =>
    request<{ authenticated: boolean; csrfToken: string; email: string }>(
      "/admin/login",
      { method: "POST", body: { email, password }, admin: true },
    ),
  logout: () =>
    request<{ authenticated: boolean }>("/admin/logout", {
      method: "POST",
      body: {},
      admin: true,
    }),
  me: () =>
    request<{ authenticated: boolean; csrfToken?: string; email?: string }>(
      "/admin/me",
      { admin: true },
    ),
  stats: () => request<Record<string, number>>("/admin/stats", { admin: true }),
  listProducts: (query = "") =>
    request<{ items: unknown[]; total: number }>(
      `/admin/products${query ? `?${query}` : ""}`,
      { admin: true },
    ),
  getProduct: (id: number) =>
    request<unknown>(`/admin/products/${id}`, { admin: true }),
  createProduct: (payload: unknown) =>
    request<unknown>("/admin/products", {
      method: "POST",
      body: payload,
      admin: true,
    }),
  updateProduct: (id: number, payload: unknown) =>
    request<unknown>(`/admin/products/${id}`, {
      method: "PUT",
      body: payload,
      admin: true,
    }),
  deleteProduct: (id: number) =>
    request<{ deleted: boolean }>(`/admin/products/${id}`, {
      method: "DELETE",
      admin: true,
    }),
  listOrders: (query = "") =>
    request<{ items: unknown[]; total: number }>(
      `/admin/orders${query ? `?${query}` : ""}`,
      { admin: true },
    ),
  getOrder: (id: number) =>
    request<unknown>(`/admin/orders/${id}`, { admin: true }),
  updateOrderStatus: (id: number, status: string) =>
    request<{ updated: boolean }>(`/admin/orders/${id}/status`, {
      method: "PATCH",
      body: { status },
      admin: true,
    }),
  updateOrderPayment: (id: number, paymentStatus: string) =>
    request<{ updated: boolean }>(`/admin/orders/${id}/payment`, {
      method: "PATCH",
      body: { paymentStatus },
      admin: true,
    }),
  deleteOrder: (id: number) =>
    request<{ deleted: boolean }>(`/admin/orders/${id}`, {
      method: "DELETE",
      admin: true,
    }),
  listPosts: (query = "") =>
    request<{ items: unknown[]; total: number }>(
      `/admin/posts${query ? `?${query}` : ""}`,
      { admin: true },
    ),
  getPost: (id: number) =>
    request<unknown>(`/admin/posts/${id}`, { admin: true }),
  createPost: (payload: unknown) =>
    request<{ id: number; slug: string }>("/admin/posts", {
      method: "POST",
      body: payload,
      admin: true,
    }),
  updatePost: (id: number, payload: unknown) =>
    request<{ updated: boolean }>(`/admin/posts/${id}`, {
      method: "PUT",
      body: payload,
      admin: true,
    }),
  deletePost: (id: number) =>
    request<{ deleted: boolean }>(`/admin/posts/${id}`, {
      method: "DELETE",
      admin: true,
    }),
  bulkCreatePosts: (payload: unknown) =>
    request<{ created: number; message: string }>("/admin/posts/bulk", {
      method: "POST",
      body: payload,
      admin: true,
    }),
  listCustomOrders: (query = "") =>
    request<{ items: unknown[]; total: number }>(
      `/admin/custom-orders${query ? `?${query}` : ""}`,
      { admin: true },
    ),
  getCustomOrder: (id: number) =>
    request<unknown>(`/admin/custom-orders/${id}`, { admin: true }),
  updateCustomOrderStatus: (id: number, status: string) =>
    request<{ updated: boolean }>(`/admin/custom-orders/${id}/status`, {
      method: "PATCH",
      body: { status },
      admin: true,
    }),
  deleteCustomOrder: (id: number) =>
    request<{ deleted: boolean }>(`/admin/custom-orders/${id}`, {
      method: "DELETE",
      admin: true,
    }),
  updateOrderNote: (id: number, note: string) =>
    request<{ updated: boolean }>(`/admin/orders/${id}/note`, {
      method: "PATCH",
      body: { note },
      admin: true,
    }),
  updateCustomOrderNote: (id: number, note: string) =>
    request<{ updated: boolean }>(`/admin/custom-orders/${id}/note`, {
      method: "PATCH",
      body: { note },
      admin: true,
    }),
  listReviews: (query = "") =>
    request<{ items: unknown[]; total: number }>(
      `/admin/reviews${query ? `?${query}` : ""}`,
      { admin: true },
    ),
  setReviewApproved: (id: number, approved: boolean) =>
    request<{ updated: boolean }>(`/admin/reviews/${id}`, {
      method: "PATCH",
      body: { approved },
      admin: true,
    }),
  deleteReview: (id: number) =>
    request<{ deleted: boolean }>(`/admin/reviews/${id}`, {
      method: "DELETE",
      admin: true,
    }),
  listCustomers: (query = "") =>
    request<{ items: unknown[]; total: number }>(
      `/admin/customers${query ? `?${query}` : ""}`,
      { admin: true },
    ),
  updateCustomer: (id: number, payload: { fullName: string; phone: string }) =>
    request<{ updated: boolean }>(`/admin/customers/${id}`, {
      method: "PATCH",
      body: payload,
      admin: true,
    }),
  deleteCustomer: (id: number) =>
    request<{ deleted: boolean }>(`/admin/customers/${id}`, {
      method: "DELETE",
      admin: true,
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ updated: boolean }>("/admin/password", {
      method: "POST",
      body: { currentPassword, newPassword },
      admin: true,
    }),
};

/** Customer account + checkout API (session cookie + CSRF). */
export const CUSTOMER_AUTH_EVENT = "nhallennho:customer-auth";

function emitCustomerAuth() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CUSTOMER_AUTH_EVENT));
  }
}

export const customerApi = {
  register: async (payload: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    const res = await request<{ authenticated: boolean; csrfToken: string }>(
      "/account/register",
      { method: "POST", body: payload, admin: true },
    );
    if (res.ok) emitCustomerAuth();
    return res;
  },
  login: async (email: string, password: string) => {
    const res = await request<{ authenticated: boolean; csrfToken: string }>(
      "/account/login",
      { method: "POST", body: { email, password }, admin: true },
    );
    if (res.ok) emitCustomerAuth();
    return res;
  },
  logout: async () => {
    const res = await request<{ authenticated: boolean }>("/account/logout", {
      method: "POST",
      body: {},
      admin: true,
    });
    emitCustomerAuth();
    return res;
  },
  me: () =>
    request<{
      authenticated: boolean;
      csrfToken?: string;
      customer?: { email: string; fullName: string; phone: string };
    }>("/account/me", { admin: true }),
  checkout: (payload: unknown) =>
    request<{
      code: string;
      totalVnd: number;
      payment: {
        method: string;
        bankName: string;
        bankCode: string;
        accountNumber: string;
        accountName: string;
        transferContent: string;
        qrUrl: string;
        configured: boolean;
      };
      message: string;
    }>("/checkout", { method: "POST", body: payload, admin: true }),
  listOrders: () =>
    request<{ items: unknown[]; total: number }>("/account/orders", {
      admin: true,
    }),
  getOrder: (code: string) =>
    request<{ order: unknown; payment: unknown }>(
      `/account/orders/${encodeURIComponent(code)}`,
      { admin: true },
    ),
  paymentSubmitted: (code: string) =>
    request<{ message: string }>(
      `/account/orders/${encodeURIComponent(code)}/payment-submitted`,
      { method: "POST", body: {}, admin: true },
    ),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ updated: boolean }>("/account/password", {
      method: "POST",
      body: { currentPassword, newPassword },
      admin: true,
    }),
};

/** Unified login for admin and customer accounts. */
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await request<{
      authenticated: boolean;
      role: "admin" | "customer";
      csrfToken: string;
      redirectTo: string;
      email?: string;
      customer?: { email: string; fullName: string; phone: string };
    }>("/auth/login", {
      method: "POST",
      body: { email, password },
      admin: true,
    });
    if (res.ok) emitCustomerAuth();
    return res;
  },
  me: () =>
    request<{
      authenticated: boolean;
      role?: "admin" | "customer";
      csrfToken?: string;
      redirectTo?: string;
      email?: string;
      customer?: { email: string; fullName: string; phone: string };
    }>("/auth/me", { admin: true }),
  logout: async () => {
    const res = await request<{ authenticated: boolean }>("/auth/logout", {
      method: "POST",
      body: {},
      admin: true,
    });
    emitCustomerAuth();
    return res;
  },
};

/** Zalo Bot notification helpers (admin). */
export const notificationApi = {
  sendTest: () =>
    request<{ sent: boolean }>("/admin/notifications/test", {
      method: "POST",
      body: {},
      admin: true,
    }),
  discoverChats: () =>
    request<{
      items: { chatId: string; displayName: string; text: string; at: string }[];
    }>("/admin/notifications/chats", { admin: true }),
};
