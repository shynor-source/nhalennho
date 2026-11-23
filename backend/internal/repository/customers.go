package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/qg/web/backend/internal/model"
)

// ErrEmailTaken is returned when a customer email is already registered.
var ErrEmailTaken = errors.New("email already registered")

// ---- customers --------------------------------------------------------------

func (db *DB) CreateCustomer(ctx context.Context, email, passwordHash, fullName, phone string) (int64, error) {
	var id int64
	err := db.Pool.QueryRow(ctx, `
		INSERT INTO customers (email, password_hash, full_name, phone)
		VALUES ($1, $2, $3, $4)
		RETURNING id`, email, passwordHash, fullName, phone).Scan(&id)
	if err != nil {
		if isUniqueViolation(err) {
			return 0, ErrEmailTaken
		}
		return 0, fmt.Errorf("create customer: %w", err)
	}
	return id, nil
}

func (db *DB) GetCustomerByEmail(ctx context.Context, email string) (*model.Customer, error) {
	var c model.Customer
	err := db.Pool.QueryRow(ctx, `
		SELECT id, email, password_hash, full_name, phone, created_at
		FROM customers WHERE email = $1`, email).
		Scan(&c.ID, &c.Email, &c.PasswordHash, &c.FullName, &c.Phone, &c.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get customer: %w", err)
	}
	return &c, nil
}

func (db *DB) GetCustomerByID(ctx context.Context, id int64) (*model.Customer, error) {
	var c model.Customer
	err := db.Pool.QueryRow(ctx, `
		SELECT id, email, password_hash, full_name, phone, created_at
		FROM customers WHERE id = $1`, id).
		Scan(&c.ID, &c.Email, &c.PasswordHash, &c.FullName, &c.Phone, &c.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get customer: %w", err)
	}
	return &c, nil
}

// ---- customer sessions ------------------------------------------------------

type CustomerSession struct {
	CustomerID int64
	CSRFToken  string
	ExpiresAt  time.Time
}

func (db *DB) CreateCustomerSession(ctx context.Context, tokenHash string, customerID int64, csrf string, expires time.Time) error {
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO customer_sessions (token_hash, customer_id, csrf_token, expires_at)
		VALUES ($1, $2, $3, $4)`, tokenHash, customerID, csrf, expires)
	if err != nil {
		return fmt.Errorf("create customer session: %w", err)
	}
	return nil
}

func (db *DB) GetCustomerSession(ctx context.Context, tokenHash string) (*CustomerSession, error) {
	var s CustomerSession
	err := db.Pool.QueryRow(ctx, `
		SELECT customer_id, csrf_token, expires_at
		FROM customer_sessions
		WHERE token_hash = $1 AND expires_at > now()`, tokenHash).
		Scan(&s.CustomerID, &s.CSRFToken, &s.ExpiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get customer session: %w", err)
	}
	return &s, nil
}

func (db *DB) DeleteCustomerSession(ctx context.Context, tokenHash string) error {
	if _, err := db.Pool.Exec(ctx, `DELETE FROM customer_sessions WHERE token_hash = $1`, tokenHash); err != nil {
		return fmt.Errorf("delete customer session: %w", err)
	}
	return nil
}
