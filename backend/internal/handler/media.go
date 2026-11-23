package handler

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/qg/web/backend/internal/media"
	"github.com/qg/web/backend/internal/repository"
)

// Server-generated image names only. This prevents path traversal and ensures
// we only ever serve files we created.
var mediaNamePattern = regexp.MustCompile(`^[a-f0-9]{32}\.(jpg|png)$`)
var mediaPathPattern = regexp.MustCompile(`^/media/([a-f0-9]{32}\.(?:jpg|png))$`)

// adminUploadImage accepts one multipart image and stores a re-encoded copy in
// the database (ADR-0013: no persistent disk on the free PaaS target).
func (s *Server) adminUploadImage(w http.ResponseWriter, r *http.Request) {
	// UploadMaxBytes is validated >0 and bounded at config load; the offset for
	// multipart framing cannot overflow int64.
	limit := s.cfg.UploadMaxBytes // #nosec G120 -- validated positive and bounded at config load
	if limit > (1 << 50) {        // 1 PiB sanity ceiling; config validation already caps this
		limit = 1 << 50
	}
	limit += 1 << 20 // #nosec G120 -- capped at 1<<50 above, no overflow
	r.Body = http.MaxBytesReader(w, r.Body, limit)
	// The body is wrapped in MaxBytesReader above, so ParseMultipartForm cannot
	// consume more than the configured limit.
	if err := r.ParseMultipartForm(limit); err != nil { // #nosec G120 -- body capped by MaxBytesReader
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			writeError(w, http.StatusRequestEntityTooLarge, "ảnh vượt quá dung lượng cho phép")
			return
		}
		writeError(w, http.StatusBadRequest, "ảnh không hợp lệ")
		return
	}

	file, _, err := r.FormFile("image")
	if err != nil {
		writeError(w, http.StatusBadRequest, "thiếu tệp ảnh")
		return
	}
	defer file.Close()

	processed, err := media.Process(file, s.cfg.UploadMaxDimension)
	switch {
	case errors.Is(err, media.ErrUnsupported):
		writeError(w, http.StatusBadRequest, "chỉ hỗ trợ ảnh JPEG hoặc PNG")
		return
	case errors.Is(err, media.ErrInvalid):
		s.logger.Warn("image decode failed", slog.Any("error", err))
		writeError(w, http.StatusBadRequest, "tệp không phải ảnh hợp lệ")
		return
	case errors.Is(err, media.ErrDimensions):
		writeError(w, http.StatusBadRequest, "kích thước ảnh không hợp lệ")
		return
	case err != nil:
		s.serverError(w, err)
		return
	}

	if err := s.db.InsertMediaFile(r.Context(), repository.MediaFile{
		Name:        processed.Name,
		ContentType: processed.ContentType,
		Data:        processed.Data,
	}); err != nil {
		s.serverError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"url":    processed.URL,
		"width":  processed.Width,
		"height": processed.Height,
	})
}

// serveMedia serves stored images publicly with long-lived caching.
func (s *Server) serveMedia(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	if !mediaNamePattern.MatchString(name) {
		http.NotFound(w, r)
		return
	}

	f, err := s.db.GetMediaFile(r.Context(), name)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	h := w.Header()
	h.Set("Content-Type", f.ContentType)
	h.Set("Content-Length", strconv.Itoa(len(f.Data)))
	h.Set("Cache-Control", "public, max-age=31536000, immutable")
	// The name is generated once at upload time and never changes for the same
	// bytes, so it doubles as a strong ETag.
	etag := `"` + name + `"`
	h.Set("ETag", etag)
	h.Set("X-Content-Type-Options", "nosniff")
	// Product images are public and may be loaded from the storefront origin,
	// which is a different origin in development.
	h.Set("Cross-Origin-Resource-Policy", "cross-origin")
	if r.Header.Get("If-None-Match") == etag {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	// data comes straight out of the database; bytes.Reader only reads it.
	http.ServeContent(w, r, name, f.CreatedAt, bytes.NewReader(f.Data)) // #nosec G703 -- DB content, validated name
}

// validMediaPath reports whether a product image reference points at a file we
// created (format /media/<32-hex>.(jpg|png)).
func validMediaPath(path string) bool {
	return mediaPathPattern.MatchString(path)
}

// removeStoredImage deletes a stored image if its path is valid. It ignores
// errors because cleanup is best-effort.
func (s *Server) removeStoredImage(ctx context.Context, path string) {
	m := mediaPathPattern.FindStringSubmatch(path)
	if len(m) != 2 {
		s.logger.Warn("skip image cleanup: invalid path", slog.String("path", path))
		return
	}
	if err := s.db.DeleteMediaFile(ctx, m[1]); err != nil {
		s.logger.Warn("image cleanup failed", slog.String("path", path), slog.Any("error", err))
	}
}
