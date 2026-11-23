package handler

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/qg/web/backend/internal/model"
	"github.com/qg/web/backend/internal/service"
)

// notifyAsync fires the Zalo Bot notification in the background so a slow or
// failing Zalo call never blocks the customer's HTTP response. Failures are
// logged without personal data; the admin inbox remains the source of truth.
func (s *Server) notifyAsync(kind string, o *model.OrderRequest) {
	if !s.notifier.Configured() {
		return
	}
	go func() {
		defer func() {
			if r := recover(); r != nil {
				s.logger.Error("notifier panic", slog.Any("panic", r))
			}
		}()
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		var err error
		if kind == "payment_submitted" {
			err = s.notifier.NotifyPaymentSubmitted(ctx, o)
		} else {
			err = s.notifier.NotifyNewOrder(ctx, o)
		}
		if err != nil && !errors.Is(err, service.ErrNotifierNotConfigured) {
			s.logger.Warn("zalo bot notification failed",
				slog.String("order_code", o.Code),
				slog.Any("error", err))
		}
	}()
}

// notifyCustomAsync fires the Zalo Bot notification for a custom-order request
// (đặt làm riêng) in the background — same guarantees as notifyAsync.
func (s *Server) notifyCustomAsync(o *model.CustomOrderRequest) {
	if !s.notifier.Configured() {
		return
	}
	go func() {
		defer func() {
			if r := recover(); r != nil {
				s.logger.Error("notifier panic", slog.Any("panic", r))
			}
		}()
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		if err := s.notifier.NotifyCustomOrder(ctx, o); err != nil && !errors.Is(err, service.ErrNotifierNotConfigured) {
			s.logger.Warn("zalo bot custom-order notification failed",
				slog.String("order_code", o.Code),
				slog.Any("error", err))
		}
	}()
}

// adminSendTestNotification lets the owner verify the Zalo Bot setup from
// /admin/settings before real orders flow.
func (s *Server) adminSendTestNotification(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	if err := s.notifier.SendTestMessage(ctx); err != nil {
		if errors.Is(err, service.ErrNotifierNotConfigured) {
			writeError(w, http.StatusBadRequest, "Chưa cấu hình Zalo Bot. Cần ORDER_NOTIFICATION_CHANNEL=zalo_bot, ZALO_BOT_TOKEN và ZALO_BOT_CHAT_ID.")
			return
		}
		s.logger.Warn("zalo bot test notification failed", slog.Any("error", err))
		writeError(w, http.StatusBadGateway, "Gửi tin thử thất bại: "+err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"sent": true})
}

// adminDiscoverChats calls getUpdates so the owner can find their chat_id after
// messaging the bot once from their personal Zalo.
func (s *Server) adminDiscoverChats(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 35*time.Second)
	defer cancel()
	chats, err := s.notifier.DiscoverChats(ctx)
	if err != nil {
		if errors.Is(err, service.ErrNotifierNotConfigured) {
			writeError(w, http.StatusBadRequest, "Chưa điền ZALO_BOT_TOKEN trong cấu hình môi trường.")
			return
		}
		s.logger.Warn("zalo bot discover chats failed", slog.Any("error", err))
		writeError(w, http.StatusBadGateway, "Không lấy được danh sách chat: "+err.Error())
		return
	}
	if chats == nil {
		chats = []service.DiscoveredChat{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": chats})
}
