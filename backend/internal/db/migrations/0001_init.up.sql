-- 0001_init: initial schema.
-- Money is stored as integer Vietnamese dong (BIGINT), never floating point.
-- Timestamps are TIMESTAMPTZ (UTC in storage).

CREATE TABLE admin_users (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Server-side sessions. Only a hash of the session token is stored.
CREATE TABLE admin_sessions (
    id            BIGSERIAL PRIMARY KEY,
    token_hash    TEXT NOT NULL UNIQUE,
    admin_user_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    csrf_token    TEXT NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_sessions_user_idx ON admin_sessions (admin_user_id);
CREATE INDEX admin_sessions_expires_idx ON admin_sessions (expires_at);

CREATE TABLE categories (
    id          BIGSERIAL PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
    id          BIGSERIAL PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    price_vnd   BIGINT NOT NULL CHECK (price_vnd >= 0),
    colors      TEXT[] NOT NULL DEFAULT '{}',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON products (category_id);
CREATE INDEX products_active_idx ON products (is_active);
CREATE INDEX products_price_idx ON products (price_vnd);
CREATE INDEX products_colors_idx ON products USING GIN (colors);

CREATE TABLE order_requests (
    id            BIGSERIAL PRIMARY KEY,
    code          TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    phone         TEXT NOT NULL,
    address       TEXT NOT NULL,
    note          TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'received'
        CHECK (status IN ('received', 'confirmed', 'making', 'shipped', 'completed', 'cancelled')),
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_requests_status_idx ON order_requests (status);
CREATE INDEX order_requests_created_idx ON order_requests (created_at DESC);

CREATE TABLE order_items (
    id               BIGSERIAL PRIMARY KEY,
    order_request_id BIGINT NOT NULL REFERENCES order_requests(id) ON DELETE CASCADE,
    product_id       BIGINT REFERENCES products(id) ON DELETE SET NULL,
    product_name     TEXT NOT NULL,
    unit_price_vnd   BIGINT NOT NULL CHECK (unit_price_vnd >= 0),
    quantity         INTEGER NOT NULL CHECK (quantity > 0)
);
CREATE INDEX order_items_order_idx ON order_items (order_request_id);

CREATE TABLE custom_order_requests (
    id            BIGSERIAL PRIMARY KEY,
    code          TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    phone         TEXT NOT NULL,
    address       TEXT NOT NULL DEFAULT '',
    note          TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'received'
        CHECK (status IN ('received', 'confirmed', 'making', 'shipped', 'completed', 'cancelled')),
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX custom_order_requests_status_idx ON custom_order_requests (status);
CREATE INDEX custom_order_requests_created_idx ON custom_order_requests (created_at DESC);

CREATE TABLE reviews (
    id          BIGSERIAL PRIMARY KEY,
    product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body        TEXT NOT NULL DEFAULT '',
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reviews_product_approved_idx ON reviews (product_id) WHERE is_approved;

CREATE TABLE blog_posts (
    id           BIGSERIAL PRIMARY KEY,
    slug         TEXT NOT NULL UNIQUE,
    title        TEXT NOT NULL,
    excerpt      TEXT NOT NULL DEFAULT '',
    content      TEXT NOT NULL DEFAULT '',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX blog_posts_published_idx ON blog_posts (is_published, published_at DESC);
