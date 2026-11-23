ALTER TABLE order_requests
    DROP COLUMN IF EXISTS customer_id,
    DROP COLUMN IF EXISTS payment_method,
    DROP COLUMN IF EXISTS payment_status;

DROP TABLE IF EXISTS customer_sessions;
DROP TABLE IF EXISTS customers;
