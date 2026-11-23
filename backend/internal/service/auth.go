// Package service holds business rules and orchestration.
package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/qg/web/backend/internal/auth"
	"github.com/qg/web/backend/internal/config"
	"github.com/qg/web/backend/internal/repository"
)

// ErrInvalidCredentials is returned for both unknown accounts and wrong
// passwords, so callers cannot tell accounts apart.
var ErrInvalidCredentials = errors.New("invalid credentials")

// AuthService handles admin login sessions.
type AuthService struct {
	repo *repository.DB
	cfg  *config.Config
}

func NewAuthService(repo *repository.DB, cfg *config.Config) *AuthService {
	return &AuthService{repo: repo, cfg: cfg}
}

// dummyHash is verified when the account does not exist to keep timing similar.
var dummyHash = "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$3g1uYg5P4YbJ0xX4oR6q0K8m8o1n3lV7w9nW2sQ5r0c"

// Login verifies credentials and creates a session. It returns the raw session
// token and the CSRF token; the caller stores the token in a cookie and returns
// the CSRF token to the client.
func (s *AuthService) Login(ctx context.Context, email, password string) (token, csrf string, err error) {
	email = strings.ToLower(strings.TrimSpace(email))

	user, lookupErr := s.repo.GetAdminByEmail(ctx, email)
	if lookupErr != nil {
		// Perform a dummy verification so unknown accounts cost similar time.
		_, _ = auth.VerifyPassword(dummyHash, password)
		return "", "", ErrInvalidCredentials
	}

	ok, verr := auth.VerifyPassword(user.PasswordHash, password)
	if verr != nil || !ok {
		return "", "", ErrInvalidCredentials
	}

	token, tokenHash, err := auth.NewToken()
	if err != nil {
		return "", "", err
	}
	csrf, _, err = auth.NewToken()
	if err != nil {
		return "", "", err
	}

	expires := time.Now().Add(s.cfg.SessionTTL)
	if err := s.repo.CreateSession(ctx, tokenHash, user.ID, csrf, expires); err != nil {
		return "", "", err
	}
	return token, csrf, nil
}

// Authenticate validates a raw session token.
func (s *AuthService) Authenticate(ctx context.Context, token string) (*repository.Session, error) {
	if token == "" {
		return nil, ErrInvalidCredentials
	}
	return s.repo.GetSession(ctx, auth.HashToken(token))
}

// Logout deletes the session for the given raw token.
func (s *AuthService) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	return s.repo.DeleteSession(ctx, auth.HashToken(token))
}

// NewOrderCode returns a short human-readable reference code with a random part.
func NewOrderCode(prefix string) string {
	buf := make([]byte, 3)
	if _, err := rand.Read(buf); err != nil {
		return prefix + "-" + time.Now().Format("20060102-150405")
	}
	return fmt.Sprintf("%s-%s-%s", prefix, time.Now().Format("060102"), strings.ToUpper(hex.EncodeToString(buf)))
}
