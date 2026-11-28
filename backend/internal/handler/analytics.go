package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/qg/web/backend/internal/repository"
)

// eventKind identifies the anonymous storefront event kinds. Product-scoped
// kinds bump per-product counters; page_view bumps the site-wide one.
const (
	eventPageView    = "page_view"
	eventProductView = "product_view"
	eventFavoriteAdd = "wishlist_add"
)

// recordEvent accepts one anonymous analytics event from the storefront.
// No identity is read or stored (ADR-0015): the body carries only a kind and,
// for product events, a product id. Errors are swallowed after validation so
// analytics can never disrupt browsing; the public rate limiter already caps
// abusive clients.
func (s *Server) recordEvent(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Kind      string `json:"kind"`
		ProductID int64  `json:"productId"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<12)).Decode(&body); err != nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	switch body.Kind {
	case eventPageView:
		if err := s.db.RecordPageView(r.Context()); err != nil {
			s.logger.Warn("analytics page_view failed", slog.Any("error", err))
		}
	case eventProductView, eventFavoriteAdd:
		if body.ProductID < 1 {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		table := "product_views_daily"
		if body.Kind == eventFavoriteAdd {
			table = "product_favorites_daily"
		}
		if err := s.db.RecordProductEvent(r.Context(), table, body.ProductID); err != nil &&
			!isAnalyticsNotFound(err) {
			s.logger.Warn("analytics product event failed",
				slog.String("kind", body.Kind),
				slog.Int64("productId", body.ProductID),
				slog.Any("error", err))
		}
	default:
		// Unknown kinds are ignored silently — no error leakage.
	}
	w.WriteHeader(http.StatusNoContent)
}

func isAnalyticsNotFound(err error) bool { return err == repository.ErrNotFound }

// adminAnalytics serves the statistics summary for the admin dashboard.
func (s *Server) adminAnalytics(w http.ResponseWriter, r *http.Request) {
	days := 30
	if raw := r.URL.Query().Get("days"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil {
			days = n
		}
	}
	summary, err := s.db.Analytics(r.Context(), days)
	if err != nil {
		s.serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, summary)
}
