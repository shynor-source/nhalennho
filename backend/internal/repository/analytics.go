package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// DailyHit is one point of a per-day series.
type DailyHit struct {
	Day  time.Time `json:"day"`
	Hits int64     `json:"hits"`
}

// ProductHit is a per-product aggregate row.
type ProductHit struct {
	ProductID int64  `json:"productId"`
	Name      string `json:"name"`
	Slug      string `json:"slug"`
	Hits      int64  `json:"hits"`
}

// AnalyticsSummary is everything the admin statistics page renders.
type AnalyticsSummary struct {
	SiteViews struct {
		// Today is the current day; Window is the sum over the requested
		// range (7/30/90 days).
		Today  int64 `json:"today"`
		Window int64 `json:"window"`
	} `json:"siteViews"`
	Favorites struct {
		Today  int64 `json:"today"`
		Window int64 `json:"window"`
	} `json:"favorites"`
	Series       []DailyHit   `json:"series"`
	TopViewed    []ProductHit `json:"topViewed"`
	TopFavorited []ProductHit `json:"topFavorited"`
}

// RecordPageView counts today's storefront page view for a visitor hash.
// Owner rule (2026-11-28): one view per IP per day — the daily counter only
// increments when the (day, ip_hash) pair is new. Repeat visits by the same
// visitor the same day are ignored.
func (db *DB) RecordPageView(ctx context.Context, ipHash string) error {
	if ipHash == "" {
		return fmt.Errorf("empty visitor hash")
	}
	var inserted int
	err := db.Pool.QueryRow(ctx, `
		INSERT INTO page_visitor_days (day, ip_hash) VALUES (CURRENT_DATE, $1)
		ON CONFLICT (day, ip_hash) DO NOTHING
		RETURNING 1`, ipHash).Scan(&inserted)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil // already counted today
	}
	if err != nil {
		return fmt.Errorf("record visitor day: %w", err)
	}
	_, err = db.Pool.Exec(ctx, `
		INSERT INTO page_views_daily (day, hits) VALUES (CURRENT_DATE, 1)
		ON CONFLICT (day) DO UPDATE SET hits = page_views_daily.hits + 1`)
	if err != nil {
		return fmt.Errorf("record page view: %w", err)
	}
	return nil
}

// dedupeTables maps an event table to its per-visitor dedup table.
var dedupeTables = map[string]string{
	"product_views_daily":     "product_view_visitor_days",
	"product_favorites_daily": "product_fav_visitor_days",
}

// RecordProductEvent counts a product-scoped event ("product_view" or
// "wishlist_add") for a visitor hash: once per (day, product, visitor).
// Unknown product IDs are reported as ErrNotFound.
func (db *DB) RecordProductEvent(ctx context.Context, table string, productID int64, ipHash string) error {
	dedupe, ok := dedupeTables[table]
	if !ok {
		return fmt.Errorf("unknown analytics table %q", table)
	}
	if ipHash == "" {
		return fmt.Errorf("empty visitor hash")
	}
	var inserted int
	err := db.Pool.QueryRow(ctx, fmt.Sprintf(`
		INSERT INTO %s (day, product_id, ip_hash) VALUES (CURRENT_DATE, $1, $2)
		ON CONFLICT (day, product_id, ip_hash) DO NOTHING
		RETURNING 1`, dedupe), // #nosec G705 -- table from a fixed internal allowlist
		productID, ipHash).Scan(&inserted)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil // already counted today
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" { // foreign_key_violation
			return ErrNotFound
		}
		return fmt.Errorf("record visitor day: %w", err)
	}
	_, err = db.Pool.Exec(ctx, fmt.Sprintf(`
		INSERT INTO %s (day, product_id, hits) VALUES (CURRENT_DATE, $1, 1)
		ON CONFLICT (day, product_id) DO UPDATE SET hits = %s.hits + 1`, table, table), // #nosec G705 -- table from a fixed internal allowlist
		productID)
	if err != nil {
		return fmt.Errorf("record product event (%s): %w", table, err)
	}
	// Best-effort pruning: dedup rows are only useful for a few days.
	_, _ = db.Pool.Exec(ctx, fmt.Sprintf(`DELETE FROM %s WHERE day < CURRENT_DATE - 3`, dedupe)) // #nosec G705 -- allowlist
	return nil
}

// Analytics computes the admin statistics summary over the given window
// (7/30/90 days are the sensible choices; anything else is clamped).
func (db *DB) Analytics(ctx context.Context, days int) (*AnalyticsSummary, error) {
	if days < 1 {
		days = 7
	}
	if days > 365 {
		days = 365
	}
	// Non-nil slices: a nil slice serialises as JSON null, which crashes
	// client code reading .length. Empty arrays are the correct shape.
	s := &AnalyticsSummary{
		Series:       []DailyHit{},
		TopViewed:    []ProductHit{},
		TopFavorited: []ProductHit{},
	}

	// Every scalar query takes exactly one $1 window ("today" == window 1:
	// day > CURRENT_DATE - 1 includes only today). Mismatched placeholder
	// counts caused a 500 on the first deployment of this endpoint.
	scans := []struct {
		query  string
		window int
		dest   *int64
	}{
		{`SELECT COALESCE(SUM(hits),0) FROM page_views_daily WHERE day > CURRENT_DATE - $1::int`, 1, &s.SiteViews.Today},
		{`SELECT COALESCE(SUM(hits),0) FROM page_views_daily WHERE day > CURRENT_DATE - $1::int`, days, &s.SiteViews.Window},
		{`SELECT COALESCE(SUM(hits),0) FROM product_favorites_daily WHERE day > CURRENT_DATE - $1::int`, 1, &s.Favorites.Today},
		{`SELECT COALESCE(SUM(hits),0) FROM product_favorites_daily WHERE day > CURRENT_DATE - $1::int`, days, &s.Favorites.Window},
	}
	for i, sc := range scans {
		if err := db.Pool.QueryRow(ctx, sc.query, sc.window).Scan(sc.dest); err != nil {
			return nil, fmt.Errorf("analytics scalar %d: %w", i, err)
		}
	}

	rows, err := db.Pool.Query(ctx, `
		SELECT day, hits FROM page_views_daily
		WHERE day > CURRENT_DATE - $1::int ORDER BY day`, days)
	if err != nil {
		return nil, fmt.Errorf("analytics series: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var h DailyHit
		if err := rows.Scan(&h.Day, &h.Hits); err != nil {
			return nil, fmt.Errorf("scan analytics series: %w", err)
		}
		s.Series = append(s.Series, h)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("analytics series rows: %w", err)
	}

	top := func(table string, dest *[]ProductHit) error {
		rows, err := db.Pool.Query(ctx, fmt.Sprintf(`
			SELECT p.id, p.name, p.slug, COALESCE(SUM(t.hits), 0) AS hits
			FROM %s t JOIN products p ON p.id = t.product_id
			WHERE t.day > CURRENT_DATE - $1::int
			GROUP BY p.id, p.name, p.slug
			ORDER BY hits DESC, p.name
			LIMIT 10`, table), // #nosec G705 -- table from a fixed internal allowlist
			days)
		if err != nil {
			return fmt.Errorf("analytics top %s: %w", table, err)
		}
		defer rows.Close()
		for rows.Next() {
			var h ProductHit
			if err := rows.Scan(&h.ProductID, &h.Name, &h.Slug, &h.Hits); err != nil {
				return fmt.Errorf("scan analytics top %s: %w", table, err)
			}
			*dest = append(*dest, h)
		}
		return rows.Err()
	}
	if err := top("product_views_daily", &s.TopViewed); err != nil {
		return nil, err
	}
	if err := top("product_favorites_daily", &s.TopFavorited); err != nil {
		return nil, err
	}
	return s, nil
}
