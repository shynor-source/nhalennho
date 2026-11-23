-- 0002: product images.
-- Files live on the uploads volume; rows store a server-generated relative path
-- (e.g. /media/<32-hex>.jpg). Never store user-supplied filenames.

CREATE TABLE product_images (
    id         BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    path       TEXT NOT NULL,
    alt        TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX product_images_product_idx ON product_images (product_id, sort_order);
