package repository

import (
	"context"
	"fmt"

	"github.com/qg/web/backend/internal/model"
)

// ---- review moderation ------------------------------------------------------

// AdminReview is a review joined with its product for the admin moderation UI.
type AdminReview struct {
	ID          int64
	ProductID   int64
	ProductName string
	ProductSlug string
	AuthorName  string
	Rating      int
	Body        string
	IsApproved  bool
	CreatedAt   string
}

// ListReviews returns reviews filtered by moderation state. status may be
// "pending", "approved" or "" (all).
func (db *DB) ListReviews(ctx context.Context, status string, limit, offset int) ([]AdminReview, error) {
	where := "1=1"
	args := []any{}
	switch status {
	case "pending":
		where = "r.is_approved = FALSE"
	case "approved":
		where = "r.is_approved = TRUE"
	}
	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT r.id, r.product_id, p.name, p.slug, r.author_name, r.rating, r.body,
		       r.is_approved, r.created_at
		FROM reviews r
		JOIN products p ON p.id = r.product_id
		WHERE %s
		ORDER BY r.created_at DESC
		LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))

	rows, err := db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list reviews: %w", err)
	}
	defer rows.Close()

	var out []AdminReview
	for rows.Next() {
		var r AdminReview
		var created interface{}
		if err := rows.Scan(&r.ID, &r.ProductID, &r.ProductName, &r.ProductSlug,
			&r.AuthorName, &r.Rating, &r.Body, &r.IsApproved, &created); err != nil {
			return nil, fmt.Errorf("scan review: %w", err)
		}
		r.CreatedAt = fmt.Sprintf("%v", created)
		out = append(out, r)
	}
	return out, rows.Err()
}

func (db *DB) CountReviews(ctx context.Context, status string) (int, error) {
	query := "SELECT count(*) FROM reviews"
	args := []any{}
	switch status {
	case "pending":
		query += " WHERE is_approved = FALSE"
	case "approved":
		query += " WHERE is_approved = TRUE"
	}
	var n int
	if err := db.Pool.QueryRow(ctx, query, args...).Scan(&n); err != nil {
		return 0, fmt.Errorf("count reviews: %w", err)
	}
	return n, nil
}

// SetReviewApproved approves or hides a review. Returns ErrNotFound if missing.
func (db *DB) SetReviewApproved(ctx context.Context, id int64, approved bool) error {
	tag, err := db.Pool.Exec(ctx, `UPDATE reviews SET is_approved = $2 WHERE id = $1`, id, approved)
	if err != nil {
		return fmt.Errorf("update review: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (db *DB) DeleteReview(ctx context.Context, id int64) error {
	tag, err := db.Pool.Exec(ctx, `DELETE FROM reviews WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete review: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ---- admin customer lookup (data-subject requests) --------------------------

type AdminCustomer struct {
	ID         int64
	Email      string
	FullName   string
	Phone      string
	CreatedAt  string
	OrderCount int
	TotalSpent int64
}

func (db *DB) SearchCustomers(ctx context.Context, q string, limit, offset int) ([]AdminCustomer, error) {
	args := []any{}
	where := "1=1"
	if q != "" {
		args = append(args, "%"+q+"%")
		where = fmt.Sprintf("(c.email ILIKE $%d OR c.full_name ILIKE $%d OR c.phone ILIKE $%d)", len(args), len(args), len(args))
	}
	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT c.id, c.email, c.full_name, c.phone, c.created_at,
		       COALESCE(o.cnt, 0), COALESCE(o.total, 0)
		FROM customers c
		LEFT JOIN (
			SELECT customer_id, count(*) AS cnt, SUM((SELECT SUM(oi.unit_price_vnd * oi.quantity) FROM order_items oi WHERE oi.order_request_id = order_requests.id)) AS total
			FROM order_requests WHERE customer_id IS NOT NULL GROUP BY customer_id
		) o ON o.customer_id = c.id
		WHERE %s
		ORDER BY c.created_at DESC
		LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))

	rows, err := db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("search customers: %w", err)
	}
	defer rows.Close()

	var out []AdminCustomer
	for rows.Next() {
		var c AdminCustomer
		var created interface{}
		if err := rows.Scan(&c.ID, &c.Email, &c.FullName, &c.Phone, &created,
			&c.OrderCount, &c.TotalSpent); err != nil {
			return nil, fmt.Errorf("scan customer: %w", err)
		}
		c.CreatedAt = fmt.Sprintf("%v", created)
		out = append(out, c)
	}
	return out, rows.Err()
}

func (db *DB) CountCustomers(ctx context.Context, q string) (int, error) {
	query := "SELECT count(*) FROM customers"
	args := []any{}
	if q != "" {
		args = append(args, "%"+q+"%")
		query += " WHERE email ILIKE $1 OR full_name ILIKE $1 OR phone ILIKE $1"
	}
	var n int
	if err := db.Pool.QueryRow(ctx, query, args...).Scan(&n); err != nil {
		return 0, fmt.Errorf("count customers: %w", err)
	}
	return n, nil
}

// UpdateCustomerProfile lets an admin correct a customer's basic contact data.
func (db *DB) UpdateCustomerProfile(ctx context.Context, id int64, fullName, phone string) error {
	tag, err := db.Pool.Exec(ctx, `UPDATE customers SET full_name = $2, phone = $3 WHERE id = $1`, id, fullName, phone)
	if err != nil {
		return fmt.Errorf("update customer: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// DeleteCustomerAnonymized removes the account and scrubs personal data from
// past orders while keeping financial totals for accounting. This satisfies a
// data-subject deletion request without destroying order history.
func (db *DB) DeleteCustomerAnonymized(ctx context.Context, id int64) error {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `
		UPDATE order_requests
		SET customer_name = 'Khách đã xoá', phone = '', address = '', note = '', customer_id = NULL
		WHERE customer_id = $1`, id); err != nil {
		return fmt.Errorf("anonymize orders: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM customer_sessions WHERE customer_id = $1`, id); err != nil {
		return fmt.Errorf("delete sessions: %w", err)
	}
	tag, err := tx.Exec(ctx, `DELETE FROM customers WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete customer: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit delete customer: %w", err)
	}
	return nil
}

// ---- password changes -------------------------------------------------------

func (db *DB) UpdateAdminPassword(ctx context.Context, id int64, passwordHash string) error {
	tag, err := db.Pool.Exec(ctx, `UPDATE admin_users SET password_hash = $2 WHERE id = $1`, id, passwordHash)
	if err != nil {
		return fmt.Errorf("update admin password: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (db *DB) UpdateCustomerPassword(ctx context.Context, id int64, passwordHash string) error {
	tag, err := db.Pool.Exec(ctx, `UPDATE customers SET password_hash = $2 WHERE id = $1`, id, passwordHash)
	if err != nil {
		return fmt.Errorf("update customer password: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// DeleteCustomerSessionsExcept revokes other sessions after a password change.
func (db *DB) DeleteCustomerSessionsExcept(ctx context.Context, customerID int64, keepTokenHash string) error {
	if _, err := db.Pool.Exec(ctx,
		`DELETE FROM customer_sessions WHERE customer_id = $1 AND token_hash <> $2`,
		customerID, keepTokenHash); err != nil {
		return fmt.Errorf("delete customer sessions: %w", err)
	}
	return nil
}

func (db *DB) GetCustomerByIDForAdmin(ctx context.Context, id int64) (*model.Customer, error) {
	return db.GetCustomerByID(ctx, id)
}
