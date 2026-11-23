package middleware

import (
	"net/http"
	"strings"
)

// CORS allows only explicitly configured origins (brief section 8.3).
//
// A wildcard is never emitted, and credentials are permitted only for origins
// that were explicitly allowlisted.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[strings.ToLower(strings.TrimSpace(o))] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" {
				if _, ok := allowed[strings.ToLower(origin)]; ok {
					h := w.Header()
					h.Set("Access-Control-Allow-Origin", origin)
					h.Set("Vary", "Origin")
					h.Set("Access-Control-Allow-Credentials", "true")
					h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
					h.Set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With, X-CSRF-Token")
					h.Set("Access-Control-Max-Age", "600")
				}
			}

			if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
				if w.Header().Get("Access-Control-Allow-Origin") == "" {
					w.WriteHeader(http.StatusForbidden)
					return
				}
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
