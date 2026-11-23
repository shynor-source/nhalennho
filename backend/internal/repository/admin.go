package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/qg/web/backend/internal/model"
)

// ---- admin users ------------------------------------------------------------

func (db *DB) CountAdminUsers(ctx context.Context) (int, error) {
	var n int
	if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM admin_users`).Scan(&n); err != nil {
		return 0, fmt.Errorf("count admins: %w", err)
	}
	return n, nil
}

func (db *DB) CreateAdminUser(ctx context.Context, email, passwordHash string) (int64, error) {
	var id int64
	err := db.Pool.QueryRow(ctx, `
		INSERT INTO admin_users (email, password_hash)
		VALUES ($1, $2)
		ON CONFLICT (email) DO NOTHING
		RETURNING id`, email, passwordHash).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		// Already exists.
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("create admin: %w", err)
	}
	return id, nil
}

func (db *DB) GetAdminByEmail(ctx context.Context, email string) (*model.AdminUser, error) {
	var u model.AdminUser
	err := db.Pool.QueryRow(ctx, `
		SELECT id, email, password_hash, created_at
		FROM admin_users WHERE email = $1`, email).
		Scan(&u.ID, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get admin: %w", err)
	}
	return &u, nil
}

func (db *DB) GetAdminByID(ctx context.Context, id int64) (*model.AdminUser, error) {
	var u model.AdminUser
	err := db.Pool.QueryRow(ctx, `
		SELECT id, email, password_hash, created_at
		FROM admin_users WHERE id = $1`, id).
		Scan(&u.ID, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get admin: %w", err)
	}
	return &u, nil
}

// ---- sessions ---------------------------------------------------------------

type Session struct {
	AdminUserID int64
	CSRFToken   string
	ExpiresAt   time.Time
}

func (db *DB) CreateSession(ctx context.Context, tokenHash string, userID int64, csrf string, expires time.Time) error {
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO admin_sessions (token_hash, admin_user_id, csrf_token, expires_at)
		VALUES ($1, $2, $3, $4)`, tokenHash, userID, csrf, expires)
	if err != nil {
		return fmt.Errorf("create session: %w", err)
	}
	return nil
}

func (db *DB) GetSession(ctx context.Context, tokenHash string) (*Session, error) {
	var s Session
	err := db.Pool.QueryRow(ctx, `
		SELECT admin_user_id, csrf_token, expires_at
		FROM admin_sessions
		WHERE token_hash = $1 AND expires_at > now()`, tokenHash).
		Scan(&s.AdminUserID, &s.CSRFToken, &s.ExpiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get session: %w", err)
	}
	return &s, nil
}

func (db *DB) DeleteSession(ctx context.Context, tokenHash string) error {
	if _, err := db.Pool.Exec(ctx, `DELETE FROM admin_sessions WHERE token_hash = $1`, tokenHash); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

func (db *DB) DeleteExpiredSessions(ctx context.Context) error {
	if _, err := db.Pool.Exec(ctx, `DELETE FROM admin_sessions WHERE expires_at <= now()`); err != nil {
		return fmt.Errorf("delete expired sessions: %w", err)
	}
	return nil
}
