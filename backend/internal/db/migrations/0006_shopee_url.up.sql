-- 0006: optional Shopee product page link, shown as a "buy on Shopee" button.
ALTER TABLE products
    ADD COLUMN shopee_url TEXT NOT NULL DEFAULT '';
