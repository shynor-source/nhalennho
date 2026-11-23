package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"

	"github.com/qg/web/backend/internal/model"
)

// ErrSlugTaken is returned when a product slug already exists.
var ErrSlugTaken = errors.New("slug already exists")

// ErrOptionValidation marks a 400-worthy problem in the option payload.
var ErrOptionValidation = errors.New("option validation")

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func (db *DB) CreateProduct(ctx context.Context, in model.ProductInput) (*model.Product, error) {
	var id int64
	err := db.Pool.QueryRow(ctx, `
		INSERT INTO products (slug, name, description, category_id, price_vnd, price_max_vnd, colors, is_active, shopee_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id`,
		in.Slug, in.Name, in.Description, in.CategoryID, in.PriceVND, in.PriceMaxVND, in.Colors, in.IsActive, in.ShopeeURL).Scan(&id)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrSlugTaken
		}
		return nil, fmt.Errorf("create product: %w", err)
	}
	return db.GetProductByID(ctx, id)
}

func (db *DB) UpdateProduct(ctx context.Context, id int64, in model.ProductInput) (*model.Product, error) {
	tag, err := db.Pool.Exec(ctx, `
		UPDATE products
		SET slug = $2, name = $3, description = $4, category_id = $5,
		    price_vnd = $6, price_max_vnd = $7, colors = $8, is_active = $9, shopee_url = $10, updated_at = now()
		WHERE id = $1`,
		id, in.Slug, in.Name, in.Description, in.CategoryID, in.PriceVND, in.PriceMaxVND, in.Colors, in.IsActive, in.ShopeeURL)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrSlugTaken
		}
		return nil, fmt.Errorf("update product: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return db.GetProductByID(ctx, id)
}

func (db *DB) DeleteProduct(ctx context.Context, id int64) error {
	tag, err := db.Pool.Exec(ctx, `DELETE FROM products WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete product: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ListProductColors returns the distinct colors used across products.
func (db *DB) ListProductColors(ctx context.Context) ([]string, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT DISTINCT unnest(colors) AS color
		FROM products
		ORDER BY color`)
	if err != nil {
		return nil, fmt.Errorf("list colors: %w", err)
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var c string
		if err := rows.Scan(&c); err != nil {
			return nil, fmt.Errorf("scan color: %w", err)
		}
		out = append(out, c)
	}
	return out, rows.Err()
}
