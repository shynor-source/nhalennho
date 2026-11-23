package repository

import (
	"context"
	"errors"
	"fmt"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"github.com/qg/web/backend/internal/model"
)

const (
	maxValuesPerOption = 24
	maxOptionValueLen  = 40
)

// ValidOptionKind reports whether kind is one of the four allowed axes.
func ValidOptionKind(kind string) bool {
	switch kind {
	case model.OptionKindColor, model.OptionKindSize,
		model.OptionKindMaterial, model.OptionKindPackaging:
		return true
	}
	return false
}

// ListProductOptions returns the product's option axes with their values,
// ordered by axis position then value position.
func (db *DB) ListProductOptions(ctx context.Context, productID int64) ([]model.ProductOption, error) {
	optRows, err := db.Pool.Query(ctx, `
		SELECT id, kind
		FROM product_options
		WHERE product_id = $1
		ORDER BY position, id`, productID)
	if err != nil {
		return nil, fmt.Errorf("list product options: %w", err)
	}
	defer optRows.Close()

	type optRow struct {
		id   int64
		kind string
	}
	var opts []optRow
	for optRows.Next() {
		var o optRow
		if err := optRows.Scan(&o.id, &o.kind); err != nil {
			return nil, fmt.Errorf("scan product option: %w", err)
		}
		opts = append(opts, o)
	}
	if err := optRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate product options: %w", err)
	}

	out := make([]model.ProductOption, 0, len(opts))
	for _, o := range opts {
		valRows, err := db.Pool.Query(ctx, `
			SELECT value, price_delta_vnd
			FROM product_option_values
			WHERE option_id = $1
			ORDER BY position, id`, o.id)
		if err != nil {
			return nil, fmt.Errorf("list option values: %w", err)
		}
		values := make([]model.ProductOptionValue, 0, 4)
		for valRows.Next() {
			var v model.ProductOptionValue
			if err := valRows.Scan(&v.Value, &v.PriceDeltaVND); err != nil {
				valRows.Close()
				return nil, fmt.Errorf("scan option value: %w", err)
			}
			values = append(values, v)
		}
		valRows.Close()
		if err := valRows.Err(); err != nil {
			return nil, fmt.Errorf("iterate option values: %w", err)
		}
		out = append(out, model.ProductOption{Kind: o.kind, Values: values})
	}
	return out, nil
}

// ValidateProductOptions checks admin-provided option axes and returns the
// normalized set. Packaging is handled separately (EnsurePackagingOption).
func ValidateProductOptions(opts []model.ProductOption) ([]model.ProductOption, error) {
	seenKind := map[string]bool{}
	out := make([]model.ProductOption, 0, len(opts))
	for _, o := range opts {
		if !ValidOptionKind(o.Kind) {
			return nil, fmt.Errorf("%w: loại đặc điểm không hợp lệ", ErrOptionValidation)
		}
		if seenKind[o.Kind] {
			return nil, fmt.Errorf("%w: loại đặc điểm bị lặp", ErrOptionValidation)
		}
		seenKind[o.Kind] = true
		if o.Kind == model.OptionKindPackaging {
			continue // managed by EnsurePackagingOption
		}
		if len(o.Values) == 0 {
			return nil, fmt.Errorf("%w: đặc điểm %s cần ít nhất 1 lựa chọn", ErrOptionValidation, o.Kind)
		}
		if len(o.Values) > maxValuesPerOption {
			return nil, fmt.Errorf("%w: tối đa %d lựa chọn mỗi đặc điểm", ErrOptionValidation, maxValuesPerOption)
		}
		seenVal := map[string]bool{}
		values := make([]model.ProductOptionValue, 0, len(o.Values))
		for _, v := range o.Values {
			value := trimSpace(v.Value)
			if l := utf8.RuneCountInString(value); l < 1 || l > maxOptionValueLen {
				return nil, fmt.Errorf("%w: giá trị đặc điểm phải từ 1 đến %d ký tự", ErrOptionValidation, maxOptionValueLen)
			}
			if seenVal[value] {
				return nil, fmt.Errorf("%w: giá trị đặc điểm bị lặp", ErrOptionValidation)
			}
			seenVal[value] = true
			delta := v.PriceDeltaVND
			if delta != nil && (*delta < 0 || *delta > 1_000_000_000) {
				return nil, fmt.Errorf("%w: giá phụ thêm không hợp lệ", ErrOptionValidation)
			}
			values = append(values, model.ProductOptionValue{Value: value, PriceDeltaVND: delta})
		}
		out = append(out, model.ProductOption{Kind: o.Kind, Values: values})
	}
	return out, nil
}

// SaveProductOptions replaces the product's option axes atomically. The
// packaging axis is preserved/created with defaults; other kinds are fully
// replaced by the validated input.
func (db *DB) SaveProductOptions(ctx context.Context, productID int64, opts []model.ProductOption) error {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Wipe non-packaging axes; packaging values are replaced below as well
	// (admins may edit its values, e.g. add a paid gift-wrap tier).
	if _, err := tx.Exec(ctx, `
		DELETE FROM product_option_values v
		USING product_options o
		WHERE v.option_id = o.id AND o.product_id = $1`, productID); err != nil {
		return fmt.Errorf("clear option values: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		DELETE FROM product_options
		WHERE product_id = $1 AND kind <> $2`, productID, model.OptionKindPackaging); err != nil {
		return fmt.Errorf("clear options: %w", err)
	}

	// Ensure the packaging axis exists.
	if _, err := tx.Exec(ctx, `
		INSERT INTO product_options (product_id, kind, position)
		VALUES ($1, $2, 3)
		ON CONFLICT (product_id, kind) DO NOTHING`, productID, model.OptionKindPackaging); err != nil {
		return fmt.Errorf("ensure packaging: %w", err)
	}

	// Build the full list: admin-supplied axes plus packaging values (either
	// the defaults or admin-supplied overrides).
	type pair struct {
		kind   string
		values []model.ProductOptionValue
	}
	list := make([]pair, 0, len(opts)+1)
	packagingSent := false
	for _, o := range opts {
		if o.Kind == model.OptionKindPackaging {
			packagingSent = true
			if len(o.Values) == 0 {
				continue // keep defaults
			}
			list = append(list, pair{o.Kind, o.Values})
			continue
		}
		list = append(list, pair{o.Kind, o.Values})
	}
	if !packagingSent {
		list = append(list, pair{model.OptionKindPackaging, []model.ProductOptionValue{
			{Value: "Đóng gói thường"},
			{Value: "Đóng gói quà tặng"},
		}})
	}

	for _, item := range list {
		var optID int64
		err := tx.QueryRow(ctx, `
			INSERT INTO product_options (product_id, kind, position)
			VALUES ($1, $2, CASE $2 WHEN 'color' THEN 0 WHEN 'size' THEN 1 WHEN 'material' THEN 2 ELSE 3 END)
			ON CONFLICT (product_id, kind) DO UPDATE SET position = EXCLUDED.position
			RETURNING id`,
			productID, item.kind).Scan(&optID)
		if err != nil {
			return fmt.Errorf("upsert option %s: %w", item.kind, err)
		}
		for i, v := range item.values {
			if _, err := tx.Exec(ctx, `
				INSERT INTO product_option_values (option_id, value, price_delta_vnd, position)
				VALUES ($1, $2, $3, $4)`, optID, v.Value, v.PriceDeltaVND, i); err != nil {
				return fmt.Errorf("insert option value: %w", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit options: %w", err)
	}
	return nil
}

// ResolveSelectedOptions validates the customer's picks against the product's
// actual options and returns the resolved list (with a defaulted packaging
// pick when the customer sent none) plus the total price delta to add to the
// product base price. Unknown kinds/values are rejected.
func (db *DB) ResolveSelectedOptions(ctx context.Context, productID int64, selected []model.SelectedOption) ([]model.SelectedOption, int64, error) {
	opts, err := db.ListProductOptions(ctx, productID)
	if err != nil {
		return nil, 0, err
	}
	byKind := make(map[string]model.ProductOption, len(opts))
	var packaging *model.ProductOption
	for _, o := range opts {
		k := o.Kind
		byKind[k] = o
		if k == model.OptionKindPackaging {
			copied := o
			packaging = &copied
		}
	}

	resolved := make([]model.SelectedOption, 0, len(selected)+1)
	var delta int64
	seen := map[string]bool{}
	for _, s := range selected {
		o, ok := byKind[s.Kind]
		if !ok || !ValidOptionKind(s.Kind) || seen[s.Kind] {
			return nil, 0, ErrNotFound
		}
		found := false
		for _, v := range o.Values {
			if v.Value == s.Value {
				if v.PriceDeltaVND != nil {
					delta += *v.PriceDeltaVND
				}
				found = true
				break
			}
		}
		if !found {
			return nil, 0, ErrNotFound
		}
		seen[s.Kind] = true
		resolved = append(resolved, model.SelectedOption{Kind: s.Kind, Value: s.Value})
	}
	// Mandatory packaging: default to its first value when the customer did
	// not send one explicitly.
	if packaging != nil && !seen[model.OptionKindPackaging] {
		if len(packaging.Values) > 0 {
			first := packaging.Values[0]
			if first.PriceDeltaVND != nil {
				delta += *first.PriceDeltaVND
			}
			resolved = append(resolved, model.SelectedOption{
				Kind:  model.OptionKindPackaging,
				Value: first.Value,
			})
			seen[model.OptionKindPackaging] = true
		}
	}
	// Sort for a stable presentation order (color, size, material, packaging).
	order := map[string]int{
		model.OptionKindColor:     0,
		model.OptionKindSize:      1,
		model.OptionKindMaterial:  2,
		model.OptionKindPackaging: 3,
	}
	sortSlice := func(s []model.SelectedOption) {
		for i := 1; i < len(s); i++ {
			for j := i; j > 0 && order[s[j].Kind] < order[s[j-1].Kind]; j-- {
				s[j], s[j-1] = s[j-1], s[j]
			}
		}
	}
	sortSlice(resolved)
	return resolved, delta, nil
}

func trimSpace(s string) string {
	start, end := 0, len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}

// AttachOptions loads a product's option axes onto it.
func (db *DB) AttachOptions(ctx context.Context, p *model.Product) error {
	opts, err := db.ListProductOptions(ctx, p.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return err
	}
	if opts == nil {
		opts = []model.ProductOption{}
	}
	p.Options = opts
	return nil
}
