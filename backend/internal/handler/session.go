package handler

import (
	"context"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/qg/web/backend/internal/repository"
)

type ctxKey int

const sessionCtxKey ctxKey = iota

func (s *Server) sessionSameSite(v http.SameSite) http.SameSite {
	// Cross-site deployments (ADR-0013) require SameSite=None; Secure so the
	// browser sends session cookies on fetch(…, {credentials:"include"}) from
	// the storefront origin to the API origin.
	if s.cfg.SessionCookieSameSiteNone {
		return http.SameSiteNoneMode
	}
	return v
}

func (s *Server) setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{ // #nosec G124 -- MaxAge bounded in clampMaxAge
		Name:     s.cfg.SessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   s.cfg.SessionCookieSecure,
		SameSite: s.sessionSameSite(http.SameSiteLaxMode),
		MaxAge:   clampMaxAge(s.cfg.SessionTTL), // #nosec G124 -- bounded in clampMaxAge
	})
}

func (s *Server) clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{ // #nosec G124 -- MaxAge is the literal -1
		Name:     s.cfg.SessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   s.cfg.SessionCookieSecure,
		SameSite: s.sessionSameSite(http.SameSiteLaxMode),
		MaxAge:   -1,
	})
}

func (s *Server) sessionFromRequest(r *http.Request) (*repository.Session, error) {
	cookie, err := r.Cookie(s.cfg.SessionCookieName)
	if err != nil {
		return nil, repository.ErrNotFound
	}
	return s.auth.Authenticate(r.Context(), cookie.Value)
}

// originAllowed reports whether the request Origin is one of the configured
// trusted origins. Same-origin (or absent Origin) requests are allowed.
func (s *Server) originAllowed(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	normalized := strings.ToLower(u.Scheme + "://" + u.Host)
	for _, allowed := range s.cfg.CORSAllowedOrigin {
		if strings.ToLower(strings.TrimRight(allowed, "/")) == normalized {
			return true
		}
	}
	return false
}

// requireAdmin authenticates the session cookie and, for state-changing
// methods, enforces CSRF protection via an Origin check plus a per-session
// CSRF token sent in the X-CSRF-Token header.
func (s *Server) requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, err := s.sessionFromRequest(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "cần đăng nhập")
			return
		}

		switch r.Method {
		case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
			if !s.originAllowed(r) {
				writeError(w, http.StatusForbidden, "yêu cầu bị từ chối")
				return
			}
			if r.Header.Get("X-CSRF-Token") != session.CSRFToken {
				writeError(w, http.StatusForbidden, "CSRF token không hợp lệ")
				return
			}
		}

		ctx := context.WithValue(r.Context(), sessionCtxKey, session)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func sessionFromContext(ctx context.Context) *repository.Session {
	session, _ := ctx.Value(sessionCtxKey).(*repository.Session)
	return session
}

// clampMaxAge converts a duration to a cookie MaxAge int safely (seconds).
func clampMaxAge(d time.Duration) int {
	const maxInt32 = 1<<31 - 1
	seconds := d / time.Second
	if seconds > maxInt32 {
		return maxInt32
	}
	if seconds < 0 {
		return 0
	}
	return int(seconds) // #nosec G124,G115 -- bounded by the check above
}
