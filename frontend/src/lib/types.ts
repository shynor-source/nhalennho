export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string;
};

export type ProductCategoryRef = {
  slug: string;
  name: string;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: ProductCategoryRef | null;
  priceVnd: number;
  priceMaxVnd: number | null;
  colors: string[];
  isActive: boolean;
  /** Optional Shopee product page link (empty when not linked). */
  shopeeUrl: string;
  /** Variation axes (color/size/material/packaging). Empty on list views. */
  options: ProductOption[];
  coverImage: string;
  images?: string[];
  createdAt: string;
};

export type ProductOptionValue = {
  value: string;
  /** Amount ADDED to the base price; null = does not affect the price. */
  priceDeltaVnd: number | null;
};

export type ProductOption = {
  kind: string;
  values: ProductOptionValue[];
};

export type SelectedOption = {
  kind: string;
  value: string;
};

export const OPTION_KIND_LABELS: Record<string, string> = {
  color: "Màu sắc",
  size: "Kích thước",
  material: "Chất liệu",
  packaging: "Đóng gói",
};

export type Review = {
  id: number;
  authorName: string;
  rating: number;
  body: string;
  createdAt: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
  publishedAt: string | null;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  perPage: number;
};

export type OrderStatus =
  | "received"
  | "confirmed"
  | "making"
  | "shipped"
  | "completed"
  | "cancelled";

export type AdminOrder = {
  id: number;
  code: string;
  customerName: string;
  phone: string;
  address: string;
  note: string;
  status: OrderStatus;
  consentGiven: boolean;
  paymentMethod: string;
  paymentStatus: string;
  totalVnd: number;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  items?: {
    productName: string;
    unitPriceVnd: number;
    quantity: number;
    options?: SelectedOption[];
  }[];
};

export type AdminCustomOrder = {
  id: number;
  code: string;
  customerName: string;
  phone: string;
  address: string;
  note: string;
  status: OrderStatus;
  consentGiven: boolean;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminReview = {
  id: number;
  productId: number;
  productName: string;
  productSlug: string;
  authorName: string;
  rating: number;
  body: string;
  isApproved: boolean;
  createdAt: string;
};

export type AdminCustomer = {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
};

export type AdminStats = {
  newOrders: number;
  newCustomOrders: number;
  totalOrders: number;
  totalCustomOrders: number;
};

export type Customer = {
  email: string;
  fullName: string;
  phone: string;
};

export type PaymentInfo = {
  method: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  transferContent: string;
  qrUrl: string;
  configured: boolean;
};

export type AccountOrder = {
  id: number;
  code: string;
  customerName: string;
  phone: string;
  address: string;
  note: string;
  status: OrderStatus;
  paymentStatus: "unpaid" | "submitted" | "paid";
  paymentMethod: string;
  totalVnd: number;
  createdAt: string;
  updatedAt: string;
  items?: {
    productName: string;
    unitPriceVnd: number;
    quantity: number;
    options?: SelectedOption[];
  }[];
};

export type AdminPostState = "draft" | "scheduled" | "published";

export type AdminPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  state?: AdminPostState;
};
