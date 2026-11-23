package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"
)

// RateLimiter is a fixed-window in-memory limiter keyed by a caller-supplied
// key (usually client IP + route). It is intentionally simple and single
// process; if the API ever runs multiple replicas, replace it with a shared
// store. Keyed limits protect login and public form endpoints (brief 8.1, 8.4).
type RateLimiter struct {
	mu      sync.Mutex
	window  time.Duration
	limit   int
	buckets map[string]*bucket

	// lastSweep drives lazy eviction: expired buckets are purged roughly once
	// per window so unique keys (spoofed IPs) cannot grow the map without
	// bound — an unbounded map would itself be a memory-exhaustion DoS.
	lastSweep time.Time
}

type bucket struct {
	count int
	reset time.Time
}

// NewRateLimiter creates a limiter allowing `limit` requests per `window`.
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		window:    window,
		limit:     limit,
		buckets:   make(map[string]*bucket),
		lastSweep: time.Now(),
	}
}

// Allow reports whether a request for key may proceed.
func (l *RateLimiter) Allow(key string) bool {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()

	// Lazy eviction: at most once per window, drop expired buckets. O(n) over
	// the live bucket set; with realistic key counts this is microseconds and
	// it bounds memory to (keys seen within one window).
	if now.Sub(l.lastSweep) >= l.window {
		for k, b := range l.buckets {
			if now.After(b.reset) {
				delete(l.buckets, k)
			}
		}
		l.lastSweep = now
	}

	b, ok := l.buckets[key]
	if !ok || now.After(b.reset) {
		l.buckets[key] = &bucket{count: 1, reset: now.Add(l.window)}
		return true
	}
	if b.count >= l.limit {
		return false
	}
	b.count++
	return true
}

// Exceeded reports whether the key has used up its whole budget without
// consuming a slot — used for failure-throttles where only failed attempts
// increment (Allow) and successes clear the counter (Reset).
func (l *RateLimiter) Exceeded(key string) bool {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()
	b, ok := l.buckets[key]
	if !ok || now.After(b.reset) {
		return false
	}
	return b.count >= l.limit
}

// Reset clears the budget for a key (e.g. after a successful login).
func (l *RateLimiter) Reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.buckets, key)
}

// Middleware rejects requests over the limit with 429 and a Retry-After header.
func (l *RateLimiter) Middleware(keyFn func(*http.Request) string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !l.Allow(keyFn(r)) {
				w.Header().Set("Retry-After", "60")
				http.Error(w, "too many requests", http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// ClientIP returns the request IP. The hardened RealIP middleware has already
// resolved and validated it, so RemoteAddr is authoritative.
func ClientIP(r *http.Request) string {
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}
