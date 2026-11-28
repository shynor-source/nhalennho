-- Lightweight, identity-free analytics (ADR-0015).
--
-- Daily aggregate counters only: no IPs, no cookies, no sessions — the
-- storefront posts anonymous events (page_view / product_view /
-- wishlist_add) and the backend bumps today's counters. Enough for a small
-- shop's "what is being looked at / liked" questions without PII.

-- Storefront page views, one row per day.
CREATE TABLE page_views_daily (
    day  DATE PRIMARY KEY,
    hits BIGINT NOT NULL DEFAULT 0
);

-- Per-product product-page views.
CREATE TABLE product_views_daily (
    day        DATE   NOT NULL,
    product_id BIGINT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    hits       BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (day, product_id)
);

-- Per-product wishlist adds (only "add" actions are counted).
CREATE TABLE product_favorites_daily (
    day        DATE   NOT NULL,
    product_id BIGINT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    hits       BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (day, product_id)
);

CREATE INDEX idx_product_views_recent  ON product_views_daily (day, product_id);
CREATE INDEX idx_product_fav_recent    ON product_favorites_daily (day, product_id);
