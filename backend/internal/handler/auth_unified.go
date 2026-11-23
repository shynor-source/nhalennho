package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/qg/web/backend/internal/repository"
	"github.com/qg/web/backend/internal/service"
)

// unifiedLogin authenticates either an admin or a customer from one form and
// sets the matching session cookie. This lets the shop owner sign in from the
// normal login page while keeping admin and customer sessions separate.
func (s *Server) unifiedLogin(w http.ResponseWriter, r *http.Request) {
	var p customerAuthPayload
	if !readJSON(w, r, &p, s.cfg.MaxRequestBody) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(p.Email))
	if email == "" || p.Password == "" {
		writeError(w, http.StatusUnauthorized, "email hoặc mật khẩu không đúng")
		return
	}
	// Per-account abuse throttle on top of the per-IP limiter: an attacker
	// rotating source IPs cannot exceed acctFailuresPerMinute failed
	// attempts against one email. Only failures consume budget; a successful
	// login clears the counter (brief 8.1).
	if s.acctFailures.Exceeded("acct:" + email) {
		writeError(w, http.StatusTooManyRequests, "tài khoản tạm khóa do nhiều lần thử thất bại, thử lại sau một phút")
		return
	}

	// 1) Admin account?
	admin, err := s.db.GetAdminByEmail(r.Context(), email)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		s.serverError(w, err)
		return
	}
	if err == nil && admin != nil {
		token, csrf, loginErr := s.auth.Login(r.Context(), email, p.Password)
		if errors.Is(loginErr, service.ErrInvalidCredentials) {
			s.acctFailures.Allow("acct:" + email)
			writeError(w, http.StatusUnauthorized, "email hoặc mật khẩu không đúng")
			return
		}
		if loginErr != nil {
			s.serverError(w, loginErr)
			return
		}
		s.acctFailures.Reset("acct:" + email)
		s.setSessionCookie(w, token)
		writeJSON(w, http.StatusOK, map[string]any{
			"authenticated": true,
			"role":          "admin",
			"csrfToken":     csrf,
			"redirectTo":    "/admin",
			"email":         admin.Email,
		})
		return
	}

	// 2) Customer account.
	token, csrf, err := s.customerAuth.Login(r.Context(), email, p.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCustomerCredentials) {
			s.acctFailures.Allow("acct:" + email)
			writeError(w, http.StatusUnauthorized, "email hoặc mật khẩu không đúng")
			return
		}
		s.serverError(w, err)
		return
	}
	s.acctFailures.Reset("acct:" + email)
	s.setCustomerCookie(w, token)
	writeJSON(w, http.StatusOK, map[string]any{
		"authenticated": true,
		"role":          "customer",
		"csrfToken":     csrf,
		"redirectTo":    "/account",
	})
}

// unifiedMe reports which role is currently signed in (admin first).
func (s *Server) unifiedMe(w http.ResponseWriter, r *http.Request) {
	if session, err := s.sessionFromRequest(r); err == nil && session != nil {
		if user, uerr := s.db.GetAdminByID(r.Context(), session.AdminUserID); uerr == nil {
			writeJSON(w, http.StatusOK, map[string]any{
				"authenticated": true,
				"role":          "admin",
				"csrfToken":     session.CSRFToken,
				"redirectTo":    "/admin",
				"email":         user.Email,
			})
			return
		}
	}

	if session, err := s.customerSessionFromRequest(r); err == nil && session != nil {
		if customer, cerr := s.db.GetCustomerByID(r.Context(), session.CustomerID); cerr == nil {
			writeJSON(w, http.StatusOK, map[string]any{
				"authenticated": true,
				"role":          "customer",
				"csrfToken":     session.CSRFToken,
				"redirectTo":    "/account",
				"customer": map[string]any{
					"email":    customer.Email,
					"fullName": customer.FullName,
					"phone":    customer.Phone,
				},
			})
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"authenticated": false})
}

// unifiedLogout clears both possible sessions.
func (s *Server) unifiedLogout(w http.ResponseWriter, r *http.Request) {
	if !s.originAllowed(r) {
		writeError(w, http.StatusForbidden, "yêu cầu bị từ chối")
		return
	}
	if cookie, err := r.Cookie(s.cfg.SessionCookieName); err == nil {
		_ = s.auth.Logout(r.Context(), cookie.Value)
	}
	if cookie, err := r.Cookie(s.cfg.CustomerSessionCookieName); err == nil {
		_ = s.customerAuth.Logout(r.Context(), cookie.Value)
	}
	s.clearSessionCookie(w)
	s.clearCustomerCookie(w)
	writeJSON(w, http.StatusOK, map[string]any{"authenticated": false})
}
