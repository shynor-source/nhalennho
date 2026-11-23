package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/qg/web/backend/internal/model"
)

// ErrNotFound is returned when a requested record does not exist.
var ErrNotFound = errors.New("not found")

func (db *DB) ListCategories(ctx context.Context) ([]model.Category, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT id, slug, name, description, sort_order
		FROM categories
		ORDER BY sort_order, name`)
	if err != nil {
		return nil, fmt.Errorf("list categories: %w", err)
	}
	defer rows.Close()

	var out []model.Category
	for rows.Next() {
		var c model.Category
		if err := rows.Scan(&c.ID, &c.Slug, &c.Name, &c.Description, &c.SortOrder); err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (db *DB) GetCategoryBySlug(ctx context.Context, slug string) (*model.Category, error) {
	var c model.Category
	err := db.Pool.QueryRow(ctx, `
		SELECT id, slug, name, description, sort_order
		FROM categories WHERE slug = $1`, slug).
		Scan(&c.ID, &c.Slug, &c.Name, &c.Description, &c.SortOrder)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get category: %w", err)
	}
	return &c, nil
}

// ListProducts returns products matching the filter. All user input is passed
// as bound parameters; only fixed query fragments are concatenated.
func (db *DB) ListProducts(ctx context.Context, f model.ProductFilter) ([]model.Product, error) {
	where := []string{"1=1"}
	args := []any{}
	add := func(clause string, value any) {
		args = append(args, value)
		where = append(where, fmt.Sprintf(clause, len(args)))
	}

	if f.ActiveOnly {
		where = append(where, "p.is_active = TRUE")
	}
	if f.Query != "" {
		add(`(p.name ILIKE '%%' || $%[1]d || '%%' OR p.description ILIKE '%%' || $%[1]d || '%%')`, f.Query)
	}
	if f.CategorySlug != "" {
		add("c.slug = $%d", f.CategorySlug)
	}
	if f.Color != "" {
		add("$%d = ANY(p.colors)", f.Color)
	}
	if f.MinPrice != nil {
		add("p.price_vnd >= $%d", *f.MinPrice)
	}
	if f.MaxPrice != nil {
		add("p.price_vnd <= $%d", *f.MaxPrice)
	}

	order := "p.created_at DESC"
	switch f.Sort {
	case "price_asc":
		order = "p.price_vnd ASC"
	case "price_desc":
		order = "p.price_vnd DESC"
	}

	args = append(args, f.Limit, f.Offset)
	limitPos := len(args) - 1
	offsetPos := len(args)

	query := fmt.Sprintf(`
		SELECT p.id, p.slug, p.name, p.description, p.category_id,
		       COALESCE(c.slug, ''), COALESCE(c.name, ''),
		       p.price_vnd, p.price_max_vnd, p.colors, p.is_active, p.shopee_url, p.created_at, p.updated_at, COALESCE((SELECT pi.path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1), '')
		FROM products p
		LEFT JOIN categories c ON c.id = p.category_id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`,
		strings.Join(where, " AND "), order, limitPos, offsetPos)

	rows, err := db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}
	defer rows.Close()
	return scanProducts(rows)
}

// CountProducts returns the total number of products matching the filter.
func (db *DB) CountProducts(ctx context.Context, f model.ProductFilter) (int, error) {
	where := []string{"1=1"}
	args := []any{}
	add := func(clause string, value any) {
		args = append(args, value)
		where = append(where, fmt.Sprintf(clause, len(args)))
	}
	if f.ActiveOnly {
		where = append(where, "p.is_active = TRUE")
	}
	if f.Query != "" {
		add(`(p.name ILIKE '%%' || $%[1]d || '%%' OR p.description ILIKE '%%' || $%[1]d || '%%')`, f.Query)
	}
	if f.CategorySlug != "" {
		add("c.slug = $%d", f.CategorySlug)
	}
	if f.Color != "" {
		add("$%d = ANY(p.colors)", f.Color)
	}
	if f.MinPrice != nil {
		add("p.price_vnd >= $%d", *f.MinPrice)
	}
	if f.MaxPrice != nil {
		add("p.price_vnd <= $%d", *f.MaxPrice)
	}

	query := fmt.Sprintf(`
		SELECT count(*)
		FROM products p
		LEFT JOIN categories c ON c.id = p.category_id
		WHERE %s`, strings.Join(where, " AND "))

	var n int
	if err := db.Pool.QueryRow(ctx, query, args...).Scan(&n); err != nil {
		return 0, fmt.Errorf("count products: %w", err)
	}
	return n, nil
}

func (db *DB) GetProductBySlug(ctx context.Context, slug string, activeOnly bool) (*model.Product, error) {
	query := `
		SELECT p.id, p.slug, p.name, p.description, p.category_id,
		       COALESCE(c.slug, ''), COALESCE(c.name, ''),
		       p.price_vnd, p.price_max_vnd, p.colors, p.is_active, p.shopee_url, p.created_at, p.updated_at, COALESCE((SELECT pi.path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1), '')
		FROM products p
		LEFT JOIN categories c ON c.id = p.category_id
		WHERE p.slug = $1`
	if activeOnly {
		query += " AND p.is_active = TRUE"
	}
	return scanProduct(db.Pool.QueryRow(ctx, query, slug))
}

func (db *DB) GetProductByID(ctx context.Context, id int64) (*model.Product, error) {
	return scanProduct(db.Pool.QueryRow(ctx, `
		SELECT p.id, p.slug, p.name, p.description, p.category_id,
		       COALESCE(c.slug, ''), COALESCE(c.name, ''),
		       p.price_vnd, p.price_max_vnd, p.colors, p.is_active, p.shopee_url, p.created_at, p.updated_at, COALESCE((SELECT pi.path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1), '')
		FROM products p
		LEFT JOIN categories c ON c.id = p.category_id
		WHERE p.id = $1`, id))
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanProduct(row rowScanner) (*model.Product, error) {
	var p model.Product
	err := row.Scan(&p.ID, &p.Slug, &p.Name, &p.Description, &p.CategoryID,
		&p.CategorySlug, &p.CategoryName, &p.PriceVND, &p.PriceMaxVND, &p.Colors, &p.IsActive,
		&p.ShopeeURL, &p.CreatedAt, &p.UpdatedAt, &p.CoverImage)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan product: %w", err)
	}
	return &p, nil
}

func scanProducts(rows pgx.Rows) ([]model.Product, error) {
	var out []model.Product
	for rows.Next() {
		var p model.Product
		if err := rows.Scan(&p.ID, &p.Slug, &p.Name, &p.Description, &p.CategoryID,
			&p.CategorySlug, &p.CategoryName, &p.PriceVND, &p.PriceMaxVND, &p.Colors, &p.IsActive,
			&p.ShopeeURL, &p.CreatedAt, &p.UpdatedAt, &p.CoverImage); err != nil {
			return nil, fmt.Errorf("scan product: %w", err)
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (db *DB) ListApprovedReviews(ctx context.Context, productID int64) ([]model.Review, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT id, product_id, author_name, rating, body, created_at
		FROM reviews
		WHERE product_id = $1 AND is_approved = TRUE
		ORDER BY created_at DESC`, productID)
	if err != nil {
		return nil, fmt.Errorf("list reviews: %w", err)
	}
	defer rows.Close()

	var out []model.Review
	for rows.Next() {
		var r model.Review
		if err := rows.Scan(&r.ID, &r.ProductID, &r.AuthorName, &r.Rating, &r.Body, &r.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan review: %w", err)
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// CreateReview stores a review as unapproved (moderation pending).
func (db *DB) CreateReview(ctx context.Context, productID int64, author string, rating int, body string) error {
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO reviews (product_id, author_name, rating, body, is_approved)
		VALUES ($1, $2, $3, $4, FALSE)`, productID, author, rating, body)
	if err != nil {
		return fmt.Errorf("create review: %w", err)
	}
	return nil
}
