<div align="center">

# 🧶 Nha Len Nho

**E-commerce website for a handmade crochet & yarn shop in Vietnam**

Storefront • Cart & checkout • Customer accounts • Rich-text blog • Admin panel • Zalo Bot order notifications

[![Go](https://img.shields.io/badge/Go-1.27-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## About

A complete, production-ready e-commerce website — not a demo — built for the **Nha Len Nho** handmade yarn shop:

- Customers order via cart or a custom-order form, paying by **bank-transfer QR (VietQR)** or **cash on delivery**
- The shop owner receives **instant order notifications via Zalo Bot** into a Zalo group chat
- Full admin panel for products, orders, blog posts, customers, and reviews

Design principle: **all business logic and security live in the Go backend** — validation,
authorization, rate limiting, and pricing are always computed from the database (clients
cannot tamper with prices). The frontend is a presentation layer only.

## 🧱 Architecture

```
┌─────────────────────┐        ┌──────────────────────┐
│   Next.js (SSR)     │  HTTP  │       Go API         │
│   storefront/admin  │ ─────► │   chi v5 + pgx v5    │
│   Tailwind v4       │  JSON  │  validation · auth   │
└─────────────────────┘        │  rate limit · Zalo   │
                               └──────────┬───────────┘
                                          │ pgx pool
                               ┌──────────▼───────────┐
                               │     PostgreSQL 18    │
                               │  migrations + seed   │
                               └──────────────────────┘
```

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Tiptap 3 |
| Backend | Go 1.27 · chi v5 · pgx v5 · Argon2id · bluemonday |
| Database | PostgreSQL 18 · golang-migrate |
| Deployment | Docker · Cloudflare Workers + Render + Aiven (free combo) or a self-managed VPS |

## ✨ Features

**Customer**

- Home, catalog, product detail pages; search & filtering (keyword, category, color, price range) with URL-persisted state
- **Product options** (color / size / material / packaging) with price deltas computed by the backend
- Cart (device-local) + `/checkout` protected by an **idempotency key** against duplicate orders
- Customer accounts: sign up / sign in / change password / order history
- Single login gateway that auto-detects the role: admin → `/admin`, customer → `/account`
- Wishlist, product reviews (moderated), blog, custom-order form, contact page
- SEO: dynamic metadata, JSON-LD (`Store` / `Product` / `BlogPosting`), sitemap, robots

**Admin**

- Products: multiple images (built-in 1:1 crop), options with price deltas, per-product Shopee link
- Blog: Tiptap rich text — paste/drag images; content is **sanitized server-side with bluemonday**; scheduled and bulk publishing
- Orders & custom orders: status workflow, transfer reconciliation, internal notes
- Customers: search, contact editing, deletion that **anonymizes** past orders
- Reviews: approve / hide / delete
- Settings: Zalo Bot test send & chat discovery

**Zalo Bot notifications**

- New orders (checkout & quick-order), transfer reports, and custom-order requests → pushed to the owner's Zalo group
- Sent asynchronously — a slow or failing Zalo API never blocks a customer's checkout
- Built on the **official Zalo Bot platform** (free), not an unofficial API

## 🚀 Local development

```bash
cp .env.example .env.dev           # fill in real values for the TODO(owner) vars
docker compose --env-file .env.dev -f compose.dev.yml up --build
```

On first run the stack automatically: starts PostgreSQL → applies migrations and seeds
sample data → creates the admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
(**no hard-coded default password** — set your own and keep it secret).

| Endpoint | |
|---|---|
| Website | http://localhost:3000 |
| API | http://localhost:8080/healthz |
| Admin panel | http://localhost:3000/admin |

## 🔒 Security

- Passwords hashed with **Argon2id** (OWASP parameters); session tokens stored as SHA-256 hashes, revoked on password change
- CSRF protection (Origin check + token) on every state-changing request; `HttpOnly` / `Secure` / `SameSite` cookies
- Strict CORS allowlist (wildcard rejected); strict CSP on both the frontend and the API
- Layered per-IP rate limiting (global / login / public forms) plus per-account failure throttling; the limiter evicts expired buckets to resist memory-exhaustion DoS
- Hardened RealIP: proxy headers are trusted only from `TRUSTED_PROXY_CIDRS` — resists `X-Forwarded-For` spoofing
- Image uploads: admin-only, decoded (extension never trusted), re-encoded to strip metadata, random-hex filenames, stored in the database
- Sample/guessable passwords are rejected at seed time and on password change
- One-command verification: `./scripts/security-checks.sh` (vet · test · govulncheck · gosec · typecheck · lint · audit · secret scan)

## ☁️ Production deployment

Two deployment paths are prepared in the repo:

| | Free combo (in use) | Self-managed VPS |
|---|---|---|
| Frontend | Cloudflare Workers (OpenNext) | Docker on a VPS |
| Backend | Render (free) + keep-alive ping | Docker on a VPS |
| Database | Aiven free PostgreSQL | Docker volume |
| Cost | **$0/month** | ~$2/month |
| Configuration | `render.yaml` + `frontend/wrangler.jsonc` | `compose.prod.yml` |

The VPS path publishes no host ports, keeps PostgreSQL on a private Docker network,
runs containers as non-root, and applies migrations before the API starts.
Backup/restore: `./scripts/backup.sh` · `./scripts/restore-db.sh` · safe updates:
`./scripts/prod-update.sh`.

## 📁 Project layout

```
frontend/               Next.js App Router
  src/app/              storefront, /account, /admin
  src/components/       UI + admin (rich-text editor, option editor…)
  src/lib/              api-client (CSRF), cart, site-config
backend/
  cmd/api · cmd/migrate binaries
  internal/
    handler/            HTTP routes (router.go lists everything)
    service/            order logic, Zalo Bot notifier
    repository/         parameterized pgx queries
    auth/               Argon2id + weak-password rejection
    middleware/         CORS, rate limiting, hardened RealIP
    media/              upload validation + re-encoding
    sanitize/           blog HTML allowlist (bluemonday)
    db/                 migrations + seed
scripts/                backup · restore · prod-update · security-checks
render.yaml             Backend blueprint (Render)
```

## ⚙️ Environment variables

- Full template with placeholders: [`.env.example`](.env.example)
- Real env files (`.env.dev`, `.env.production`, `.env.cloudflare`) are **never committed**
- `NEXT_PUBLIC_*` values are inlined into the browser bundle — public values only
- Secrets live server-side only: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD`, `ZALO_BOT_TOKEN`, the DB connection string
