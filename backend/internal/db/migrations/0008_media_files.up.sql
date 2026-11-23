-- Uploaded images move from disk volumes into the database.
--
-- Why (ADR-0013): the free-PaaS deployment targets (Render free backend,
-- Cloudflare free frontend) have ephemeral or no writable persistent disks,
-- but PostgreSQL storage is managed by Aiven's free tier and survives
-- redeploys. Re-encoded, metadata-stripped images are small (tens of KB), so
-- bytea storage is fine for a shop of this size.
CREATE TABLE media_files (
    name         TEXT PRIMARY KEY, -- "<32-hex>.(jpg|png)", generated server-side
    content_type TEXT NOT NULL,    -- image/jpeg or image/png
    data         BYTEA NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
