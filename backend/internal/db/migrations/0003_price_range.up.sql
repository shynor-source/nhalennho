-- 0003: optional maximum sale price for products with several price tiers.
ALTER TABLE products
    ADD COLUMN price_max_vnd BIGINT
        CHECK (price_max_vnd IS NULL OR price_max_vnd >= price_vnd);
