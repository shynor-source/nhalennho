// Package handler contains HTTP request/response handling. Business rules live
// in service packages; this layer only translates between HTTP and services.
package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// writeJSON serializes v as JSON with the given status.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("encode response", slog.Any("error", err))
	}
}

// errorBody is the single, non-leaking error shape returned to clients.
type errorBody struct {
	Error string `json:"error"`
}

// writeError returns a safe error message; internal details are never leaked
// (brief section 8.3).
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, errorBody{Error: message})
}

// serverError logs the real error server-side and returns a generic message.
func (s *Server) serverError(w http.ResponseWriter, err error) {
	s.logger.Error("request failed", slog.Any("error", err))
	writeError(w, http.StatusInternalServerError, "đã xảy ra lỗi, vui lòng thử lại")
}
