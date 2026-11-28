-- Unique-visitor dedup for the daily counters (owner decision, 2026-11-28):
-- one view per IP per day (and per product for product-scoped events).
--
-- Privacy (ADR-0015 still holds): rows store an HMAC-SHA256 hash of the IP
-- keyed with the server secret and the day — never the IP itself. The day is
-- part of the HMAC input, so the same IP hashes differently on different days
-- and nothing can be linked across days. Rows are pruned after 3 days.

CREATE TABLE page_visitor_days (
    day     DATE NOT NULL,
    ip_hash TEXT NOT NULL,
    PRIMARY KEY (day, ip_hash)
);

CREATE TABLE product_view_visitor_days (
    day        DATE   NOT NULL,
    product_id BIGINT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    ip_hash    TEXT   NOT NULL,
    PRIMARY KEY (day, product_id, ip_hash)
);

CREATE TABLE product_fav_visitor_days (
    day        DATE   NOT NULL,
    product_id BIGINT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    ip_hash    TEXT   NOT NULL,
    PRIMARY KEY (day, product_id, ip_hash)
);

CREATE INDEX idx_page_visitor_cleanup      ON page_visitor_days (day);
CREATE INDEX idx_product_visitor_cleanup   ON product_view_visitor_days (day);
CREATE INDEX idx_product_fav_cleanup       ON product_fav_visitor_days (day);
