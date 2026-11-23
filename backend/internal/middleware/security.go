// Package middleware contains cross-cutting HTTP concerns: request IDs,
// logging, security headers, and rate limiting.
package middleware

import (
	"net/http"
)

// SecurityHeaders sets defensive response headers (brief section 8.3).
//
// The API returns JSON only, so a strict Content-Security-Policy that forbids
// everything is appropriate for API responses. The HTML site's CSP is owned by
// the Next.js frontend, not here.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Cross-Origin-Opener-Policy", "same-origin")
		h.Set("Cross-Origin-Resource-Policy", "same-origin")
		h.Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
		// HSTS is set by Nginx Proxy Manager in production (TLS terminator).
		next.ServeHTTP(w, r)
	})
}
