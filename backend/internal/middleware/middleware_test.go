package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORSAllowsConfiguredOrigin(t *testing.T) {
	handler := CORS([]string{"http://localhost:3000"})(http.HandlerFunc(
		func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) },
	))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/products", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
		t.Errorf("Allow-Origin = %q", got)
	}
	if got := rec.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Errorf("Allow-Credentials = %q", got)
	}
}

func TestCORSRejectsUnknownOrigin(t *testing.T) {
	handler := CORS([]string{"http://localhost:3000"})(http.HandlerFunc(
		func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) },
	))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/products", nil)
	req.Header.Set("Origin", "https://evil.example")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("Allow-Origin = %q, want empty", got)
	}
}

func TestCORSPreflightUnknownOrigin(t *testing.T) {
	handler := CORS([]string{"http://localhost:3000"})(http.HandlerFunc(
		func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) },
	))

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/admin/orders", nil)
	req.Header.Set("Origin", "https://evil.example")
	req.Header.Set("Access-Control-Request-Method", "POST")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("preflight status = %d, want 403", rec.Code)
	}
}

func TestRateLimiterBlocksOverLimit(t *testing.T) {
	limiter := NewRateLimiter(3, 60_000_000_000) // 3 per minute
	for i := 0; i < 3; i++ {
		if !limiter.Allow("ip:1") {
			t.Fatalf("request %d should be allowed", i+1)
		}
	}
	if limiter.Allow("ip:1") {
		t.Error("4th request should be blocked")
	}
	if !limiter.Allow("ip:2") {
		t.Error("other key should be allowed")
	}
}
