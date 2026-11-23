<div align="center">

# 🧶 Nhà Len Nhỏ

**Website thương mại điện tử cho cửa hàng đồ len handmade tại Việt Nam**

Storefront • Giỏ hàng & thanh toán • Tài khoản khách hàng • Blog rich-text • Trang quản trị • Thông báo đơn qua Zalo Bot

[![Go](https://img.shields.io/badge/Go-1.27-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## Giới thiệu

Website bán hàng hoàn chỉnh — không phải demo — cho shop **Nhà Len Nhỏ**:

- Khách đặt hàng qua giỏ hàng hoặc đặt làm riêng, thanh toán **chuyển khoản QR (VietQR)** hoặc **COD**
- Chủ shop nhận **thông báo đơn hàng tức thì qua Zalo Bot** vào nhóm Zalo
- Quản trị toàn bộ sản phẩm, đơn hàng, bài viết, khách hàng, đánh giá trong một trang admin

Nguyên tắc thiết kế: **mọi logic nghiệp vụ và bảo mật nằm ở backend Go** — validation,
phân quyền, rate limiting, và giá bán luôn tính từ database (client không gửi được giá).
Frontend chỉ là lớp trình bày.

## 🧱 Kiến trúc

```
┌─────────────────────┐        ┌──────────────────────┐
│   Next.js (SSR)     │  HTTP  │      Go API          │
│   storefront/admin  │ ─────► │  chi v5 + pgx v5     │
│   Tailwind v4       │  JSON  │  validation · auth   │
└─────────────────────┘        │  rate limit · Zalo   │
                               └──────────┬───────────┘
                                          │ pgx pool
                               ┌──────────▼───────────┐
                               │     PostgreSQL 18    │
                               │  migrations + seed   │
                               └──────────────────────┘
```

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Tiptap 3 |
| Backend | Go 1.27 · chi v5 · pgx v5 · Argon2id · bluemonday |
| Database | PostgreSQL 18 · golang-migrate |
| Deploy | Docker · Cloudflare Workers + Render + Aiven (free combo) hoặc VPS |

## ✨ Chức năng

**Khách hàng**

- Trang chủ, danh mục, chi tiết sản phẩm; tìm kiếm & bộ lọc (từ khóa, danh mục, màu, khoảng giá) — trạng thái lưu trên URL
- **Tùy chọn sản phẩm** (màu / kích thước / chất liệu / đóng gói) — chênh giá do backend tính
- Giỏ hàng (lưu trên thiết bị) + `/checkout` có **idempotency key** chống đặt trùng đơn
- Tài khoản khách: đăng ký / đăng nhập / đổi mật khẩu / theo dõi đơn
- Cổng đăng nhập chung tự nhận vai trò: admin → `/admin`, khách → `/account`
- Danh sách yêu thích, đánh giá (chờ duyệt), blog, đặt làm riêng, liên hệ
- SEO: metadata động, JSON-LD (`Store`/`Product`/`BlogPosting`), sitemap, robots

**Quản trị**

- Sản phẩm: ảnh nhiều tấm (cắt vuông 1:1), tùy chọn + chênh giá, link Shopee riêng
- Bài viết: rich text Tiptap — chèn ảnh bằng dán/kéo thả; **sanitize server-side bằng bluemonday**; hẹn giờ đăng; đăng hàng loạt
- Đơn hàng & đặt làm riêng: đổi trạng thái, đối chiếu chuyển khoản, ghi chú nội bộ
- Khách hàng: tìm kiếm, sửa thông tin, xóa **ẩn danh hóa** đơn hàng cũ
- Đánh giá: duyệt / ẩn / xóa
- Cài đặt: test Zalo Bot ("Gửi tin thử", lấy chatId)

**Thông báo Zalo Bot**

- Đơn mới (checkout & đặt nhanh), khách báo chuyển khoản, yêu cầu đặt làm riêng → đẩy vào nhóm Zalo
- Gửi bất đồng bộ — Zalo chậm/lỗi không bao giờ làm khách đặt hàng thất bại
- Dùng nền tảng **Zalo Bot chính thức** (miễn phí), không phải unofficial API

## 🚀 Chạy local (development)

```bash
cp .env.example .env.dev           # điền giá trị thật cho các biến TODO(owner)
docker compose --env-file .env.dev -f compose.dev.yml up --build
```

Lần chạy đầu tự động: khởi động PostgreSQL → chạy migrations + seed dữ liệu mẫu →
tạo tài khoản admin từ `ADMIN_EMAIL` / `ADMIN_PASSWORD` (**không có mật khẩu mặc
định cứng** — tự đặt và giữ bí mật).

| Địa chỉ | |
|---|---|
| Website | http://localhost:3000 |
| API | http://localhost:8080/healthz |
| Trang quản trị | http://localhost:3000/admin |

## 🔒 Bảo mật

- Mật khẩu hash **Argon2id** (OWASP parameters); session token chỉ lưu dạng SHA-256 hash, thu hồi khi đổi mật khẩu
- CSRF (Origin check + token) cho mọi request thay đổi trạng thái; cookie `HttpOnly`/`Secure`/`SameSite`
- CORS allowlist cứng (chặn wildcard); CSP chặt ở cả frontend và API
- Rate limiting nhiều lớp theo IP (global / login / form) + throttle thất bại theo tài khoản; limiter tự dọn bucket chống memory-DoS
- RealIP chỉ tin proxy trong `TRUSTED_PROXY_CIDRS` — chống giả mạo `X-Forwarded-For`
- Upload ảnh: chỉ admin, decode lại (không tin extension), re-encode xóa metadata, tên file random hex, lưu trong database
- Mật khẩu mẫu/dễ đoán bị từ chối khi seed và khi đổi mật khẩu
- Kiểm định một lệnh: `./scripts/security-checks.sh` (vet · test · govulncheck · gosec · typecheck · lint · audit · quét secret)

## ☁️ Triển khai production

Hai phương án đều đã chuẩn bị sẵn trong repo:

| | Free combo (đang dùng) | VPS tự quản |
|---|---|---|
| Frontend | Cloudflare Workers (OpenNext) | Docker trên VPS |
| Backend | Render (free) + keep-alive ping | Docker trên VPS |
| Database | Aiven free PostgreSQL | Docker volume |
| Chi phí | **0 USD/tháng** | ~2 USD/tháng |
| Cấu hình | `render.yaml` + `frontend/wrangler.jsonc` | `compose.prod.yml` |

Đường VPS: không publish cổng host nào, PostgreSQL chỉ nằm trên mạng nội bộ,
containers chạy non-root, service `migrate` chạy migration trước backend.
Backup/khôi phục: `./scripts/backup.sh` · `./scripts/restore-db.sh` ·
cập nhật an toàn: `./scripts/prod-update.sh`.

## 📁 Cấu trúc dự án

```
frontend/               Next.js App Router
  src/app/              storefront, /account, /admin
  src/components/       UI + admin (rich-text editor, option editor…)
  src/lib/              api-client (CSRF), cart, site-config
backend/
  cmd/api · cmd/migrate binaries
  internal/
    handler/            HTTP routes (router.go liệt kê tất cả)
    service/            nghiệp vụ đơn hàng, thông báo Zalo Bot
    repository/         truy vấn pgx parameterized
    auth/               Argon2id + từ chối mật khẩu yếu
    middleware/         CORS, rate limit, RealIP hardened
    media/              validate + re-encode ảnh upload
    sanitize/           allowlist HTML cho blog (bluemonday)
    db/                 migrations + seed
scripts/                backup · restore · prod-update · security-checks
render.yaml             Blueprint deploy backend (Render)
```

## ⚙️ Biến môi trường

- Mẫu đầy đủ với placeholder: [`.env.example`](.env.example)
- File env thật (`.env.dev`, `.env.production`, `.env.cloudflare`) **không bao giờ commit**
- `NEXT_PUBLIC_*` được nhúng vào bundle trình duyệt — chỉ chứa giá trị công khai
- Bí mật chỉ nằm ở server: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD`, `ZALO_BOT_TOKEN`, chuỗi kết nối DB

</div>
