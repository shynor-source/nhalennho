package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

// readJSON decodes a JSON request body into dst with a hard size limit and
// unknown-field rejection (defence against mass assignment / junk payloads).
func readJSON(w http.ResponseWriter, r *http.Request, dst any, maxBytes int64) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			writeError(w, http.StatusRequestEntityTooLarge, "dữ liệu gửi lên quá lớn")
			return false
		}
		writeError(w, http.StatusBadRequest, "dữ liệu không hợp lệ")
		return false
	}
	// Reject trailing data after the first JSON value.
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "dữ liệu không hợp lệ")
		return false
	}
	return true
}

// pathID reads an integer path parameter.
func pathID(r *http.Request, key string) (int64, bool) {
	raw := chi.URLParam(r, key)
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		return 0, false
	}
	return id, true
}

// chiURLParam is a thin wrapper kept for readability in handlers.
func chiURLParam(r *http.Request, key string) string { return chi.URLParam(r, key) }
