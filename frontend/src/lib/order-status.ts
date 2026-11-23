import type { OrderStatus } from "@/lib/types";

export const ORDER_STATUSES: OrderStatus[] = [
  "received",
  "confirmed",
  "making",
  "shipped",
  "completed",
  "cancelled",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Mới nhận",
  confirmed: "Đã xác nhận",
  making: "Đang làm",
  shipped: "Đã gửi",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  submitted: "Đã báo chuyển khoản",
  paid: "Đã thanh toán",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Chuyển khoản QR",
  cod: "Ship COD",
};
