-- 0005: checkout idempotency, admin notes, and review moderation support.

ALTER TABLE order_requests
    ADD COLUMN idempotency_key TEXT,
    ADD COLUMN admin_note TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX order_requests_idempotency_key_idx
    ON order_requests (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

ALTER TABLE custom_order_requests
    ADD COLUMN admin_note TEXT NOT NULL DEFAULT '';
