package handler

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/qg/web/backend/internal/model"
	"github.com/qg/web/backend/internal/repository"
	"github.com/qg/web/backend/internal/sanitize"
	"github.com/qg/web/backend/internal/slug"
)

type postPayload struct {
	Title       string  `json:"title"`
	Excerpt     string  `json:"excerpt"`
	Content     string  `json:"content"`
	IsPublished bool    `json:"isPublished"`
	PublishedAt *string `json:"publishedAt"` // RFC3339 or empty
}

func (p postPayload) toInput() (model.BlogPostInput, error) {
	title := strings.TrimSpace(p.Title)
	if l := utf8.RuneCountInString(title); l < 1 || l > 200 {
		return model.BlogPostInput{}, errInvalid("tiêu đề phải từ 1 đến 200 ký tự")
	}
	if utf8.RuneCountInString(p.Excerpt) > 400 {
		return model.BlogPostInput{}, errInvalid("mô tả ngắn quá dài")
	}
	if utf8.RuneCountInString(p.Content) > 100_000 {
		return model.BlogPostInput{}, errInvalid("nội dung quá dài")
	}
	var publishedAt *time.Time
	if p.PublishedAt != nil && strings.TrimSpace(*p.PublishedAt) != "" {
		t, err := time.Parse(time.RFC3339, strings.TrimSpace(*p.PublishedAt))
		if err != nil {
			return model.BlogPostInput{}, errInvalid("ngày giờ đăng không hợp lệ")
		}
		publishedAt = &t
	}
	return model.BlogPostInput{
		Title:   title,
		Excerpt: strings.TrimSpace(p.Excerpt),
		// Server-side sanitise rich HTML before it is stored — the published
		// page renders it as raw HTML, so the allowlist is the security
		// boundary, not the editor UI (brief 8.2).
		Content:     sanitize.PostContent(strings.TrimSpace(p.Content)),
		IsPublished: p.IsPublished,
		PublishedAt: publishedAt,
	}, nil
}

func (s *Server) uniquePostSlug(ctx context.Context, base string, excludeID int64) (string, error) {
	candidate := base
	for i := 2; i <= 500; i++ {
		taken, err := s.db.PostSlugExists(ctx, candidate, excludeID)
		if err != nil {
			return "", err
		}
		if !taken {
			return candidate, nil
		}
		candidate = fmt.Sprintf("%s-%d", base, i)
	}
	return "", errors.New("could not allocate a unique slug")
}

func (s *Server) adminListPosts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page := parsePositiveInt(q.Get("page"), 1)
	perPage := parsePositiveInt(q.Get("per_page"), 50)
	if perPage > 200 {
		perPage = 200
	}
	posts, err := s.db.ListAllPosts(r.Context(), perPage, (page-1)*perPage)
	if err != nil {
		s.serverError(w, err)
		return
	}
	total, err := s.db.CountAllPosts(r.Context())
	if err != nil {
		s.serverError(w, err)
		return
	}
	now := time.Now()
	out := make([]map[string]any, 0, len(posts))
	for _, p := range posts {
		state := "draft"
		if p.IsPublished {
			if p.PublishedAt != nil && p.PublishedAt.After(now) {
				state = "scheduled"
			} else {
				state = "published"
			}
		}
		out = append(out, map[string]any{
			"id":          p.ID,
			"slug":        p.Slug,
			"title":       p.Title,
			"excerpt":     p.Excerpt,
			"isPublished": p.IsPublished,
			"publishedAt": p.PublishedAt,
			"createdAt":   p.CreatedAt,
			"updatedAt":   p.UpdatedAt,
			"state":       state,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out, "total": total, "page": page, "perPage": perPage})
}

func (s *Server) adminGetPost(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "id không hợp lệ")
		return
	}
	p, err := s.db.GetPostByID(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy bài viết")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":          p.ID,
		"slug":        p.Slug,
		"title":       p.Title,
		"excerpt":     p.Excerpt,
		"content":     p.Content,
		"isPublished": p.IsPublished,
		"publishedAt": p.PublishedAt,
		"createdAt":   p.CreatedAt,
		"updatedAt":   p.UpdatedAt,
	})
}

func (s *Server) adminCreatePost(w http.ResponseWriter, r *http.Request) {
	var payload postPayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	in, err := payload.toInput()
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	in.Slug, err = s.uniquePostSlug(r.Context(), slug.Make(in.Title, "bai-viet"), 0)
	if err != nil {
		s.serverError(w, err)
		return
	}
	// If publishing with no explicit date, publish now.
	if in.IsPublished && in.PublishedAt == nil {
		now := time.Now()
		in.PublishedAt = &now
	}
	id, err := s.db.CreatePost(r.Context(), in)
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": id, "slug": in.Slug})
}

func (s *Server) adminUpdatePost(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "id không hợp lệ")
		return
	}
	existing, err := s.db.GetPostByID(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy bài viết")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	var payload postPayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	in, err := payload.toInput()
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	in.Slug = existing.Slug
	if in.IsPublished && in.PublishedAt == nil {
		now := time.Now()
		in.PublishedAt = &now
	}
	if err := s.db.UpdatePost(r.Context(), id, in); err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"updated": true, "slug": in.Slug})
}

func (s *Server) adminDeletePost(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "id không hợp lệ")
		return
	}
	err := s.db.DeletePost(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy bài viết")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// ---- bulk scheduling --------------------------------------------------------

type bulkPostItem struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Excerpt string `json:"excerpt"`
}

type bulkPostPayload struct {
	Items         []bulkPostItem `json:"items"`
	StartAt       string         `json:"startAt"`       // RFC3339
	IntervalHours int            `json:"intervalHours"` // spacing between posts
}

// adminBulkCreatePosts creates many posts and schedules them to publish one
// after another. The public feed only shows posts whose published_at is in the
// past, so the site "auto-publishes" them over time without further action.
func (s *Server) adminBulkCreatePosts(w http.ResponseWriter, r *http.Request) {
	var payload bulkPostPayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	if len(payload.Items) == 0 || len(payload.Items) > 100 {
		writeError(w, http.StatusBadRequest, "cần từ 1 đến 100 bài viết")
		return
	}
	start, err := time.Parse(time.RFC3339, strings.TrimSpace(payload.StartAt))
	if err != nil {
		writeError(w, http.StatusBadRequest, "ngày giờ bắt đầu không hợp lệ")
		return
	}
	if payload.IntervalHours < 1 || payload.IntervalHours > 24*30 {
		writeError(w, http.StatusBadRequest, "khoảng cách giờ không hợp lệ")
		return
	}

	posts := make([]model.BlogPostInput, 0, len(payload.Items))
	for i, item := range payload.Items {
		title := strings.TrimSpace(item.Title)
		if utf8.RuneCountInString(title) < 1 || utf8.RuneCountInString(title) > 200 {
			writeError(w, http.StatusBadRequest, fmt.Sprintf("bài %d: tiêu đề không hợp lệ", i+1))
			return
		}
		base := slug.Make(title, "bai-viet")
		// Avoid duplicates within this batch by appending the index when needed.
		candidate := base
		for n := 2; n <= 500; n++ {
			existsInBatch := false
			for _, p := range posts {
				if p.Slug == candidate {
					existsInBatch = true
					break
				}
			}
			if !existsInBatch {
				taken, err := s.db.PostSlugExists(r.Context(), candidate, 0)
				if err != nil {
					s.serverError(w, err)
					return
				}
				if !taken {
					break
				}
			}
			candidate = fmt.Sprintf("%s-%d", base, n)
		}
		publishedAt := start.Add(time.Duration(i*payload.IntervalHours) * time.Hour)
		posts = append(posts, model.BlogPostInput{
			Slug:        candidate,
			Title:       title,
			Excerpt:     strings.TrimSpace(item.Excerpt),
			Content:     sanitize.PostContent(strings.TrimSpace(item.Content)),
			IsPublished: true,
			PublishedAt: &publishedAt,
		})
	}

	count, err := s.db.CreatePostsBulk(r.Context(), posts)
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"created": count,
		"message": fmt.Sprintf("Đã tạo %d bài viết và hẹn giờ đăng tự động.", count),
	})
}
