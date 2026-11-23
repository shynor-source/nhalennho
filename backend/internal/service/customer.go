package service

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/qg/web/backend/internal/auth"
	"github.com/qg/web/backend/internal/config"
	"github.com/qg/web/backend/internal/repository"
)

// ErrCustomerValidation is returned for invalid registration/login input.
var ErrCustomerValidation = errors.New("customer validation error")

// ErrInvalidCustomerCredentials is returned for both unknown accounts and wrong
// passwords so callers cannot enumerate accounts.
var ErrInvalidCustomerCredentials = errors.New("invalid credentials")

func customerInvalid(msg string) error {
	return fmt.Errorf("%w: %s", ErrCustomerValidation, msg)
}

// CustomerAuthService handles customer registration and sessions.
type CustomerAuthService struct {
	repo *repository.DB
	cfg  *config.Config
}

func NewCustomerAuthService(repo *repository.DB, cfg *config.Config) *CustomerAuthService {
	return &CustomerAuthService{repo: repo, cfg: cfg}
}

func normalizeEmail(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" || len(raw) > 254 {
		return "", customerInvalid("email không hợp lệ")
	}
	addr, err := mail.ParseAddress(raw)
	if err != nil || !strings.Contains(addr.Address, "@") {
		return "", customerInvalid("email không hợp lệ")
	}
	return strings.ToLower(addr.Address), nil
}

// Register creates a customer and a signed-in session.
func (s *CustomerAuthService) Register(ctx context.Context, fullName, email, phone, password string) (token, csrf string, err error) {
	fullName = strings.TrimSpace(fullName)
	if l := utf8.RuneCountInString(fullName); l < 2 || l > 120 {
		return "", "", customerInvalid("họ tên phải từ 2 đến 120 ký tự")
	}
	phone = strings.TrimSpace(phone)
	if phone != "" && (utf8.RuneCountInString(phone) < 8 || utf8.RuneCountInString(phone) > 20) {
		return "", "", customerInvalid("số điện thoại không hợp lệ")
	}
	if l := utf8.RuneCountInString(password); l < 8 || l > 128 {
		return "", "", customerInvalid("mật khẩu phải từ 8 đến 128 ký tự")
	}
	email, err = normalizeEmail(email)
	if err != nil {
		return "", "", err
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		return "", "", err
	}
	id, err := s.repo.CreateCustomer(ctx, email, hash, fullName, phone)
	if errors.Is(err, repository.ErrEmailTaken) {
		return "", "", customerInvalid("email này đã được đăng ký")
	}
	if err != nil {
		return "", "", err
	}
	return s.startSession(ctx, id)
}

// Login verifies credentials and creates a customer session.
func (s *CustomerAuthService) Login(ctx context.Context, email, password string) (token, csrf string, err error) {
	normalized, nerr := normalizeEmail(email)
	if nerr != nil {
		return "", "", ErrInvalidCustomerCredentials
	}
	user, lookupErr := s.repo.GetCustomerByEmail(ctx, normalized)
	if lookupErr != nil {
		// Keep timing similar for unknown accounts.
		_, _ = auth.VerifyPassword(dummyHash, password)
		return "", "", ErrInvalidCustomerCredentials
	}
	ok, verr := auth.VerifyPassword(user.PasswordHash, password)
	if verr != nil || !ok {
		return "", "", ErrInvalidCustomerCredentials
	}
	return s.startSession(ctx, user.ID)
}

func (s *CustomerAuthService) startSession(ctx context.Context, customerID int64) (token, csrf string, err error) {
	token, tokenHash, err := auth.NewToken()
	if err != nil {
		return "", "", err
	}
	csrf, _, err = auth.NewToken()
	if err != nil {
		return "", "", err
	}
	expires := time.Now().Add(s.cfg.CustomerSessionTTL)
	if err := s.repo.CreateCustomerSession(ctx, tokenHash, customerID, csrf, expires); err != nil {
		return "", "", err
	}
	return token, csrf, nil
}

func (s *CustomerAuthService) Authenticate(ctx context.Context, token string) (*repository.CustomerSession, error) {
	if token == "" {
		return nil, ErrInvalidCustomerCredentials
	}
	return s.repo.GetCustomerSession(ctx, auth.HashToken(token))
}

func (s *CustomerAuthService) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	return s.repo.DeleteCustomerSession(ctx, auth.HashToken(token))
}
