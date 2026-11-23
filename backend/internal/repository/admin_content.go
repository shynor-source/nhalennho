package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/qg/web/backend/internal/model"
)

const postColumns = `id, slug, title, excerpt, content, is_published, published_at, created_at, updated_at`

type postScanner interface {
	Scan(dest ...any) error
}

func scanPost(row postScanner) (*model.BlogPost, error) {
	var p model.BlogPost
	err := row.Scan(&p.ID, &p.Slug, &p.Title, &p.Excerpt, &p.Content, &p.IsPublished,
		&p.PublishedAt, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan post: %w", err)
	}
	return &p, nil
}

func (db *DB) ListAllPosts(ctx context.Context, limit, offset int) ([]model.BlogPost, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT `+postColumns+`
		FROM blog_posts
		ORDER BY COALESCE(published_at, created_at) DESC, id DESC
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list all posts: %w", err)
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

func (db *DB) CountAllPosts(ctx context.Context) (int, error) {
	var n int
	if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM blog_posts`).Scan(&n); err != nil {
		return 0, fmt.Errorf("count all posts: %w", err)
	}
	return n, nil
}

func (db *DB) GetPostByID(ctx context.Context, id int64) (*model.BlogPost, error) {
	return scanPost(db.Pool.QueryRow(ctx, `SELECT `+postColumns+` FROM blog_posts WHERE id = $1`, id))
}

func (db *DB) CreatePost(ctx context.Context, in model.BlogPostInput) (int64, error) {
	var id int64
	err := db.Pool.QueryRow(ctx, `
		INSERT INTO blog_posts (slug, title, excerpt, content, is_published, published_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`,
		in.Slug, in.Title, in.Excerpt, in.Content, in.IsPublished, in.PublishedAt).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("create post: %w", err)
	}
	return id, nil
}

func (db *DB) UpdatePost(ctx context.Context, id int64, in model.BlogPostInput) error {
	tag, err := db.Pool.Exec(ctx, `
		UPDATE blog_posts
		SET slug = $2, title = $3, excerpt = $4, content = $5,
		    is_published = $6, published_at = $7, updated_at = now()
		WHERE id = $1`,
		id, in.Slug, in.Title, in.Excerpt, in.Content, in.IsPublished, in.PublishedAt)
	if err != nil {
		return fmt.Errorf("update post: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (db *DB) DeletePost(ctx context.Context, id int64) error {
	tag, err := db.Pool.Exec(ctx, `DELETE FROM blog_posts WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete post: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// CreatePostsBulk inserts many posts in a single transaction.
func (db *DB) CreatePostsBulk(ctx context.Context, posts []model.BlogPostInput) (int, error) {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	for _, in := range posts {
		if _, err := tx.Exec(ctx, `
			INSERT INTO blog_posts (slug, title, excerpt, content, is_published, published_at)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			in.Slug, in.Title, in.Excerpt, in.Content, in.IsPublished, in.PublishedAt); err != nil {
			return 0, fmt.Errorf("insert bulk post: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit bulk posts: %w", err)
	}
	return len(posts), nil
}
