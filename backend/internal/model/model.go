// Package model defines domain types shared across layers.
package model

import "time"

// Money is stored as integer Vietnamese dong (VND). Never use floats for money.
type Money int64

type Category struct {
	ID          int64
	Slug        string
	Name        string
	Description string
	SortOrder   int
}

type Product struct {
	ID           int64
	Slug         string
	Name         string
	Description  string
	CategoryID   *int64
	CategorySlug string
	CategoryName string
	PriceVND     int64
	PriceMaxVND  *int64
	Colors       []string
	IsActive     bool
	ShopeeURL    string
	// Options are the purchasable variation axes (color/size/material/
	// packaging). Packaging is always present; the others only when the
	// product is actually classified by that dimension. Empty on list views.
	Options []ProductOption
	// CoverImage is the relative path of the first image ("" if none).
	CoverImage string
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

// Product option kinds. The first three are admin-toggleable per product;
// packaging is mandatory for every product.
const (
	OptionKindColor     = "color"
	OptionKindSize      = "size"
	OptionKindMaterial  = "material"
	OptionKindPackaging = "packaging"
)

// ProductOptionValue is one selectable value. A nil delta does not affect the
// price; a non-nil delta is ADDED to the product base price.
type ProductOptionValue struct {
	Value         string
	PriceDeltaVND *int64
}

// ProductOption is one axis with its selectable values.
type ProductOption struct {
	Kind   string
	Values []ProductOptionValue
}

// SelectedOption records the customer's pick for one axis on an order line.
type SelectedOption struct {
	Kind  string `json:"kind"`
	Value string `json:"value"`
}

// ProductFilter holds validated, server-side filtering/sorting options.
type ProductFilter struct {
	Query        string
	CategorySlug string
	Color        string
	MinPrice     *int64
	MaxPrice     *int64
	Sort         string // newest | price_asc | price_desc
	Limit        int
	Offset       int
	ActiveOnly   bool
}

// ProductInput holds validated, writable product fields. Mass assignment is
// avoided by selecting only these fields.
type ProductInput struct {
	Slug        string
	Name        string
	Description string
	CategoryID  *int64
	PriceVND    int64
	PriceMaxVND *int64
	Colors      []string
	IsActive    bool
	ShopeeURL   string
	Images      []string
}

type Review struct {
	ID         int64
	ProductID  int64
	AuthorName string
	Rating     int
	Body       string
	CreatedAt  time.Time
}

type OrderItem struct {
	ID             int64
	OrderRequestID int64
	ProductID      *int64
	ProductName    string
	UnitPriceVND   int64
	Quantity       int
	// Options are the customer's picks for this line (validated server-side).
	Options []SelectedOption
}

type Customer struct {
	ID           int64
	Email        string
	PasswordHash string
	FullName     string
	Phone        string
	CreatedAt    time.Time
}

type OrderRequest struct {
	ID             int64
	Code           string
	CustomerName   string
	Phone          string
	Address        string
	Note           string
	Status         string
	ConsentGiven   bool
	CustomerID     *int64
	PaymentMethod  string
	PaymentStatus  string
	TotalVND       int64
	IdempotencyKey string
	AdminNote      string
	CreatedAt      time.Time
	UpdatedAt      time.Time
	Items          []OrderItem
}

type CustomOrderRequest struct {
	ID           int64
	Code         string
	CustomerName string
	Phone        string
	Address      string
	Note         string
	Status       string
	ConsentGiven bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
	AdminNote    string
}

type BlogPost struct {
	ID          int64
	Slug        string
	Title       string
	Excerpt     string
	Content     string
	IsPublished bool
	PublishedAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// BlogPostInput holds validated, writable blog fields.
type BlogPostInput struct {
	Slug        string
	Title       string
	Excerpt     string
	Content     string
	IsPublished bool
	PublishedAt *time.Time
}

type AdminUser struct {
	ID           int64
	Email        string
	PasswordHash string
	CreatedAt    time.Time
}
