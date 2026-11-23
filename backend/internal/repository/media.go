package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// MediaFile is a stored, re-encoded uploaded image (ADR-0013).
type MediaFile struct {
	Name        string
	ContentType string
	Data        []byte
	CreatedAt   time.Time
}

// InsertMediaFile persists a processed image.
func (db *DB) InsertMediaFile(ctx context.Context, f MediaFile) error {
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO media_files (name, content_type, data)
		VALUES ($1, $2, $3)`, f.Name, f.ContentType, f.Data)
	if err != nil {
		return fmt.Errorf("insert media file: %w", err)
	}
	return nil
}

// GetMediaFile returns a stored image by its server-generated name.
func (db *DB) GetMediaFile(ctx context.Context, name string) (MediaFile, error) {
	var f MediaFile
	err := db.Pool.QueryRow(ctx, `
		SELECT name, content_type, data, created_at FROM media_files WHERE name = $1`,
		name).Scan(&f.Name, &f.ContentType, &f.Data, &f.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return MediaFile{}, ErrNotFound
		}
		return MediaFile{}, fmt.Errorf("get media file: %w", err)
	}
	return f, nil
}

// DeleteMediaFile removes a stored image; missing names are not an error.
func (db *DB) DeleteMediaFile(ctx context.Context, name string) error {
	_, err := db.Pool.Exec(ctx, `DELETE FROM media_files WHERE name = $1`, name)
	if err != nil {
		return fmt.Errorf("delete media file: %w", err)
	}
	return nil
}

// ProductSlugExists reports whether a product slug is already taken.
func (db *DB) ProductSlugExists(ctx context.Context, slug string, excludeID int64) (bool, error) {
	var exists bool
	err := db.Pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM products WHERE slug = $1 AND id <> $2)`,
		slug, excludeID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check product slug: %w", err)
	}
	return exists, nil
}

// PostSlugExists reports whether a blog slug is already taken.
func (db *DB) PostSlugExists(ctx context.Context, slug string, excludeID int64) (bool, error) {
	var exists bool
	err := db.Pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM blog_posts WHERE slug = $1 AND id <> $2)`,
		slug, excludeID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check post slug: %w", err)
	}
	return exists, nil
}

// ListProductImages returns the ordered relative image paths for a product.
func (db *DB) ListProductImages(ctx context.Context, productID int64) ([]string, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT path FROM product_images
		WHERE product_id = $1
		ORDER BY sort_order, id`, productID)
	if err != nil {
		return nil, fmt.Errorf("list product images: %w", err)
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, fmt.Errorf("scan product image: %w", err)
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// ReplaceProductImages replaces all images for a product in one transaction and
// returns the paths that are no longer referenced (for file cleanup).
func (db *DB) ReplaceProductImages(ctx context.Context, productID int64, paths []string) ([]string, error) {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	rows, err := tx.Query(ctx, `SELECT path FROM product_images WHERE product_id = $1`, productID)
	if err != nil {
		return nil, fmt.Errorf("load existing images: %w", err)
	}
	existing := map[string]bool{}
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan existing image: %w", err)
		}
		existing[p] = true
	}
	rows.Close()

	if _, err := tx.Exec(ctx, `DELETE FROM product_images WHERE product_id = $1`, productID); err != nil {
		return nil, fmt.Errorf("clear product images: %w", err)
	}

	kept := map[string]bool{}
	for i, path := range paths {
		kept[path] = true
		if _, err := tx.Exec(ctx, `
			INSERT INTO product_images (product_id, path, sort_order)
			VALUES ($1, $2, $3)`, productID, path, i); err != nil {
			return nil, fmt.Errorf("insert product image: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit images: %w", err)
	}

	var removed []string
	for p := range existing {
		if !kept[p] {
			removed = append(removed, p)
		}
	}
	return removed, nil
}

// ProductImageExists reports whether any product still references a path.
func (db *DB) ProductImageReferenced(ctx context.Context, path string) (bool, error) {
	var exists bool
	err := db.Pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM product_images WHERE path = $1)`, path).Scan(&exists)
	if err != nil && err != pgx.ErrNoRows {
		return false, fmt.Errorf("check image reference: %w", err)
	}
	return exists, nil
}
