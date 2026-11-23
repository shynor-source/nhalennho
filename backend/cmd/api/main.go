// Command api is the QG_web backend HTTP server.
//
// It fails fast on invalid configuration, connects to PostgreSQL with retries,
// serves the versioned API, and shuts down gracefully on SIGINT/SIGTERM.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/qg/web/backend/internal/config"
	"github.com/qg/web/backend/internal/handler"
	"github.com/qg/web/backend/internal/repository"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel(os.Getenv("LOG_LEVEL")),
	}))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		// Configuration errors are printed to stderr and never contain secrets.
		logger.Error("invalid configuration", slog.Any("error", err))
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := connectDatabase(ctx, cfg.DatabaseURL, logger)
	if err != nil {
		logger.Error("database connection failed", slog.Any("error", err))
		os.Exit(1)
	}
	defer db.Close()

	srv := &http.Server{
		Addr:         cfg.Addr(),
		Handler:      handler.New(cfg, db, logger).Routes(),
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}

	go func() {
		logger.Info("http server listening", slog.String("addr", cfg.Addr()))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("http server error", slog.Any("error", err))
			stop()
		}
	}()

	<-ctx.Done()
	logger.Info("shutdown signal received")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", slog.Any("error", err))
		os.Exit(1)
	}
	logger.Info("shutdown complete")
}

// connectDatabase retries the initial connection so the API can start even when
// PostgreSQL is still booting.
func connectDatabase(ctx context.Context, url string, logger *slog.Logger) (*repository.DB, error) {
	const attempts = 10
	var lastErr error
	for i := 1; i <= attempts; i++ {
		db, err := repository.Open(ctx, url)
		if err == nil {
			if err = db.Ping(ctx); err == nil {
				logger.Info("database connected")
				return db, nil
			}
			db.Close()
		}
		lastErr = err
		logger.Warn("database not ready, retrying", slog.Int("attempt", i))
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(time.Duration(i) * time.Second):
		}
	}
	return nil, lastErr
}

func logLevel(raw string) slog.Level {
	switch raw {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
