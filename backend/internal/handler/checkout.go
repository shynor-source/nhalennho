package handler

import (
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/qg/web/backend/internal/model"
	"github.com/qg/web/backend/internal/repository"
	"github.com/qg/web/backend/internal/service"
)

type paymentInfo struct {
	Method          string `json:"method"`
	BankName        string `json:"bankName"`
	BankCode        string `json:"bankCode"`
	AccountNumber   string `json:"accountNumber"`
	AccountName     string `json:"accountName"`
	TransferContent string `json:"transferContent"`
	QRURL           string `json:"qrUrl"`
	Configured      bool   `json:"configured"`
}

func (s *Server) paymentInfo(code string, total int64) paymentInfo {
	p := paymentInfo{
		Method:          "bank_transfer",
		BankName:        s.cfg.BankName,
		BankCode:        s.cfg.BankCode,
		AccountNumber:   s.cfg.BankAccountNumber,
		AccountName:     s.cfg.BankAccountName,
		TransferContent: code,
	}
	if s.cfg.BankCode == "" || s.cfg.BankAccountNumber == "" {
		return p
	}
	p.Configured = true
	tmpl := s.cfg.PaymentQRURLTemplate
	if tmpl == "" {
		return p
	}
	replacer := strings.NewReplacer(
		"{ACCOUNT_NUMBER}", url.QueryEscape(s.cfg.BankAccountNumber),
		"{BANK_NAME}", url.QueryEscape(s.cfg.BankCode),
		"{BANK_CODE}", url.QueryEscape(s.cfg.BankCode),
		"{BANK_FULL_NAME}", url.QueryEscape(s.cfg.BankName),
		"{ACCOUNT_NAME}", url.QueryEscape(s.cfg.BankAccountName),
		"{AMOUNT}", strconv.FormatInt(total, 10),
		"{DESCRIPTION}", url.QueryEscape(code),
	)
	p.QRURL = replacer.Replace(tmpl)
	return p
}

type checkoutPayload struct {
	PaymentMethod  string             `json:"paymentMethod"`
	IdempotencyKey string             `json:"idempotencyKey"`
	CustomerName   string             `json:"customerName"`
	Phone          string             `json:"phone"`
	Address        string             `json:"address"`
	Note           string             `json:"note"`
	Consent        bool               `json:"consent"`
	Items          []orderItemRequest `json:"items"`
}

// checkout creates an order for the signed-in customer.
func (s *Server) checkout(w http.ResponseWriter, r *http.Request) {
	session := customerSessionFromContext(r.Context())
	if session == nil {
		writeError(w, http.StatusUnauthorized, "cần đăng nhập")
		return
	}
	var payload checkoutPayload
	if !readJSON(w, r, &payload, s.cfg.MaxRequestBody) {
		return
	}
	if payload.PaymentMethod != "" && payload.PaymentMethod != "bank_transfer" && payload.PaymentMethod != "cod" {
		writeError(w, http.StatusBadRequest, "phương thức thanh toán không hợp lệ")
		return
	}
	method := payload.PaymentMethod
	if method != "cod" {
		method = "bank_transfer"
	}

	key := strings.TrimSpace(payload.IdempotencyKey)
	if key != "" && (len(key) < 8 || len(key) > 100) {
		writeError(w, http.StatusBadRequest, "mã chống trùng không hợp lệ")
		return
	}
	if key != "" {
		existing, lookupErr := s.db.GetOrderByIdempotencyKey(r.Context(), key)
		if lookupErr == nil {
			if existing.CustomerID != nil && *existing.CustomerID == session.CustomerID {
				s.respondExistingOrder(w, existing)
				return
			}
			writeError(w, http.StatusBadRequest, "mã đơn không hợp lệ")
			return
		}
		if !errors.Is(lookupErr, repository.ErrNotFound) {
			s.serverError(w, lookupErr)
			return
		}
	}

	in := service.CreateOrderInput{
		CustomerName:   payload.CustomerName,
		Phone:          payload.Phone,
		Address:        payload.Address,
		Note:           payload.Note,
		Consent:        payload.Consent,
		PaymentMethod:  method,
		IdempotencyKey: key,
	}
	for _, it := range payload.Items {
		in.Items = append(in.Items, service.OrderItemInput{
			ProductID: it.ProductID, Quantity: it.Quantity, Options: it.Options,
		})
	}

	code, total, err := s.orders.CreateOrderForCustomer(r.Context(), session.CustomerID, in)
	if err != nil {
		if key != "" {
			existing, lookupErr := s.db.GetOrderByIdempotencyKey(r.Context(), key)
			if lookupErr == nil && existing.CustomerID != nil && *existing.CustomerID == session.CustomerID {
				s.respondExistingOrder(w, existing)
				return
			}
		}
		if errors.Is(err, service.ErrValidation) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		s.serverError(w, err)
		return
	}

	pay := s.paymentInfo(code, total)
	if method == "cod" {
		pay = paymentInfo{Method: "cod", TransferContent: code}
	}

	// Async owner notification (Zalo Bot) — never blocks the response.
	if created, ferr := s.db.GetOrderRequestByCode(r.Context(), code); ferr == nil {
		s.notifyAsync("new_order", created)
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"code":     code,
		"totalVnd": total,
		"payment":  pay,
		"message":  "Đã tạo đơn hàng.",
	})
}

func (s *Server) respondExistingOrder(w http.ResponseWriter, o *model.OrderRequest) {
	pay := s.paymentInfo(o.Code, o.TotalVND)
	if o.PaymentMethod == "cod" {
		pay = paymentInfo{Method: "cod", TransferContent: o.Code}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"code":     o.Code,
		"totalVnd": o.TotalVND,
		"payment":  pay,
		"message":  "Đơn hàng đã được tạo trước đó.",
	})
}

func toOrderDTO(o *model.OrderRequest, withItems, includeAdmin bool) orderDTO {
	dto := orderDTO{
		ID: o.ID, Code: o.Code, CustomerName: o.CustomerName, Phone: o.Phone,
		Address: o.Address, Note: o.Note, Status: o.Status, ConsentGiven: o.ConsentGiven,
		PaymentMethod: o.PaymentMethod, PaymentStatus: o.PaymentStatus,
		TotalVND: o.TotalVND, CreatedAt: o.CreatedAt, UpdatedAt: o.UpdatedAt,
	}
	if includeAdmin {
		dto.AdminNote = o.AdminNote
	}
	if withItems {
		for _, it := range o.Items {
			opts := it.Options
			if opts == nil {
				opts = []model.SelectedOption{}
			}
			dto.Items = append(dto.Items, orderItemDTO{
				ProductName: it.ProductName, UnitPriceVND: it.UnitPriceVND, Quantity: it.Quantity,
				Options: opts,
			})
		}
	}
	return dto
}

func (s *Server) customerOrders(w http.ResponseWriter, r *http.Request) {
	session := customerSessionFromContext(r.Context())
	if session == nil {
		writeError(w, http.StatusUnauthorized, "cần đăng nhập")
		return
	}
	page := parsePositiveInt(r.URL.Query().Get("page"), 1)
	perPage := 20
	orders, err := s.db.ListCustomerOrders(r.Context(), session.CustomerID, perPage, (page-1)*perPage)
	if err != nil {
		s.serverError(w, err)
		return
	}
	total, err := s.db.CountCustomerOrders(r.Context(), session.CustomerID)
	if err != nil {
		s.serverError(w, err)
		return
	}
	out := make([]orderDTO, 0, len(orders))
	for i := range orders {
		out = append(out, toOrderDTO(&orders[i], false, false))
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out, "total": total, "page": page, "perPage": perPage})
}

func (s *Server) customerOrder(w http.ResponseWriter, r *http.Request) {
	session := customerSessionFromContext(r.Context())
	if session == nil {
		writeError(w, http.StatusUnauthorized, "cần đăng nhập")
		return
	}
	code := strings.TrimSpace(chiURLParam(r, "code"))
	o, err := s.db.GetCustomerOrderByCode(r.Context(), session.CustomerID, code)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy đơn hàng")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"order":   toOrderDTO(o, true, false),
		"payment": s.paymentInfo(o.Code, o.TotalVND),
	})
}

// customerPaymentSubmitted marks a bank-transfer order as "customer says paid"
// so the shop can verify the bank and confirm it.
func (s *Server) customerPaymentSubmitted(w http.ResponseWriter, r *http.Request) {
	session := customerSessionFromContext(r.Context())
	if session == nil {
		writeError(w, http.StatusUnauthorized, "cần đăng nhập")
		return
	}
	code := strings.TrimSpace(chiURLParam(r, "code"))
	err := s.db.MarkCustomerOrderPaymentSubmitted(r.Context(), session.CustomerID, code)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "không tìm thấy đơn hàng cần xác nhận")
		return
	}
	if err != nil {
		s.serverError(w, err)
		return
	}
	// Async alert so the owner can check the bank statement promptly.
	if o, ferr := s.db.GetOrderRequestByCode(r.Context(), code); ferr == nil {
		s.notifyAsync("payment_submitted", o)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"message": "Đã ghi nhận. Shop sẽ kiểm tra và xác nhận thanh toán của bạn.",
	})
}
