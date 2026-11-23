-- 0007: product options (color, size, material, packaging) and per-option
-- price deltas; store the customer's selection on each order item.
--
-- Kind semantics:
--   color, size, material — optional; only present when the product is
--                           actually classified by that dimension.
--   packaging             — present on EVERY product (backfilled below and
--                           auto-created for new products); the customer picks
--                           between regular packaging and gift wrapping.

CREATE TABLE product_options (
    id         BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL
        CHECK (kind IN ('color', 'size', 'material', 'packaging')),
    position   INT NOT NULL DEFAULT 0,
    UNIQUE (product_id, kind)
);
CREATE INDEX product_options_product_idx ON product_options (product_id);

CREATE TABLE product_option_values (
    id              BIGSERIAL PRIMARY KEY,
    option_id       BIGINT NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
    value           TEXT NOT NULL,
    -- NULL means this option value does not affect the price; a number is
    -- an amount ADDED to the product base price.
    price_delta_vnd BIGINT CHECK (price_delta_vnd IS NULL OR price_delta_vnd >= 0),
    position        INT NOT NULL DEFAULT 0
);
CREATE INDEX product_option_values_option_idx ON product_option_values (option_id);

ALTER TABLE order_items
    ADD COLUMN options JSONB NOT NULL DEFAULT '[]';

-- Backfill: every existing product gets the mandatory packaging option.
INSERT INTO product_options (product_id, kind, position)
SELECT id, 'packaging', 3
FROM products
ON CONFLICT (product_id, kind) DO NOTHING;

INSERT INTO product_option_values (option_id, value, price_delta_vnd, position)
SELECT o.id, v.val, 0, v.pos
FROM product_options o
CROSS JOIN (VALUES ('Đóng gói thường', 1), ('Đóng gói quà tặng', 2)) AS v(val, pos)
WHERE o.kind = 'packaging';
