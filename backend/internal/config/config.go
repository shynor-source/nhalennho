// Package config loads and validates environment configuration.
//
// Rules (brief section 6): all environment-specific values come from the
// environment; configuration fails fast with a clear, non-secret error when a
// required value is missing or invalid; unsafe production defaults are never
// silently applied.
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config is the fully validated application configuration.
type Config struct {
	AppEnv   string
	LogLevel string

	HTTPAddr          string
	HTTPPort          string
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	MaxRequestBody    int64
	CORSAllowedOrigin []string

	DatabaseURL string

	SessionSecret       string
	SessionTTL          time.Duration
	SessionCookieName   string
	SessionCookieSecure bool
	// SessionCookieSameSiteNone: when the storefront and the API live on
	// different sites (free-PaaS combo: *.pages.dev frontend ↔ *.onrender.com
	// API, ADR-0013), session cookies must be SameSite=None; Secure to survive
	// cross-site fetch(…, {credentials:"include"}). Never enable on same-site
	// deployments.
	SessionCookieSameSiteNone bool

	// Customer accounts.
	CustomerSessionCookieName string
	CustomerSessionTTL        time.Duration

	// Bank-transfer payment details (owner-supplied). Empty = not configured.
	BankCode             string
	BankAccountNumber    string
	BankAccountName      string
	BankName             string
	PaymentQRURLTemplate string

	// Zalo Bot notifications (Zalo Bot Manager platform, free, no OA needed).
	ZaloBotToken   string
	ZaloBotChatID  string
	ZaloBotAPIBase string

	UploadMaxBytes     int64
	UploadMaxDimension int

	// Abuse controls for login and public forms (requests per minute per IP).
	LoginRateLimitPerMinute      int
	FormRateLimitPerMinute       int
	GlobalRateLimitPerMinute     int
	AccountFailureLimitPerMinute int

	// Order notification channel (blocking owner decision, brief 2.5).
	OrderNotificationChannel string
}

// Load reads configuration from the environment and validates it.
func Load() (*Config, error) {
	var errs []error

	appEnv := getEnv("APP_ENV", "development")
	cfg := &Config{
		AppEnv:   appEnv,
		LogLevel: getEnv("LOG_LEVEL", "info"),

		HTTPAddr: getEnv("HTTP_ADDR", "0.0.0.0"),
		HTTPPort: getEnv("HTTP_PORT", "8080"),

		DatabaseURL: os.Getenv("DATABASE_URL"),

		SessionSecret:     os.Getenv("SESSION_SECRET"),
		SessionCookieName: getEnv("SESSION_COOKIE_NAME", "qg_session"),

		CustomerSessionCookieName: getEnv("CUSTOMER_SESSION_COOKIE_NAME", "qg_customer"),

		BankCode:             strings.TrimSpace(os.Getenv("BANK_CODE")),
		BankAccountNumber:    strings.TrimSpace(os.Getenv("BANK_ACCOUNT_NUMBER")),
		BankAccountName:      strings.TrimSpace(os.Getenv("BANK_ACCOUNT_NAME")),
		BankName:             strings.TrimSpace(os.Getenv("BANK_NAME")),
		PaymentQRURLTemplate: getEnv("PAYMENT_QR_URL_TEMPLATE", "https://vietqr.app/img?acc={ACCOUNT_NUMBER}&bank={BANK_NAME}&amount={AMOUNT}&des={DESCRIPTION}"),

		ZaloBotToken:   strings.TrimSpace(os.Getenv("ZALO_BOT_TOKEN")),
		ZaloBotChatID:  strings.TrimSpace(os.Getenv("ZALO_BOT_CHAT_ID")),
		ZaloBotAPIBase: strings.TrimRight(getEnv("ZALO_BOT_API_BASE", "https://bot-api.zaloplatforms.com"), "/"),

		UploadMaxBytes:     getEnvInt64("UPLOAD_MAX_BYTES", 5*1024*1024, &errs),
		UploadMaxDimension: int(getEnvInt64("UPLOAD_MAX_DIMENSION", 4000, &errs)),

		LoginRateLimitPerMinute:      int(getEnvInt64("RATE_LIMIT_LOGIN_PER_MINUTE", 10, &errs)),
		FormRateLimitPerMinute:       int(getEnvInt64("RATE_LIMIT_PUBLIC_FORM_PER_MINUTE", 5, &errs)),
		GlobalRateLimitPerMinute:     int(getEnvInt64("RATE_LIMIT_GLOBAL_PER_MINUTE", 300, &errs)),
		AccountFailureLimitPerMinute: int(getEnvInt64("RATE_LIMIT_ACCOUNT_FAILURES_PER_MINUTE", 5, &errs)),

		OrderNotificationChannel: getEnv("ORDER_NOTIFICATION_CHANNEL", "none"),
	}

	cfg.ReadTimeout = getEnvSeconds("HTTP_READ_TIMEOUT_SECONDS", 15, &errs)
	cfg.WriteTimeout = getEnvSeconds("HTTP_WRITE_TIMEOUT_SECONDS", 30, &errs)
	cfg.IdleTimeout = getEnvSeconds("HTTP_IDLE_TIMEOUT_SECONDS", 60, &errs)
	cfg.MaxRequestBody = getEnvInt64("MAX_REQUEST_BODY_BYTES", 1<<20, &errs)
	cfg.SessionTTL = time.Duration(getEnvInt64("SESSION_TTL_HOURS", 24, &errs)) * time.Hour
	cfg.CustomerSessionTTL = time.Duration(getEnvInt64("CUSTOMER_SESSION_TTL_HOURS", 720, &errs)) * time.Hour
	cfg.SessionCookieSecure = getEnvBool("SESSION_COOKIE_SECURE", appEnv == "production", &errs)
	cfg.SessionCookieSameSiteNone = getEnvBool("SESSION_COOKIE_SAMESITE_NONE", false, &errs)

	cfg.CORSAllowedOrigin = splitList(os.Getenv("CORS_ALLOWED_ORIGINS"))

	// Required values.
	if strings.TrimSpace(cfg.DatabaseURL) == "" {
		errs = append(errs, errors.New("DATABASE_URL is required"))
	}
	if strings.TrimSpace(cfg.SessionSecret) == "" {
		errs = append(errs, errors.New("SESSION_SECRET is required"))
	}

	// Production-specific safety checks (brief sections 6.3, 8.3).
	if appEnv == "production" {
		if len(cfg.SessionSecret) < 32 {
			errs = append(errs, errors.New("SESSION_SECRET must be at least 32 characters in production"))
		}
		if !cfg.SessionCookieSecure {
			errs = append(errs, errors.New("SESSION_COOKIE_SECURE must be true in production"))
		}
		if cfg.SessionCookieSameSiteNone && !cfg.SessionCookieSecure {
			errs = append(errs, errors.New("SESSION_COOKIE_SAMESITE_NONE requires SESSION_COOKIE_SECURE=true (SameSite=None is rejected by browsers otherwise)"))
		}
		for _, o := range cfg.CORSAllowedOrigin {
			if o == "*" {
				errs = append(errs, errors.New("CORS_ALLOWED_ORIGINS must not contain a wildcard"))
			}
		}
	}

	switch cfg.OrderNotificationChannel {
	case "none", "email", "telegram", "zalo_bot":
	default:
		errs = append(errs, fmt.Errorf("ORDER_NOTIFICATION_CHANNEL %q is not one of none|email|telegram", cfg.OrderNotificationChannel))
	}

	if len(errs) > 0 {
		return nil, errors.Join(errs...)
	}
	return cfg, nil
}

// Addr returns the listen address for the HTTP server.
func (c *Config) Addr() string { return c.HTTPAddr + ":" + c.HTTPPort }

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && strings.TrimSpace(v) != "" {
		return v
	}
	return fallback
}

func getEnvInt64(key string, fallback int64, errs *[]error) int64 {
	raw, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(raw) == "" {
		return fallback
	}
	v, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	if err != nil || v <= 0 {
		*errs = append(*errs, fmt.Errorf("%s must be a positive integer", key))
		return fallback
	}
	return v
}

func getEnvSeconds(key string, fallback int, errs *[]error) time.Duration {
	return time.Duration(getEnvInt64(key, int64(fallback), errs)) * time.Second
}

func getEnvBool(key string, fallback bool, errs *[]error) bool {
	raw, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(raw) == "" {
		return fallback
	}
	v, err := strconv.ParseBool(strings.TrimSpace(raw))
	if err != nil {
		*errs = append(*errs, fmt.Errorf("%s must be a boolean", key))
		return fallback
	}
	return v
}

func splitList(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
