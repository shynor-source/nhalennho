package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/qg/web/backend/internal/model"
	"github.com/qg/web/backend/internal/repository"
	"github.com/qg/web/backend/internal/service"
)

type orderItemRequest struct {
	ProductID int64                  `json:"productId"`
	Quantity  int                    `json:"quantity"`
	Options   []model.SelectedOption `json:"options"`
}

type orderRequestPayload struct {
	CustomerName string             `json:"customerName"`
	Phone        string             `json:"phone"`
	Address      string             `json:"address"`
	Note         string             `json:"note"`
	Consent      bool               `json:"consent"`
	Items        []orderItemRequest `json:"items"`
}

func (s *Server) createOrder(w http.ResponseWriter, r *http.Request) {
	var payload orderRequestPayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	in := service.CreateOrderInput{
		CustomerName: payload.CustomerName,
		Phone:        payload.Phone,
		Address:      payload.Address,
		Note:         payload.Note,
		Consent:      payload.Consent,
	}
	for _, it := range payload.Items {
		in.Items = append(in.Items, service.OrderItemInput{
			ProductID: it.ProductID, Quantity: it.Quantity, Options: it.Options,
		})
	}
	code, err := s.orders.CreateOrder(r.Context(), in)
	if err != nil {
		if errors.Is(err, service.ErrValidation) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		s.serverError(w, err)
		return
	}

	// Async owner notification (Zalo Bot) — same as the cart checkout flow,
	// never blocks the customer's HTTP response.
	if created, ferr := s.db.GetOrderRequestByCode(r.Context(), code); ferr == nil {
		s.notifyAsync("new_order", created)
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"code":    code,
		"message": "Đã nhận yêu cầu đặt hàng. Tiệm sẽ liên hệ xác nhận với bạn.",
	})
}

type customOrderPayload struct {
	CustomerName string `json:"customerName"`
	Phone        string `json:"phone"`
	Address      string `json:"address"`
	Note         string `json:"note"`
	Consent      bool   `json:"consent"`
}

func (s *Server) createCustomOrder(w http.ResponseWriter, r *http.Request) {
	var payload customOrderPayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	code, err := s.orders.CreateCustomOrder(r.Context(), service.CustomOrderInput{
		CustomerName: payload.CustomerName,
		Phone:        payload.Phone,
		Address:      payload.Address,
		Note:         payload.Note,
		Consent:      payload.Consent,
	})
	if err != nil {
		if errors.Is(err, service.ErrValidation) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		s.serverError(w, err)
		return
	}

	// Async owner notification (Zalo Bot) — same channel as regular orders.
	if created, ferr := s.db.GetCustomOrderRequestByCode(r.Context(), code); ferr == nil {
		s.notifyCustomAsync(created)
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"code":    code,
		"message": "Đã nhận yêu cầu đặt làm. Tiệm sẽ liên hệ để trao đổi thêm với bạn.",
	})
}

type reviewPayload struct {
	AuthorName string `json:"authorName"`
	Rating     int    `json:"rating"`
	Body       string `json:"body"`
}

func (s *Server) createReview(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimSpace(chiURLParam(r, "slug"))
	product, err := s.db.GetProductBySlug(r.Context(), slug, true)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy sản phẩm")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	var payload reviewPayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	name := strings.TrimSpace(payload.AuthorName)
	if len([]rune(name)) < 2 || len([]rune(name)) > 80 {
		writeError(w, http.StatusBadRequest, "tên hiển thị phải từ 2 đến 80 ký tự")
		return
	}
	if payload.Rating < 1 || payload.Rating > 5 {
		writeError(w, http.StatusBadRequest, "số sao phải từ 1 đến 5")
		return
	}
	if len([]rune(payload.Body)) > 1000 {
		writeError(w, http.StatusBadRequest, "nội dung đánh giá quá dài")
		return
	}
	if err := s.db.CreateReview(r.Context(), product.ID, name, payload.Rating, strings.TrimSpace(payload.Body)); err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"message": "Cảm ơn bạn đã gửi đánh giá. Đánh giá sẽ hiển thị sau khi được duyệt.",
	})
}
