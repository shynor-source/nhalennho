package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRateLimiterEvictsExpiredBuckets(t *testing.T) {
	l := NewRateLimiter(1, 10*time.Millisecond)
	l.Allow("ip1")
	l.Allow("ip2")

	// Force the window to pass, then a new request must sweep old buckets.
	time.Sleep(15 * time.Millisecond)
	l.Allow("ip3")

	l.mu.Lock()
	size := len(l.buckets)
	l.mu.Unlock()
	if size != 1 {
		t.Fatalf("expected 1 bucket after sweep, got %d", size)
	}
}

func TestRateLimiterSeparateKeys(t *testing.T) {
	l := NewRateLimiter(2, time.Minute)
	// Two separate calls on the same key must both pass (identical expressions
	// in one || would trigger staticcheck SA4000).
	if !l.Allow("a") {
		t.Fatal("first request must pass")
	}
	if !l.Allow("a") {
		t.Fatal("second request must pass")
	}
	if l.Allow("a") {
		t.Fatal("third request over limit must be blocked")
	}
	// Different key unaffected.
	if !l.Allow("b") {
		t.Fatal("separate key must be independent")
	}
}

func TestRateLimiterMiddlewareResponds429(t *testing.T) {
	l := NewRateLimiter(1, time.Minute)
	handler := l.Middleware(func(*http.Request) string { return "ip" })(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec1 := httptest.NewRecorder()
	handler.ServeHTTP(rec1, req)
	if rec1.Code != http.StatusOK {
		t.Fatalf("first request must pass, got %d", rec1.Code)
	}
	rec2 := httptest.NewRecorder()
	handler.ServeHTTP(rec2, req)
	if rec2.Code != http.StatusTooManyRequests {
		t.Fatalf("second request must be 429, got %d", rec2.Code)
	}
	if rec2.Header().Get("Retry-After") == "" {
		t.Fatal("429 must include Retry-After")
	}
}
