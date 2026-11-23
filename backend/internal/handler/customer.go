package handler

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/qg/web/backend/internal/repository"
	"github.com/qg/web/backend/internal/service"
)

type customerCtxKey int

const customerSessionKey customerCtxKey = iota

func (s *Server) setCustomerCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{ // #nosec G124 -- MaxAge bounded in clampMaxAge
		Name:     s.cfg.CustomerSessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   s.cfg.SessionCookieSecure,
		SameSite: s.sessionSameSite(http.SameSiteLaxMode),
		MaxAge:   clampMaxAge(s.cfg.CustomerSessionTTL), // #nosec G124 -- bounded in clampMaxAge
	})
}

func (s *Server) clearCustomerCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{ // #nosec G124 -- MaxAge is the literal -1
		Name:     s.cfg.CustomerSessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   s.cfg.SessionCookieSecure,
		SameSite: s.sessionSameSite(http.SameSiteLaxMode),
		MaxAge:   -1,
	})
}

func (s *Server) customerSessionFromRequest(r *http.Request) (*repository.CustomerSession, error) {
	cookie, err := r.Cookie(s.cfg.CustomerSessionCookieName)
	if err != nil {
		return nil, repository.ErrNotFound
	}
	return s.customerAuth.Authenticate(r.Context(), cookie.Value)
}

// requireCustomer authenticates the customer cookie and enforces CSRF for
// state-changing requests.
func (s *Server) requireCustomer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, err := s.customerSessionFromRequest(r)
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
		ctx := context.WithValue(r.Context(), customerSessionKey, session)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func customerSessionFromContext(ctx context.Context) *repository.CustomerSession {
	session, _ := ctx.Value(customerSessionKey).(*repository.CustomerSession)
	return session
}

type customerAuthPayload struct {
	FullName string `json:"fullName"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

func (s *Server) customerRegister(w http.ResponseWriter, r *http.Request) {
	var p customerAuthPayload
	if !readJSON(w, r, &p, s.cfg.MaxRequestBody) {
		return
	}
	token, csrf, err := s.customerAuth.Register(r.Context(), p.FullName, p.Email, p.Phone, p.Password)
	if err != nil {
		if errors.Is(err, service.ErrCustomerValidation) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		s.serverError(w, err)
		return
	}
	s.setCustomerCookie(w, token)
	writeJSON(w, http.StatusCreated, map[string]any{"authenticated": true, "csrfToken": csrf})
}

func (s *Server) customerLogin(w http.ResponseWriter, r *http.Request) {
	var p customerAuthPayload
	if !readJSON(w, r, &p, s.cfg.MaxRequestBody) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(p.Email))
	if s.acctFailures.Exceeded("acct:" + email) {
		writeError(w, http.StatusTooManyRequests, "tài khoản tạm khóa do nhiều lần thử thất bại, thử lại sau một phút")
		return
	}
	token, csrf, err := s.customerAuth.Login(r.Context(), p.Email, p.Password)
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
	writeJSON(w, http.StatusOK, map[string]any{"authenticated": true, "csrfToken": csrf})
}

func (s *Server) customerLogout(w http.ResponseWriter, r *http.Request) {
	if !s.originAllowed(r) {
		writeError(w, http.StatusForbidden, "yêu cầu bị từ chối")
		return
	}
	if cookie, err := r.Cookie(s.cfg.CustomerSessionCookieName); err == nil {
		_ = s.customerAuth.Logout(r.Context(), cookie.Value)
	}
	s.clearCustomerCookie(w)
	writeJSON(w, http.StatusOK, map[string]any{"authenticated": false})
}

func (s *Server) customerMe(w http.ResponseWriter, r *http.Request) {
	session, err := s.customerSessionFromRequest(r)
	if err != nil || session == nil {
		writeJSON(w, http.StatusOK, map[string]any{"authenticated": false})
		return
	}
	customer, err := s.db.GetCustomerByID(r.Context(), session.CustomerID)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"authenticated": false})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"authenticated": true,
		"csrfToken":     session.CSRFToken,
		"customer": map[string]any{
			"email":    customer.Email,
			"fullName": customer.FullName,
			"phone":    customer.Phone,
		},
	})
}
