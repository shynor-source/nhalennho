"use client";

import { useState } from "react";

import { PasswordForm } from "@/components/password-form";
import { adminApi, notificationApi } from "@/lib/api-client";

type DiscoveredChat = {
  chatId: string;
  displayName: string;
  text: string;
  at: string;
};

export default function AdminSettingsPage() {
  const [chats, setChats] = useState<DiscoveredChat[]>([]);
  const [chatsBusy, setChatsBusy] = useState(false);
  const [chatsMessage, setChatsMessage] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function discoverChats() {
    setChatsBusy(true);
    setError(null);
    setChatsMessage(null);
    const res = await notificationApi.discoverChats();
    setChatsBusy(false);
    if (!res.ok) {
      setError(res.data.error ?? "Không lấy được danh sách chat.");
      return;
    }
    setChats(res.data.items);
    setChatsMessage(
      res.data.items.length === 0
        ? "Chưa thấy chat nào. Hãy nhắn một tin bất kỳ cho bot từ Zalo rồi thử lại."
        : `Tìm thấy ${res.data.items.length} chat. Copy chatId và điền vào ZALO_BOT_CHAT_ID.`,
    );
  }

  async function sendTest() {
    setTestBusy(true);
    setError(null);
    setTestMessage(null);
    const res = await notificationApi.sendTest();
    setTestBusy(false);
    if (!res.ok) {
      setError(res.data.error ?? "Gửi tin thử thất bại.");
      return;
    }
    setTestMessage("Đã gửi tin thử. Kiểm tra Zalo của bạn.");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl text-ink">Cài đặt</h1>
      <p className="mt-1 text-sm text-muted">
        Thông tin đăng nhập, thông báo đơn hàng và các kênh liên hệ của shop.
      </p>

      <section className="mt-6 rounded-card border border-line bg-white p-6">
        <h2 className="font-display text-lg text-ink">Đổi mật khẩu quản trị</h2>
        <p className="mt-1 text-sm text-muted">
          Sau khi đổi, các phiên đăng nhập khác vẫn giữ hiệu lực cho tới khi hết
          hạn. Hãy dùng mật khẩu mạnh và không dùng lại ở nơi khác.
        </p>
        <div className="mt-5">
          <PasswordForm
            onSubmit={async (currentPassword, newPassword) => {
              const res = await adminApi.changePassword(
                currentPassword,
                newPassword,
              );
              return res.ok ? { ok: true } : { ok: false, error: res.data.error };
            }}
          />
        </div>
      </section>

      <section className="mt-6 rounded-card border border-line bg-white p-6">
        <h2 className="font-display text-lg text-ink">
          Thông báo đơn qua Zalo Bot
        </h2>
        <p className="mt-2 text-sm text-muted">
          Kênh miễn phí, không cần tạo Zalo OA. Chủ shop tự tạo bot từ tài khoản
          cá nhân qua OA <strong>“Zalo Bot Manager”</strong>: mở Zalo → tìm OA →
          chọn “Tạo bot” → nhận <strong>Bot Token</strong> qua tin nhắn Zalo →
          điền vào biến môi trường{" "}
          <code className="rounded bg-cream px-1 py-0.5 text-xs">
            ZALO_BOT_TOKEN
          </code>{" "}
          rồi build lại backend.
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>Tạo bot, nhận Bot Token qua tin nhắn Zalo.</li>
          <li>Nhắn một tin bất kỳ cho bot từ Zalo của chủ shop.</li>
          <li>Bấm “Lấy danh sách chat” để tìm chatId.</li>
          <li>
            Điền{" "}
            <code className="rounded bg-cream px-1 text-xs">
              ZALO_BOT_CHAT_ID
            </code>{" "}
            vào env, build lại backend.
          </li>
          <li>Bấm “Gửi tin thử” để kiểm tra.</li>
        </ol>
        <p className="mt-3 text-xs text-muted">
          Tài liệu: docs.zaloplatforms.com/docs/BOT
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={discoverChats}
            disabled={chatsBusy}
            className="btn btn-outline disabled:opacity-60"
          >
            {chatsBusy ? "Đang lấy…" : "Lấy danh sách chat"}
          </button>
          <button
            type="button"
            onClick={sendTest}
            disabled={testBusy}
            className="btn btn-primary disabled:opacity-60"
          >
            {testBusy ? "Đang gửi…" : "Gửi tin thử"}
          </button>
        </div>

        {chatsMessage ? (
          <p className="mt-3 text-sm text-muted" role="status">
            {chatsMessage}
          </p>
        ) : null}
        {chats.length > 0 ? (
          <ul className="mt-4 divide-y divide-line rounded-card border border-line">
            {chats.map((chat) => (
              <li
                key={chat.chatId}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="text-ink">
                  {chat.displayName || "(không tên)"}
                </span>
                <code className="rounded bg-cream px-2 py-0.5 text-xs">
                  {chat.chatId}
                </code>
              </li>
            ))}
          </ul>
        ) : null}
        {testMessage ? (
          <p className="mt-3 text-sm text-rose-deep" role="status">
            {testMessage}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-rose-deep" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className="mt-6 rounded-card border border-line bg-white p-6">
        <h2 className="font-display text-lg text-ink">Kênh bán & liên hệ</h2>
        <p className="mt-2 text-sm text-muted">
          Link Shopee và Facebook được cấu hình trong biến môi trường
          <code className="mx-1 rounded bg-cream px-1 py-0.5 text-xs">
            NEXT_PUBLIC_SHOPEE_URL
          </code>
          và
          <code className="mx-1 rounded bg-cream px-1 py-0.5 text-xs">
            NEXT_PUBLIC_FACEBOOK_URL
          </code>
          . Thay đổi cần build lại frontend.
        </p>
        <p className="mt-2 text-sm text-muted">
          Số Zalo nhận tin nhắn từ khách:{" "}
          <code className="rounded bg-cream px-1 py-0.5 text-xs">
            NEXT_PUBLIC_ZALO_URL
          </code>
          .
        </p>
      </section>
    </div>
  );
}
