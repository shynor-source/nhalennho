-- 0004: customer accounts, sessions, and payment state on orders.

CREATE TABLE customers (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    phone         TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customer_sessions (
    id          BIGSERIAL PRIMARY KEY,
    token_hash  TEXT NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    csrf_token  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX customer_sessions_customer_idx ON customer_sessions (customer_id);
CREATE INDEX customer_sessions_expires_idx ON customer_sessions (expires_at);

ALTER TABLE order_requests
    ADD COLUMN customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
    ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'submitted', 'paid'));

CREATE INDEX order_requests_customer_idx ON order_requests (customer_id);
