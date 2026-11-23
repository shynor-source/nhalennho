package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/qg/web/backend/internal/model"
	"github.com/qg/web/backend/internal/repository"
)

// ---- DTOs -------------------------------------------------------------------

type categoryRef struct {
	Slug string `json:"slug"`
	Name string `json:"name"`
}

type productDTO struct {
	ID          int64              `json:"id"`
	Slug        string             `json:"slug"`
	Name        string             `json:"name"`
	Description string             `json:"description"`
	Category    *categoryRef       `json:"category"`
	PriceVND    int64              `json:"priceVnd"`
	PriceMaxVND *int64             `json:"priceMaxVnd"`
	Colors      []string           `json:"colors"`
	IsActive    bool               `json:"isActive"`
	ShopeeURL   string             `json:"shopeeUrl"`
	Options     []productOptionDTO `json:"options"`
	CoverImage  string             `json:"coverImage"`
	Images      []string           `json:"images,omitempty"`
	CreatedAt   time.Time          `json:"createdAt"`
}

func toOptionDTOs(opts []model.ProductOption) []productOptionDTO {
	out := make([]productOptionDTO, 0, len(opts))
	for _, o := range opts {
		values := make([]optionValueDTO, 0, len(o.Values))
		for _, v := range o.Values {
			values = append(values, optionValueDTO{Value: v.Value, PriceDeltaVND: v.PriceDeltaVND})
		}
		out = append(out, productOptionDTO{Kind: o.Kind, Values: values})
	}
	return out
}

func toProductDTO(p model.Product) productDTO {
	var cat *categoryRef
	if p.CategoryID != nil {
		cat = &categoryRef{Slug: p.CategorySlug, Name: p.CategoryName}
	}
	colors := p.Colors
	if colors == nil {
		colors = []string{}
	}
	return productDTO{
		ID:          p.ID,
		Slug:        p.Slug,
		Name:        p.Name,
		Description: p.Description,
		Category:    cat,
		PriceVND:    p.PriceVND,
		PriceMaxVND: p.PriceMaxVND,
		Colors:      colors,
		IsActive:    p.IsActive,
		ShopeeURL:   p.ShopeeURL,
		Options:     toOptionDTOs(p.Options),
		CoverImage:  p.CoverImage,
		CreatedAt:   p.CreatedAt,
	}
}

type optionValueDTO struct {
	Value         string `json:"value"`
	PriceDeltaVND *int64 `json:"priceDeltaVnd"`
}

type productOptionDTO struct {
	Kind   string           `json:"kind"`
	Values []optionValueDTO `json:"values"`
}

type reviewDTO struct {
	ID         int64     `json:"id"`
	AuthorName string    `json:"authorName"`
	Rating     int       `json:"rating"`
	Body       string    `json:"body"`
	CreatedAt  time.Time `json:"createdAt"`
}

type postDTO struct {
	Slug        string     `json:"slug"`
	Title       string     `json:"title"`
	Excerpt     string     `json:"excerpt"`
	Content     string     `json:"content,omitempty"`
	PublishedAt *time.Time `json:"publishedAt"`
}

// ---- public handlers --------------------------------------------------------

func (s *Server) listCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := s.db.ListCategories(r.Context())
	if err != nil {
		s.serverError(w, err)
		return
	}
	type catDTO struct {
		ID          int64  `json:"id"`
		Slug        string `json:"slug"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	out := make([]catDTO, 0, len(cats))
	for _, c := range cats {
		out = append(out, catDTO{ID: c.ID, Slug: c.Slug, Name: c.Name, Description: c.Description})
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (s *Server) listProducts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := model.ProductFilter{
		Query:        strings.TrimSpace(q.Get("q")),
		CategorySlug: strings.TrimSpace(q.Get("category")),
		Color:        strings.TrimSpace(q.Get("color")),
		Sort:         strings.TrimSpace(q.Get("sort")),
		ActiveOnly:   true,
	}
	if len(filter.Query) > 100 {
		writeError(w, http.StatusBadRequest, "từ khóa quá dài")
		return
	}
	if len(filter.CategorySlug) > 60 || len(filter.Color) > 60 {
		writeError(w, http.StatusBadRequest, "bộ lọc không hợp lệ")
		return
	}
	switch filter.Sort {
	case "", "newest":
		filter.Sort = "newest"
	case "price_asc", "price_desc":
	default:
		writeError(w, http.StatusBadRequest, "kiểu sắp xếp không hợp lệ")
		return
	}

	var err error
	if filter.MinPrice, err = optionalPrice(q.Get("min_price")); err != nil {
		writeError(w, http.StatusBadRequest, "giá tối thiểu không hợp lệ")
		return
	}
	if filter.MaxPrice, err = optionalPrice(q.Get("max_price")); err != nil {
		writeError(w, http.StatusBadRequest, "giá tối đa không hợp lệ")
		return
	}

	page := parsePositiveInt(q.Get("page"), 1)
	perPage := parsePositiveInt(q.Get("per_page"), 12)
	if perPage > 48 {
		perPage = 48
	}
	filter.Limit = perPage
	filter.Offset = (page - 1) * perPage

	items, err := s.db.ListProducts(r.Context(), filter)
	if err != nil {
		s.serverError(w, err)
		return
	}
	total, err := s.db.CountProducts(r.Context(), filter)
	if err != nil {
		s.serverError(w, err)
		return
	}

	out := make([]productDTO, 0, len(items))
	for _, p := range items {
		out = append(out, toProductDTO(p))
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items":   out,
		"total":   total,
		"page":    page,
		"perPage": perPage,
	})
}

func (s *Server) getProduct(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimSpace(chiURLParam(r, "slug"))
	if slug == "" || len(slug) > 120 {
		writeError(w, http.StatusBadRequest, "sản phẩm không hợp lệ")
		return
	}
	product, err := s.db.GetProductBySlug(r.Context(), slug, true)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy sản phẩm")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}

	if err := s.db.AttachOptions(r.Context(), product); err != nil {
		s.serverError(w, err)
		return
	}
	reviews, err := s.db.ListApprovedReviews(r.Context(), product.ID)
	if err != nil {
		s.serverError(w, err)
		return
	}
	revOut := make([]reviewDTO, 0, len(reviews))
	for _, rv := range reviews {
		revOut = append(revOut, reviewDTO{ID: rv.ID, AuthorName: rv.AuthorName, Rating: rv.Rating, Body: rv.Body, CreatedAt: rv.CreatedAt})
	}
	images, err := s.db.ListProductImages(r.Context(), product.ID)
	if err != nil {
		s.serverError(w, err)
		return
	}
	productDTO := toProductDTO(*product)
	productDTO.Images = images
	writeJSON(w, http.StatusOK, map[string]any{
		"product": productDTO,
		"reviews": revOut,
	})
}

func (s *Server) listColors(w http.ResponseWriter, r *http.Request) {
	colors, err := s.db.ListProductColors(r.Context())
	if err != nil {
		s.serverError(w, err)
		return
	}
	if colors == nil {
		colors = []string{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": colors})
}

func (s *Server) listPosts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page := parsePositiveInt(q.Get("page"), 1)
	perPage := parsePositiveInt(q.Get("per_page"), 10)
	if perPage > 30 {
		perPage = 30
	}
	posts, err := s.db.ListPublishedPosts(r.Context(), perPage, (page-1)*perPage)
	if err != nil {
		s.serverError(w, err)
		return
	}
	total, err := s.db.CountPublishedPosts(r.Context())
	if err != nil {
		s.serverError(w, err)
		return
	}
	out := make([]postDTO, 0, len(posts))
	for _, p := range posts {
		out = append(out, postDTO{Slug: p.Slug, Title: p.Title, Excerpt: p.Excerpt, PublishedAt: p.PublishedAt})
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out, "total": total, "page": page, "perPage": perPage})
}

func (s *Server) getPost(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimSpace(chiURLParam(r, "slug"))
	post, err := s.db.GetPublishedPostBySlug(r.Context(), slug)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy bài viết")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, postDTO{
		Slug: post.Slug, Title: post.Title, Excerpt: post.Excerpt,
		Content: post.Content, PublishedAt: post.PublishedAt,
	})
}

// ---- helpers ----------------------------------------------------------------

func optionalPrice(raw string) (*int64, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	v, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || v < 0 {
		return nil, errors.New("invalid price")
	}
	return &v, nil
}

func parsePositiveInt(raw string, fallback int) int {
	v, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || v < 1 {
		return fallback
	}
	return v
}
