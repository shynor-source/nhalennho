package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/qg/web/backend/internal/auth"
	"github.com/qg/web/backend/internal/repository"
)

// ---- review moderation ------------------------------------------------------

type adminReviewDTO struct {
	ID          int64  `json:"id"`
	ProductID   int64  `json:"productId"`
	ProductName string `json:"productName"`
	ProductSlug string `json:"productSlug"`
	AuthorName  string `json:"authorName"`
	Rating      int    `json:"rating"`
	Body        string `json:"body"`
	IsApproved  bool   `json:"isApproved"`
	CreatedAt   string `json:"createdAt"`
}

func (s *Server) adminListReviews(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	status := strings.TrimSpace(q.Get("status"))
	page := parsePositiveInt(q.Get("page"), 1)
	perPage := parsePositiveInt(q.Get("per_page"), 20)
	if perPage > 100 {
		perPage = 100
	}
	items, err := s.db.ListReviews(r.Context(), status, perPage, (page-1)*perPage)
	if err != nil {
		s.serverError(w, err)
		return
	}
	total, err := s.db.CountReviews(r.Context(), status)
	if err != nil {
		s.serverError(w, err)
		return
	}
	out := make([]adminReviewDTO, 0, len(items))
	for _, it := range items {
		out = append(out, adminReviewDTO{
			ID: it.ID, ProductID: it.ProductID, ProductName: it.ProductName,
			ProductSlug: it.ProductSlug, AuthorName: it.AuthorName, Rating: it.Rating,
			Body: it.Body, IsApproved: it.IsApproved, CreatedAt: it.CreatedAt,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out, "total": total, "page": page, "perPage": perPage})
}

type reviewApprovalPayload struct {
	Approved bool `json:"approved"`
}

func (s *Server) adminApproveReview(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "id không hợp lệ")
		return
	}
	var payload reviewApprovalPayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	err := s.db.SetReviewApproved(r.Context(), id, payload.Approved)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy đánh giá")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"updated": true, "approved": payload.Approved})
}

func (s *Server) adminDeleteReview(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "id không hợp lệ")
		return
	}
	err := s.db.DeleteReview(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy đánh giá")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// ---- customer lookup / data-subject requests --------------------------------

func (s *Server) adminListCustomers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	search := strings.TrimSpace(q.Get("q"))
	page := parsePositiveInt(q.Get("page"), 1)
	perPage := parsePositiveInt(q.Get("per_page"), 20)
	if perPage > 100 {
		perPage = 100
	}
	items, err := s.db.SearchCustomers(r.Context(), search, perPage, (page-1)*perPage)
	if err != nil {
		s.serverError(w, err)
		return
	}
	total, err := s.db.CountCustomers(r.Context(), search)
	if err != nil {
		s.serverError(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, c := range items {
		out = append(out, map[string]any{
			"id": c.ID, "email": c.Email, "fullName": c.FullName, "phone": c.Phone,
			"createdAt": c.CreatedAt, "orderCount": c.OrderCount, "totalSpent": c.TotalSpent,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out, "total": total, "page": page, "perPage": perPage})
}

type adminCustomerUpdatePayload struct {
	FullName string `json:"fullName"`
	Phone    string `json:"phone"`
}

func (s *Server) adminUpdateCustomer(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "id không hợp lệ")
		return
	}
	var payload adminCustomerUpdatePayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	fullName := strings.TrimSpace(payload.FullName)
	phone := strings.TrimSpace(payload.Phone)
	if len([]rune(fullName)) < 2 || len([]rune(fullName)) > 120 {
		writeError(w, http.StatusBadRequest, "họ tên không hợp lệ")
		return
	}
	if len(phone) < 8 || len(phone) > 20 {
		writeError(w, http.StatusBadRequest, "số điện thoại không hợp lệ")
		return
	}
	err := s.db.UpdateCustomerProfile(r.Context(), id, fullName, phone)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy khách hàng")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"updated": true})
}

func (s *Server) adminDeleteCustomer(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "id không hợp lệ")
		return
	}
	err := s.db.DeleteCustomerAnonymized(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy khách hàng")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// ---- password changes -------------------------------------------------------

type passwordChangePayload struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func validNewPassword(p string) bool {
	if len(p) < 8 || len(p) > 200 {
		return false
	}
	// Reject publicly-known sample credentials (the repo is public).
	_, weak := auth.WeakAdminPassword(p)
	return !weak
}

// adminChangePassword changes the signed-in admin's password.
func (s *Server) adminChangePassword(w http.ResponseWriter, r *http.Request) {
	session := sessionFromContext(r.Context())
	if session == nil {
		writeError(w, http.StatusUnauthorized, "cần đăng nhập")
		return
	}
	var payload passwordChangePayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	if !validNewPassword(payload.NewPassword) {
		writeError(w, http.StatusBadRequest, "mật khẩu mới phải từ 8 ký tự")
		return
	}
	user, err := s.db.GetAdminByID(r.Context(), session.AdminUserID)
	if err != nil {
		s.serverError(w, err)
		return
	}
	ok, err := auth.VerifyPassword(user.PasswordHash, payload.CurrentPassword)
	if err != nil || !ok {
		writeError(w, http.StatusUnauthorized, "mật khẩu hiện tại không đúng")
		return
	}
	hash, err := auth.HashPassword(payload.NewPassword)
	if err != nil {
		s.serverError(w, err)
		return
	}
	if err := s.db.UpdateAdminPassword(r.Context(), session.AdminUserID, hash); err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"updated": true})
}

// customerChangePassword changes the signed-in customer's password.
func (s *Server) customerChangePassword(w http.ResponseWriter, r *http.Request) {
	session := customerSessionFromContext(r.Context())
	if session == nil {
		writeError(w, http.StatusUnauthorized, "cần đăng nhập")
		return
	}
	var payload passwordChangePayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	if !validNewPassword(payload.NewPassword) {
		writeError(w, http.StatusBadRequest, "mật khẩu mới phải từ 8 ký tự")
		return
	}
	customer, err := s.db.GetCustomerByID(r.Context(), session.CustomerID)
	if err != nil {
		s.serverError(w, err)
		return
	}
	ok, err := auth.VerifyPassword(customer.PasswordHash, payload.CurrentPassword)
	if err != nil || !ok {
		writeError(w, http.StatusUnauthorized, "mật khẩu hiện tại không đúng")
		return
	}
	hash, err := auth.HashPassword(payload.NewPassword)
	if err != nil {
		s.serverError(w, err)
		return
	}
	if err := s.db.UpdateCustomerPassword(r.Context(), session.CustomerID, hash); err != nil {
		s.serverError(w, err)
		return
	}
	// Revoke other sessions so a stolen session stops working.
	if cookie, cerr := r.Cookie(s.cfg.CustomerSessionCookieName); cerr == nil {
		_ = s.db.DeleteCustomerSessionsExcept(r.Context(), session.CustomerID, auth.HashToken(cookie.Value))
	}
	writeJSON(w, http.StatusOK, map[string]any{"updated": true})
}
