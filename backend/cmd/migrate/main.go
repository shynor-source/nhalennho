// Command migrate applies database migrations and (optionally) seed data.
//
// Usage:
//
//	go run ./cmd/migrate            # apply migrations only
//	go run ./cmd/migrate -seed      # apply migrations then seed dev data
//
// The admin account for seeding is taken from ADMIN_EMAIL / ADMIN_PASSWORD.
package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"time"

	"github.com/qg/web/backend/internal/auth"
	"github.com/qg/web/backend/internal/db"
	"github.com/qg/web/backend/internal/repository"
)

func main() {
	seed := flag.Bool("seed", false, "insert development seed data (idempotent)")
	flag.Parse()

	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		logger.Error("DATABASE_URL is required")
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	if err := db.Migrate(databaseURL); err != nil {
		logger.Error("migration failed", slog.Any("error", err))
		os.Exit(1)
	}
	logger.Info("migrations applied")

	if *seed {
		conn, err := repository.Open(ctx, databaseURL)
		if err != nil {
			logger.Error("database connection failed", slog.Any("error", err))
			os.Exit(1)
		}
		defer conn.Close()

		email := os.Getenv("ADMIN_EMAIL")
		password := os.Getenv("ADMIN_PASSWORD")
		if email == "" || password == "" {
			logger.Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the admin account")
			os.Exit(1)
		}
		// The repo is public: anyone can read .env.example and this source, so
		// a well-known or trivially guessable admin password must never be
		// accepted — the first thing an attacker tries on a public deployment
		// is the sample value from the committed env example (brief 8.1).
		if sample, known := auth.WeakAdminPassword(password); known {
			logger.Error("ADMIN_PASSWORD is a known weak/sample value — set a strong unique password", slog.String("rejected_sample", sample))
			os.Exit(1)
		}
		hash, err := auth.HashPassword(password)
		if err != nil {
			logger.Error("hash admin password", slog.Any("error", err))
			os.Exit(1)
		}
		if err := db.Seed(ctx, conn.Pool, db.SeedInput{AdminEmail: email, AdminHash: hash}); err != nil {
			logger.Error("seed failed", slog.Any("error", err))
			os.Exit(1)
		}
		logger.Info("seed step completed (first-install only; existing data kept)", slog.String("admin_email", email))
	}
}
