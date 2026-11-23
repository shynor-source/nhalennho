package db

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/qg/web/backend/internal/slug"
)

//go:embed catalog.json
var catalogJSON []byte

type catalogFile struct {
	Categories []struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		SortOrder   int    `json:"sortOrder"`
	} `json:"categories"`
	Products []struct {
		Category    string `json:"category"`
		Name        string `json:"name"`
		Description string `json:"description"`
		PriceVND    int64  `json:"priceVnd"`
		PriceMaxVND *int64 `json:"priceMaxVnd"`
		ShopeeURL   string `json:"shopeeUrl"`
	} `json:"products"`
}

// SeedInput configures development seed data.
type SeedInput struct {
	AdminEmail string
	AdminHash  string
}

// Seed inserts the real product catalogue (categories + products), the admin
// account, and the starter blog posts. It is idempotent: existing rows are left
// untouched, so it is safe to run on every start.
func Seed(ctx context.Context, pool *pgxpool.Pool, in SeedInput) error {
	if in.AdminEmail != "" && in.AdminHash != "" {
		if _, err := pool.Exec(ctx, `
			INSERT INTO admin_users (email, password_hash)
			VALUES ($1, $2)
			ON CONFLICT (email) DO NOTHING`, in.AdminEmail, in.AdminHash); err != nil {
			return fmt.Errorf("seed admin: %w", err)
		}
	}

	var existingProducts int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM products`).Scan(&existingProducts); err != nil {
		return fmt.Errorf("check existing products: %w", err)
	}
	if existingProducts > 0 {
		// Already seeded. Never re-add content the owner may have deleted.
		return nil
	}

	var catalog catalogFile
	if err := json.Unmarshal(catalogJSON, &catalog); err != nil {
		return fmt.Errorf("parse catalog: %w", err)
	}

	categorySlug := map[string]string{}
	for _, c := range catalog.Categories {
		s := slug.Make(c.Name, "danh-muc")
		categorySlug[c.Name] = s
		if _, err := pool.Exec(ctx, `
			INSERT INTO categories (slug, name, description, sort_order)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (slug) DO NOTHING`,
			s, c.Name, c.Description, c.SortOrder); err != nil {
			return fmt.Errorf("seed category %s: %w", c.Name, err)
		}
	}

	used := map[string]bool{}
	for i, p := range catalog.Products {
		base := slug.Make(p.Name, "san-pham")
		final := base
		if used[final] {
			final = base + "-" + slug.Make(p.Category, "danh-muc")
		}
		if used[final] {
			final = fmt.Sprintf("%s-%d", base, i+2)
		}
		used[final] = true

		if _, err := pool.Exec(ctx, `
			INSERT INTO products (slug, name, description, category_id, price_vnd, price_max_vnd, colors, is_active, shopee_url)
			SELECT $1, $2, $3, c.id, $4, $5, '{}', TRUE, $7
			FROM categories c WHERE c.slug = $6
			ON CONFLICT (slug) DO NOTHING`,
			final, p.Name, p.Description, p.PriceVND, p.PriceMaxVND, categorySlug[p.Category], p.ShopeeURL); err != nil {
			return fmt.Errorf("seed product %s: %w", p.Name, err)
		}
	}

	posts := []struct {
		slug, title, excerpt, content string
	}{
		{
			"chon-qua-len-lam-qua-tang",
			"Chọn quà len làm quà tặng",
			"Vài gợi ý chọn món đồ len phù hợp để làm quà tặng ý nghĩa.",
			"Đồ len móc tay là món quà nhỏ nhưng chứa nhiều thời gian và tình cảm.\n\nBạn có thể chọn móc khóa, hoa len hoặc thú bông tùy theo người nhận. Nếu chưa biết chọn gì, hãy nhắn tiệm để được gợi ý nhé.",
		},
		{
			"bao-quan-do-len",
			"Bảo quản đồ len bền đẹp",
			"Mẹo nhỏ giữ đồ len luôn sạch và bền theo thời gian.",
			"Đồ len nên được giặt tay nhẹ nhàng với nước lạnh, không vắt mạnh và phơi ở nơi thoáng mát.\n\nKhi không dùng, bạn nên gấp gọn và bảo quản nơi khô ráo để tránh ẩm mốc.",
		},
	}
	for _, p := range posts {
		if _, err := pool.Exec(ctx, `
			INSERT INTO blog_posts (slug, title, excerpt, content, is_published, published_at)
			VALUES ($1, $2, $3, $4, TRUE, now())
			ON CONFLICT (slug) DO NOTHING`, p.slug, p.title, p.excerpt, p.content); err != nil {
			return fmt.Errorf("seed post %s: %w", p.slug, err)
		}
	}

	return nil
}
