package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/qg/web/backend/internal/service"
)

type loginPayload struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) adminLogin(w http.ResponseWriter, r *http.Request) {
	var payload loginPayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(payload.Email))
	if s.acctFailures.Exceeded("acct:" + email) {
		writeError(w, http.StatusTooManyRequests, "tài khoản tạm khóa do nhiều lần thử thất bại, thử lại sau một phút")
		return
	}
	token, csrf, err := s.auth.Login(r.Context(), payload.Email, payload.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			// Same message for unknown account and wrong password.
			s.acctFailures.Allow("acct:" + email)
			writeError(w, http.StatusUnauthorized, "email hoặc mật khẩu không đúng")
			return
		}
		s.serverError(w, err)
		return
	}
	s.acctFailures.Reset("acct:" + email)
	s.setSessionCookie(w, token)
	writeJSON(w, http.StatusOK, map[string]any{
		"authenticated": true,
		"csrfToken":     csrf,
		"email":         payload.Email,
	})
}

func (s *Server) adminLogout(w http.ResponseWriter, r *http.Request) {
	if !s.originAllowed(r) {
		writeError(w, http.StatusForbidden, "yêu cầu bị từ chối")
		return
	}
	if cookie, err := r.Cookie(s.cfg.SessionCookieName); err == nil {
		_ = s.auth.Logout(r.Context(), cookie.Value)
	}
	s.clearSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]any{"authenticated": false})
}

func (s *Server) adminMe(w http.ResponseWriter, r *http.Request) {
	session, err := s.sessionFromRequest(r)
	if err != nil || session == nil {
		writeJSON(w, http.StatusOK, map[string]any{"authenticated": false})
		return
	}
	user, err := s.db.GetAdminByID(r.Context(), session.AdminUserID)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"authenticated": false})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"authenticated": true,
		"csrfToken":     session.CSRFToken,
		"email":         user.Email,
	})
}
