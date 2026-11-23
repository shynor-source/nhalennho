package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/qg/web/backend/internal/model"
)

const orderColumns = `o.id, o.code, o.customer_name, o.phone, o.address, o.note,
	o.status, o.consent_given, o.customer_id, o.payment_method, o.payment_status,
	COALESCE((SELECT SUM(oi.unit_price_vnd * oi.quantity) FROM order_items oi WHERE oi.order_request_id = o.id), 0),
	o.admin_note, o.created_at, o.updated_at`

// CreateOrderRequest inserts an order and its items in a single transaction.
func (db *DB) CreateOrderRequest(ctx context.Context, o model.OrderRequest, items []model.OrderItem) (int64, error) {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	paymentMethod := o.PaymentMethod
	if paymentMethod == "" {
		paymentMethod = "bank_transfer"
	}
	paymentStatus := o.PaymentStatus
	if paymentStatus == "" {
		paymentStatus = "unpaid"
	}

	var idempotencyKey *string
	if o.IdempotencyKey != "" {
		idempotencyKey = &o.IdempotencyKey
	}

	var orderID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO order_requests
			(code, customer_name, phone, address, note, status, consent_given, customer_id, payment_method, payment_status, idempotency_key)
		VALUES ($1, $2, $3, $4, $5, 'received', $6, $7, $8, $9, $10)
		RETURNING id`,
		o.Code, o.CustomerName, o.Phone, o.Address, o.Note, o.ConsentGiven,
		o.CustomerID, paymentMethod, paymentStatus, idempotencyKey).Scan(&orderID); err != nil {
		return 0, fmt.Errorf("insert order: %w", err)
	}

	for _, it := range items {
		opts := it.Options
		if opts == nil {
			opts = []model.SelectedOption{}
		}
		optsJSON, err := json.Marshal(opts)
		if err != nil {
			return 0, fmt.Errorf("marshal order item options: %w", err)
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO order_items (order_request_id, product_id, product_name, unit_price_vnd, quantity, options)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			orderID, it.ProductID, it.ProductName, it.UnitPriceVND, it.Quantity, optsJSON); err != nil {
			return 0, fmt.Errorf("insert order item: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit order: %w", err)
	}
	return orderID, nil
}

func scanOrder(row rowScanner) (*model.OrderRequest, error) {
	var o model.OrderRequest
	err := row.Scan(&o.ID, &o.Code, &o.CustomerName, &o.Phone, &o.Address, &o.Note,
		&o.Status, &o.ConsentGiven, &o.CustomerID, &o.PaymentMethod, &o.PaymentStatus,
		&o.TotalVND, &o.AdminNote, &o.CreatedAt, &o.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan order: %w", err)
	}
	return &o, nil
}

func (db *DB) ListOrderRequests(ctx context.Context, status string, limit, offset int) ([]model.OrderRequest, error) {
	where := "1=1"
	args := []any{}
	if status != "" {
		args = append(args, status)
		where = fmt.Sprintf("o.status = $%d", len(args))
	}
	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT %s FROM order_requests o
		WHERE %s
		ORDER BY o.created_at DESC
		LIMIT $%d OFFSET $%d`, orderColumns, where, len(args)-1, len(args))

	rows, err := db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list orders: %w", err)
	}
	defer rows.Close()

	var out []model.OrderRequest
	for rows.Next() {
		var o model.OrderRequest
		if err := rows.Scan(&o.ID, &o.Code, &o.CustomerName, &o.Phone, &o.Address, &o.Note,
			&o.Status, &o.ConsentGiven, &o.CustomerID, &o.PaymentMethod, &o.PaymentStatus,
			&o.TotalVND, &o.AdminNote, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan order: %w", err)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (db *DB) CountOrderRequests(ctx context.Context, status string) (int, error) {
	query := "SELECT count(*) FROM order_requests"
	args := []any{}
	if status != "" {
		query += " WHERE status = $1"
		args = append(args, status)
	}
	var n int
	if err := db.Pool.QueryRow(ctx, query, args...).Scan(&n); err != nil {
		return 0, fmt.Errorf("count orders: %w", err)
	}
	return n, nil
}

func (db *DB) GetOrderRequest(ctx context.Context, id int64) (*model.OrderRequest, error) {
	o, err := scanOrder(db.Pool.QueryRow(ctx,
		fmt.Sprintf(`SELECT %s FROM order_requests o WHERE o.id = $1`, orderColumns), id))
	if err != nil {
		return nil, err
	}
	if err := db.loadOrderItems(ctx, o); err != nil {
		return nil, err
	}
	return o, nil
}

// GetOrderByIdempotencyKey returns the order created with an idempotency key.
func (db *DB) GetOrderByIdempotencyKey(ctx context.Context, key string) (*model.OrderRequest, error) {
	return scanOrder(db.Pool.QueryRow(ctx, fmt.Sprintf(
		`SELECT %s FROM order_requests o WHERE o.idempotency_key = $1`, orderColumns), key))
}

func (db *DB) UpdateOrderAdminNote(ctx context.Context, id int64, note string) error {
	tag, err := db.Pool.Exec(ctx,
		`UPDATE order_requests SET admin_note = $2, updated_at = now() WHERE id = $1`, id, note)
	if err != nil {
		return fmt.Errorf("update admin note: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (db *DB) GetOrderRequestByCode(ctx context.Context, code string) (*model.OrderRequest, error) {
	o, err := scanOrder(db.Pool.QueryRow(ctx,
		fmt.Sprintf(`SELECT %s FROM order_requests o WHERE o.code = $1`, orderColumns), code))
	if err != nil {
		return nil, err
	}
	if err := db.loadOrderItems(ctx, o); err != nil {
		return nil, err
	}
	return o, nil
}

func (db *DB) loadOrderItems(ctx context.Context, o *model.OrderRequest) error {
	rows, err := db.Pool.Query(ctx, `
		SELECT id, order_request_id, product_id, product_name, unit_price_vnd, quantity, options
		FROM order_items WHERE order_request_id = $1 ORDER BY id`, o.ID)
	if err != nil {
		return fmt.Errorf("get order items: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var it model.OrderItem
		var optsJSON []byte
		if err := rows.Scan(&it.ID, &it.OrderRequestID, &it.ProductID, &it.ProductName,
			&it.UnitPriceVND, &it.Quantity, &optsJSON); err != nil {
			return fmt.Errorf("scan order item: %w", err)
		}
		it.Options = []model.SelectedOption{}
		if len(optsJSON) > 0 {
			if err := json.Unmarshal(optsJSON, &it.Options); err != nil {
				return fmt.Errorf("unmarshal order item options: %w", err)
			}
		}
		o.Items = append(o.Items, it)
	}
	return rows.Err()
}

func (db *DB) UpdateOrderStatus(ctx context.Context, id int64, status string) error {
	tag, err := db.Pool.Exec(ctx,
		`UPDATE order_requests SET status = $2, updated_at = now() WHERE id = $1`, id, status)
	if err != nil {
		return fmt.Errorf("update order status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (db *DB) UpdateOrderPaymentStatus(ctx context.Context, id int64, paymentStatus string) error {
	tag, err := db.Pool.Exec(ctx,
		`UPDATE order_requests SET payment_status = $2, updated_at = now() WHERE id = $1`, id, paymentStatus)
	if err != nil {
		return fmt.Errorf("update payment status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (db *DB) DeleteOrderRequest(ctx context.Context, id int64) error {
	tag, err := db.Pool.Exec(ctx, `DELETE FROM order_requests WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete order: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ---- customer order history -------------------------------------------------

func (db *DB) ListCustomerOrders(ctx context.Context, customerID int64, limit, offset int) ([]model.OrderRequest, error) {
	rows, err := db.Pool.Query(ctx, fmt.Sprintf(`
		SELECT %s FROM order_requests o
		WHERE o.customer_id = $1
		ORDER BY o.created_at DESC
		LIMIT $2 OFFSET $3`, orderColumns), customerID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list customer orders: %w", err)
	}
	defer rows.Close()
	var out []model.OrderRequest
	for rows.Next() {
		var o model.OrderRequest
		if err := rows.Scan(&o.ID, &o.Code, &o.CustomerName, &o.Phone, &o.Address, &o.Note,
			&o.Status, &o.ConsentGiven, &o.CustomerID, &o.PaymentMethod, &o.PaymentStatus,
			&o.TotalVND, &o.AdminNote, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan customer order: %w", err)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (db *DB) CountCustomerOrders(ctx context.Context, customerID int64) (int, error) {
	var n int
	if err := db.Pool.QueryRow(ctx,
		`SELECT count(*) FROM order_requests WHERE customer_id = $1`, customerID).Scan(&n); err != nil {
		return 0, fmt.Errorf("count customer orders: %w", err)
	}
	return n, nil
}

func (db *DB) GetCustomerOrderByCode(ctx context.Context, customerID int64, code string) (*model.OrderRequest, error) {
	o, err := scanOrder(db.Pool.QueryRow(ctx, fmt.Sprintf(`
		SELECT %s FROM order_requests o
		WHERE o.customer_id = $1 AND o.code = $2`, orderColumns), customerID, code))
	if err != nil {
		return nil, err
	}
	if err := db.loadOrderItems(ctx, o); err != nil {
		return nil, err
	}
	return o, nil
}

// ---- custom order requests --------------------------------------------------

func (db *DB) CreateCustomOrderRequest(ctx context.Context, c model.CustomOrderRequest) (int64, error) {
	var id int64
	err := db.Pool.QueryRow(ctx, `
		INSERT INTO custom_order_requests (code, customer_name, phone, address, note, status, consent_given)
		VALUES ($1, $2, $3, $4, $5, 'received', $6)
		RETURNING id`,
		c.Code, c.CustomerName, c.Phone, c.Address, c.Note, c.ConsentGiven).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("insert custom order: %w", err)
	}
	return id, nil
}

func (db *DB) ListCustomOrderRequests(ctx context.Context, status string, limit, offset int) ([]model.CustomOrderRequest, error) {
	where := "1=1"
	args := []any{}
	if status != "" {
		args = append(args, status)
		where = fmt.Sprintf("status = $%d", len(args))
	}
	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT id, code, customer_name, phone, address, note, status, consent_given, admin_note, created_at, updated_at
		FROM custom_order_requests
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))

	rows, err := db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list custom orders: %w", err)
	}
	defer rows.Close()
	var out []model.CustomOrderRequest
	for rows.Next() {
		var c model.CustomOrderRequest
		if err := rows.Scan(&c.ID, &c.Code, &c.CustomerName, &c.Phone, &c.Address, &c.Note,
			&c.Status, &c.ConsentGiven, &c.AdminNote, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan custom order: %w", err)
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (db *DB) CountCustomOrderRequests(ctx context.Context, status string) (int, error) {
	query := "SELECT count(*) FROM custom_order_requests"
	args := []any{}
	if status != "" {
		query += " WHERE status = $1"
		args = append(args, status)
	}
	var n int
	if err := db.Pool.QueryRow(ctx, query, args...).Scan(&n); err != nil {
		return 0, fmt.Errorf("count custom orders: %w", err)
	}
	return n, nil
}

func (db *DB) GetCustomOrderRequest(ctx context.Context, id int64) (*model.CustomOrderRequest, error) {
	var c model.CustomOrderRequest
	err := db.Pool.QueryRow(ctx, `
		SELECT id, code, customer_name, phone, address, note, status, consent_given, admin_note, created_at, updated_at
		FROM custom_order_requests WHERE id = $1`, id).
		Scan(&c.ID, &c.Code, &c.CustomerName, &c.Phone, &c.Address, &c.Note,
			&c.Status, &c.ConsentGiven, &c.AdminNote, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get custom order: %w", err)
	}
	return &c, nil
}

// GetCustomOrderRequestByCode looks up a custom order by its public code,
// used right after creation to hand the record to the Zalo notifier.
func (db *DB) GetCustomOrderRequestByCode(ctx context.Context, code string) (*model.CustomOrderRequest, error) {
	var c model.CustomOrderRequest
	err := db.Pool.QueryRow(ctx, `
		SELECT id, code, customer_name, phone, address, note, status, consent_given, admin_note, created_at, updated_at
		FROM custom_order_requests WHERE code = $1`, code).
		Scan(&c.ID, &c.Code, &c.CustomerName, &c.Phone, &c.Address, &c.Note,
			&c.Status, &c.ConsentGiven, &c.AdminNote, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get custom order by code: %w", err)
	}
	return &c, nil
}

func (db *DB) UpdateCustomOrderAdminNote(ctx context.Context, id int64, note string) error {
	tag, err := db.Pool.Exec(ctx,
		`UPDATE custom_order_requests SET admin_note = $2, updated_at = now() WHERE id = $1`, id, note)
	if err != nil {
		return fmt.Errorf("update custom order note: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (db *DB) UpdateCustomOrderStatus(ctx context.Context, id int64, status string) error {
	tag, err := db.Pool.Exec(ctx,
		`UPDATE custom_order_requests SET status = $2, updated_at = now() WHERE id = $1`, id, status)
	if err != nil {
		return fmt.Errorf("update custom order status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (db *DB) DeleteCustomOrderRequest(ctx context.Context, id int64) error {
	tag, err := db.Pool.Exec(ctx, `DELETE FROM custom_order_requests WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete custom order: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// MarkCustomerOrderPaymentSubmitted lets a customer declare that they have
// transferred the money. It only applies to unpaid bank-transfer orders.
func (db *DB) MarkCustomerOrderPaymentSubmitted(ctx context.Context, customerID int64, code string) error {
	tag, err := db.Pool.Exec(ctx, `
		UPDATE order_requests
		SET payment_status = 'submitted', updated_at = now()
		WHERE customer_id = $1 AND code = $2
		  AND payment_method = 'bank_transfer' AND payment_status = 'unpaid'`,
		customerID, code)
	if err != nil {
		return fmt.Errorf("mark payment submitted: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
