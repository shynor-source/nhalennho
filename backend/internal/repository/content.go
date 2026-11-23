package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/qg/web/backend/internal/model"
)

func (db *DB) ListPublishedPosts(ctx context.Context, limit, offset int) ([]model.BlogPost, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT id, slug, title, excerpt, content, is_published, published_at, created_at, updated_at
		FROM blog_posts
		WHERE is_published = TRUE AND (published_at IS NULL OR published_at <= now())
		ORDER BY published_at DESC NULLS LAST, created_at DESC
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list posts: %w", err)
	}
	defer rows.Close()
	var out []model.BlogPost
	for rows.Next() {
		var p model.BlogPost
		if err := rows.Scan(&p.ID, &p.Slug, &p.Title, &p.Excerpt, &p.Content, &p.IsPublished,
			&p.PublishedAt, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan post: %w", err)
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (db *DB) CountPublishedPosts(ctx context.Context) (int, error) {
	var n int
	if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM blog_posts WHERE is_published = TRUE AND (published_at IS NULL OR published_at <= now())`).Scan(&n); err != nil {
		return 0, fmt.Errorf("count posts: %w", err)
	}
	return n, nil
}

func (db *DB) GetPublishedPostBySlug(ctx context.Context, slug string) (*model.BlogPost, error) {
	var p model.BlogPost
	err := db.Pool.QueryRow(ctx, `
		SELECT id, slug, title, excerpt, content, is_published, published_at, created_at, updated_at
		FROM blog_posts WHERE slug = $1 AND is_published = TRUE AND (published_at IS NULL OR published_at <= now())`, slug).
		Scan(&p.ID, &p.Slug, &p.Title, &p.Excerpt, &p.Content, &p.IsPublished,
			&p.PublishedAt, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get post: %w", err)
	}
	return &p, nil
}
