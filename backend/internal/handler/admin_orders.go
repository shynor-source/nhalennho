package handler

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/qg/web/backend/internal/model"
	"github.com/qg/web/backend/internal/repository"
)

var validStatuses = map[string]bool{
	"received":  true,
	"confirmed": true,
	"making":    true,
	"shipped":   true,
	"completed": true,
	"cancelled": true,
}

type orderItemDTO struct {
	ProductName  string                 `json:"productName"`
	UnitPriceVND int64                  `json:"unitPriceVnd"`
	Quantity     int                    `json:"quantity"`
	Options      []model.SelectedOption `json:"options"`
}

type orderDTO struct {
	ID            int64          `json:"id"`
	Code          string         `json:"code"`
	CustomerName  string         `json:"customerName"`
	Phone         string         `json:"phone"`
	Address       string         `json:"address"`
	Note          string         `json:"note"`
	Status        string         `json:"status"`
	ConsentGiven  bool           `json:"consentGiven"`
	PaymentMethod string         `json:"paymentMethod"`
	PaymentStatus string         `json:"paymentStatus"`
	TotalVND      int64          `json:"totalVnd"`
	AdminNote     string         `json:"adminNote,omitempty"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
	Items         []orderItemDTO `json:"items,omitempty"`
}

type statusPayload struct {
	Status string `json:"status"`
}

func (s *Server) adminListOrders(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	status := strings.TrimSpace(q.Get("status"))
	if status != "" && !validStatuses[status] {
		writeError(w, http.StatusBadRequest, "trạng thái không hợp lệ")
		return
	}
	page := parsePositiveInt(q.Get("page"), 1)
	perPage := parsePositiveInt(q.Get("per_page"), 20)
	if perPage > 100 {
		perPage = 100
	}
	orders, err := s.db.ListOrderRequests(r.Context(), status, perPage, (page-1)*perPage)
	if err != nil {
		s.serverError(w, err)
		return
	}
	total, err := s.db.CountOrderRequests(r.Context(), status)
	if err != nil {
		s.serverError(w, err)
		return
	}
	out := make([]orderDTO, 0, len(orders))
	for i := range orders {
		out = append(out, toOrderDTO(&orders[i], false, true))
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out, "total": total, "page": page, "perPage": perPage})
}

func (s *Server) adminGetOrder(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "id không hợp lệ")
		return
	}
	o, err := s.db.GetOrderRequest(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy đơn hàng")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toOrderDTO(o, true, true))
}

func (s *Server) adminUpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "id không hợp lệ")
		return
	}
	var payload statusPayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	if !validStatuses[payload.Status] {
		writeError(w, http.StatusBadRequest, "trạng thái không hợp lệ")
		return
	}
	err := s.db.UpdateOrderStatus(r.Context(), id, payload.Status)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy đơn hàng")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"updated": true})
}

func (s *Server) adminDeleteOrder(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "id không hợp lệ")
		return
	}
	err := s.db.DeleteOrderRequest(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy đơn hàng")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// ---- custom orders ----------------------------------------------------------

type customOrderDTO struct {
	ID           int64     `json:"id"`
	Code         string    `json:"code"`
	CustomerName string    `json:"customerName"`
	Phone        string    `json:"phone"`
	Address      string    `json:"address"`
	Note         string    `json:"note"`
	Status       string    `json:"status"`
	ConsentGiven bool      `json:"consentGiven"`
	AdminNote    string    `json:"adminNote,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

func (s *Server) adminListCustomOrders(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	status := strings.TrimSpace(q.Get("status"))
	if status != "" && !validStatuses[status] {
		writeError(w, http.StatusBadRequest, "trạng thái không hợp lệ")
		return
	}
	page := parsePositiveInt(q.Get("page"), 1)
	perPage := parsePositiveInt(q.Get("per_page"), 20)
	if perPage > 100 {
		perPage = 100
	}
	items, err := s.db.ListCustomOrderRequests(r.Context(), status, perPage, (page-1)*perPage)
	if err != nil {
		s.serverError(w, err)
		return
	}
	total, err := s.db.CountCustomOrderRequests(r.Context(), status)
	if err != nil {
		s.serverError(w, err)
		return
	}
	out := make([]customOrderDTO, 0, len(items))
	for _, c := range items {
		out = append(out, customOrderDTO{
			ID: c.ID, Code: c.Code, CustomerName: c.CustomerName, Phone: c.Phone,
			Address: c.Address, Note: c.Note, Status: c.Status, ConsentGiven: c.ConsentGiven,
			AdminNote: c.AdminNote,
			CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out, "total": total, "page": page, "perPage": perPage})
}

func (s *Server) adminGetCustomOrder(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "id không hợp lệ")
		return
	}
	c, err := s.db.GetCustomOrderRequest(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy yêu cầu")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, customOrderDTO{
		ID: c.ID, Code: c.Code, CustomerName: c.CustomerName, Phone: c.Phone,
		Address: c.Address, Note: c.Note, Status: c.Status, ConsentGiven: c.ConsentGiven,
		CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt,
	})
}

func (s *Server) adminUpdateCustomOrderStatus(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "id không hợp lệ")
		return
	}
	var payload statusPayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	if !validStatuses[payload.Status] {
		writeError(w, http.StatusBadRequest, "trạng thái không hợp lệ")
		return
	}
	err := s.db.UpdateCustomOrderStatus(r.Context(), id, payload.Status)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy yêu cầu")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"updated": true})
}

func (s *Server) adminDeleteCustomOrder(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "id không hợp lệ")
		return
	}
	err := s.db.DeleteCustomOrderRequest(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy yêu cầu")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// ---- dashboard --------------------------------------------------------------

func (s *Server) adminStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	newOrders, err := s.db.CountOrderRequests(ctx, "received")
	if err != nil {
		s.serverError(w, err)
		return
	}
	newCustom, err := s.db.CountCustomOrderRequests(ctx, "received")
	if err != nil {
		s.serverError(w, err)
		return
	}
	allOrders, err := s.db.CountOrderRequests(ctx, "")
	if err != nil {
		s.serverError(w, err)
		return
	}
	allCustom, err := s.db.CountCustomOrderRequests(ctx, "")
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"newOrders":         newOrders,
		"newCustomOrders":   newCustom,
		"totalOrders":       allOrders,
		"totalCustomOrders": allCustom,
	})
}

var validPaymentStatuses = map[string]bool{
	"unpaid":    true,
	"submitted": true,
	"paid":      true,
}

type paymentStatusPayload struct {
	PaymentStatus string `json:"paymentStatus"`
}

func (s *Server) adminUpdateOrderPayment(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "id không hợp lệ")
		return
	}
	var payload paymentStatusPayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	if !validPaymentStatuses[payload.PaymentStatus] {
		writeError(w, http.StatusBadRequest, "trạng thái thanh toán không hợp lệ")
		return
	}
	err := s.db.UpdateOrderPaymentStatus(r.Context(), id, payload.PaymentStatus)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy đơn hàng")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"updated": true})
}

type adminNotePayload struct {
	Note string `json:"note"`
}

func (s *Server) adminUpdateOrderNote(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "id không hợp lệ")
		return
	}
	var payload adminNotePayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	if len([]rune(payload.Note)) > 2000 {
		writeError(w, http.StatusBadRequest, "ghi chú quá dài")
		return
	}
	err := s.db.UpdateOrderAdminNote(r.Context(), id, strings.TrimSpace(payload.Note))
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy đơn hàng")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"updated": true})
}

func (s *Server) adminUpdateCustomOrderNote(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "id không hợp lệ")
		return
	}
	var payload adminNotePayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	if len([]rune(payload.Note)) > 2000 {
		writeError(w, http.StatusBadRequest, "ghi chú quá dài")
		return
	}
	err := s.db.UpdateCustomOrderAdminNote(r.Context(), id, strings.TrimSpace(payload.Note))
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy yêu cầu")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"updated": true})
}
