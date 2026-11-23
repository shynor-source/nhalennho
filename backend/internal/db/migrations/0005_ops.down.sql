DROP INDEX IF EXISTS order_requests_idempotency_key_idx;
ALTER TABLE order_requests
    DROP COLUMN IF EXISTS idempotency_key,
    DROP COLUMN IF EXISTS admin_note;
ALTER TABLE custom_order_requests
    DROP COLUMN IF EXISTS admin_note;
