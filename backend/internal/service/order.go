package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/qg/web/backend/internal/model"
	"github.com/qg/web/backend/internal/repository"
)

// ErrValidation indicates invalid user input; the message is safe to show.
var ErrValidation = errors.New("validation error")

func invalid(msg string) error { return fmt.Errorf("%w: %s", ErrValidation, msg) }

// OrderItemInput is one requested product line from the browser.
type OrderItemInput struct {
	ProductID int64
	Quantity  int
	// Options are the customer's picks (color/size/material/packaging).
	Options []model.SelectedOption
}

// CreateOrderInput is the validated shape of an order form submission.
type CreateOrderInput struct {
	PaymentMethod  string
	IdempotencyKey string
	CustomerName   string
	Phone          string
	Address        string
	Note           string
	Consent        bool
	Items          []OrderItemInput
}

// CustomOrderInput is a custom handmade request.
type CustomOrderInput struct {
	CustomerName string
	Phone        string
	Address      string
	Note         string
	Consent      bool
}

// OrderService creates order and custom-order requests. Prices and names are
// always derived from the database, never from the client (brief section 8.4).
type OrderService struct {
	repo *repository.DB
}

func NewOrderService(repo *repository.DB) *OrderService {
	return &OrderService{repo: repo}
}

func validateContact(name, phone, address string, consent bool) error {
	name = strings.TrimSpace(name)
	phone = strings.TrimSpace(phone)
	if l := utf8.RuneCountInString(name); l < 2 || l > 120 {
		return invalid("họ tên phải từ 2 đến 120 ký tự")
	}
	if l := utf8.RuneCountInString(phone); l < 8 || l > 20 {
		return invalid("số điện thoại không hợp lệ")
	}
	for _, r := range phone {
		if r != '+' && r != ' ' && r != '-' && r != '.' && (r < '0' || r > '9') {
			return invalid("số điện thoại không hợp lệ")
		}
	}
	if address != "" {
		if l := utf8.RuneCountInString(address); l < 5 || l > 300 {
			return invalid("địa chỉ phải từ 5 đến 300 ký tự")
		}
	}
	if !consent {
		return invalid("cần đồng ý với chính sách dữ liệu cá nhân")
	}
	return nil
}

// buildItems resolves product names and prices from the database and returns
// the order items plus the total in VND. Selected options are validated
// against the product's actual option axes; the unit price is the product's
// base price plus every chosen option's price delta (client-sent prices are
// ignored — brief section 8.4).
func (s *OrderService) buildItems(ctx context.Context, raw []OrderItemInput) ([]model.OrderItem, int64, error) {
	if len(raw) == 0 || len(raw) > 20 {
		return nil, 0, invalid("danh sách sản phẩm không hợp lệ")
	}
	items := make([]model.OrderItem, 0, len(raw))
	var total int64
	for _, item := range raw {
		if item.Quantity < 1 || item.Quantity > 99 {
			return nil, 0, invalid("số lượng không hợp lệ")
		}
		if len(item.Options) > 4 {
			return nil, 0, invalid("quá nhiều đặc điểm cho một sản phẩm")
		}
		product, err := s.repo.GetProductByID(ctx, item.ProductID)
		if errors.Is(err, repository.ErrNotFound) {
			return nil, 0, invalid("sản phẩm không tồn tại")
		}
		if err != nil {
			return nil, 0, err
		}
		if !product.IsActive {
			return nil, 0, invalid("sản phẩm đã ngừng bán")
		}
		options, delta, err := s.repo.ResolveSelectedOptions(ctx, product.ID, item.Options)
		if errors.Is(err, repository.ErrNotFound) {
			return nil, 0, invalid("đặc điểm không hợp lệ cho sản phẩm trong đơn")
		}
		if err != nil {
			return nil, 0, err
		}
		if options == nil {
			options = []model.SelectedOption{}
		}
		id := product.ID
		unit := product.PriceVND + delta
		items = append(items, model.OrderItem{
			ProductID:    &id,
			ProductName:  product.Name,
			UnitPriceVND: unit,
			Quantity:     item.Quantity,
			Options:      options,
		})
		total += unit * int64(item.Quantity)
	}
	return items, total, nil
}

func (s *OrderService) CreateOrder(ctx context.Context, in CreateOrderInput) (string, error) {
	if err := validateContact(in.CustomerName, in.Phone, in.Address, in.Consent); err != nil {
		return "", err
	}
	if l := utf8.RuneCountInString(in.Note); l > 1000 {
		return "", invalid("ghi chú quá dài")
	}
	items, _, err := s.buildItems(ctx, in.Items)
	if err != nil {
		return "", err
	}
	order := model.OrderRequest{
		Code:          NewOrderCode("DH"),
		CustomerName:  strings.TrimSpace(in.CustomerName),
		Phone:         strings.TrimSpace(in.Phone),
		Address:       strings.TrimSpace(in.Address),
		Note:          strings.TrimSpace(in.Note),
		ConsentGiven:  true,
		PaymentMethod: "bank_transfer",
		PaymentStatus: "unpaid",
	}
	if _, err := s.repo.CreateOrderRequest(ctx, order, items); err != nil {
		return "", err
	}
	return order.Code, nil
}

// CreateOrderForCustomer creates an order linked to a customer account and
// returns the order code and total in VND.
func (s *OrderService) CreateOrderForCustomer(ctx context.Context, customerID int64, in CreateOrderInput) (string, int64, error) {
	if err := validateContact(in.CustomerName, in.Phone, in.Address, in.Consent); err != nil {
		return "", 0, err
	}
	if l := utf8.RuneCountInString(in.Note); l > 1000 {
		return "", 0, invalid("ghi chú quá dài")
	}
	items, total, err := s.buildItems(ctx, in.Items)
	if err != nil {
		return "", 0, err
	}
	method := in.PaymentMethod
	if method != "cod" {
		method = "bank_transfer"
	}
	order := model.OrderRequest{
		Code:           NewOrderCode("DH"),
		CustomerName:   strings.TrimSpace(in.CustomerName),
		Phone:          strings.TrimSpace(in.Phone),
		Address:        strings.TrimSpace(in.Address),
		Note:           strings.TrimSpace(in.Note),
		ConsentGiven:   true,
		CustomerID:     &customerID,
		PaymentMethod:  method,
		PaymentStatus:  "unpaid",
		IdempotencyKey: in.IdempotencyKey,
	}
	if _, err := s.repo.CreateOrderRequest(ctx, order, items); err != nil {
		return "", 0, err
	}
	return order.Code, total, nil
}

// CreateCustomOrder stores a custom handmade request.
func (s *OrderService) CreateCustomOrder(ctx context.Context, in CustomOrderInput) (string, error) {
	if err := validateContact(in.CustomerName, in.Phone, in.Address, in.Consent); err != nil {
		return "", err
	}
	if l := utf8.RuneCountInString(in.Note); l < 10 || l > 2000 {
		return "", invalid("vui lòng mô tả yêu cầu từ 10 đến 2000 ký tự")
	}

	req := model.CustomOrderRequest{
		Code:         NewOrderCode("DR"),
		CustomerName: strings.TrimSpace(in.CustomerName),
		Phone:        strings.TrimSpace(in.Phone),
		Address:      strings.TrimSpace(in.Address),
		Note:         strings.TrimSpace(in.Note),
		ConsentGiven: true,
	}
	if _, err := s.repo.CreateCustomOrderRequest(ctx, req); err != nil {
		return "", err
	}
	return req.Code, nil
}
