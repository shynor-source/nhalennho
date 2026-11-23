// Package service — notifier pushes order events to the shop owner's personal
// Zalo through the official Zalo Bot platform (bot created from the
// "Zalo Bot Manager" OA; free, no Zalo OA registration needed).
//
// Docs: https://docs.zaloplatforms.com/docs/BOT
// API base: https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/<method>
package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/qg/web/backend/internal/config"
	"github.com/qg/web/backend/internal/model"
)

// ErrNotifierNotConfigured is returned when the Zalo Bot is not configured.
var ErrNotifierNotConfigured = errors.New("zalo bot not configured")

const sendMessageMaxLen = 2000

// Notifier sends order notifications through the Zalo Bot API.
type Notifier struct {
	cfg  *config.Config
	http *http.Client
}

func NewNotifier(cfg *config.Config) *Notifier {
	return &Notifier{
		cfg: cfg,
		http: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// Configured reports whether the Zalo Bot notification channel is set up.
func (n *Notifier) Configured() bool {
	return strings.EqualFold(n.cfg.OrderNotificationChannel, "zalo_bot") &&
		n.cfg.ZaloBotToken != "" && n.cfg.ZaloBotChatID != ""
}

type botAPIResponse struct {
	OK          bool            `json:"ok"`
	Result      json.RawMessage `json:"result"`
	Description string          `json:"description"`
	ErrorCode   int             `json:"error_code"`
}

// sendMessage posts a text message to the configured chat.
func (n *Notifier) sendMessage(ctx context.Context, text string) error {
	if !n.Configured() {
		return ErrNotifierNotConfigured
	}
	payload := map[string]string{
		"chat_id": n.cfg.ZaloBotChatID,
		"text":    text,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	url := n.cfg.ZaloBotAPIBase + "/bot" + n.cfg.ZaloBotToken + "/sendMessage"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := n.http.Do(req)
	if err != nil {
		return fmt.Errorf("call zalo bot api: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return fmt.Errorf("read response: %w", err)
	}

	var parsed botAPIResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return fmt.Errorf("parse response (status %d): %w", resp.StatusCode, err)
	}
	if !parsed.OK {
		return fmt.Errorf("zalo bot api error %d: %s", parsed.ErrorCode, parsed.Description)
	}
	return nil
}

// truncate caps a message at the Zalo Bot limit on rune boundaries.
func truncateMessage(s string, max int) string {
	if utf8.RuneCountInString(s) <= max {
		return s
	}
	runes := []rune(s)
	return string(runes[:max-1]) + "…"
}

func formatMoney(v int64) string {
	s := strconv.FormatInt(v, 10)
	// Simple dot-grouping from the right (vi-VN style) without locale deps.
	neg := strings.HasPrefix(s, "-")
	s = strings.TrimPrefix(s, "-")
	var parts []string
	for len(s) > 3 {
		parts = append([]string{s[len(s)-3:]}, parts...)
		s = s[:len(s)-3]
	}
	parts = append([]string{s}, parts...)
	out := strings.Join(parts, ".") + "đ"
	if neg {
		out = "-" + out
	}
	return out
}

// optionKindLabel renders an option kind in Vietnamese for notifications.
func optionKindLabel(kind string) string {
	switch kind {
	case model.OptionKindColor:
		return "Màu"
	case model.OptionKindSize:
		return "Kích thước"
	case model.OptionKindMaterial:
		return "Chất liệu"
	case model.OptionKindPackaging:
		return "Đóng gói"
	}
	return kind
}

func paymentLabel(o *model.OrderRequest) string {
	method := "Chuyển khoản QR"
	if o.PaymentMethod == "cod" {
		method = "Ship COD"
	}
	status := "Chưa thanh toán"
	switch o.PaymentStatus {
	case "submitted":
		status = "Khách báo đã chuyển khoản"
	case "paid":
		status = "Đã thanh toán"
	}
	return method + " — " + status
}

func formatOrderMessage(title string, o *model.OrderRequest) string {
	var b strings.Builder
	b.WriteString(title)
	b.WriteString("\nMã đơn: ")
	b.WriteString(o.Code)
	b.WriteString("\nKhách: ")
	b.WriteString(o.CustomerName)
	b.WriteString("\nSĐT: ")
	b.WriteString(o.Phone)
	if o.Address != "" {
		b.WriteString("\nĐịa chỉ: ")
		b.WriteString(o.Address)
	}
	b.WriteString("\nSản phẩm:")
	for _, it := range o.Items {
		b.WriteString("\n- ")
		b.WriteString(it.ProductName)
		if len(it.Options) > 0 {
			b.WriteString(" (")
			for i, opt := range it.Options {
				if i > 0 {
					b.WriteString(", ")
				}
				b.WriteString(optionKindLabel(opt.Kind))
				b.WriteString(": ")
				b.WriteString(opt.Value)
			}
			b.WriteString(")")
		}
		b.WriteString(" x")
		b.WriteString(strconv.Itoa(it.Quantity))
		b.WriteString(" (")
		b.WriteString(formatMoney(it.UnitPriceVND * int64(it.Quantity)))
		b.WriteString(")")
	}
	b.WriteString("\nTạm tính: ")
	b.WriteString(formatMoney(o.TotalVND))
	b.WriteString("\nThanh toán: ")
	b.WriteString(paymentLabel(o))
	if o.Note != "" {
		b.WriteString("\nGhi chú khách: ")
		b.WriteString(o.Note)
	}
	return truncateMessage(b.String(), sendMessageMaxLen)
}

// formatCustomOrderMessage renders a custom-order (đặt làm riêng) request:
// description only — no cart items, total or payment step exist for this flow.
func formatCustomOrderMessage(o *model.CustomOrderRequest) string {
	var b strings.Builder
	b.WriteString("Yêu cầu đặt làm riêng")
	b.WriteString("\nMã: ")
	b.WriteString(o.Code)
	b.WriteString("\nKhách: ")
	b.WriteString(o.CustomerName)
	b.WriteString("\nSĐT: ")
	b.WriteString(o.Phone)
	if o.Address != "" {
		b.WriteString("\nĐịa chỉ: ")
		b.WriteString(o.Address)
	}
	b.WriteString("\nMô tả: ")
	b.WriteString(truncateMessage(o.Note, 600))
	return truncateMessage(b.String(), sendMessageMaxLen)
}

// NotifyNewOrder pushes a newly created order to the owner's Zalo.
func (n *Notifier) NotifyNewOrder(ctx context.Context, o *model.OrderRequest) error {
	return n.sendMessage(ctx, formatOrderMessage("Đơn hàng mới", o))
}

// NotifyCustomOrder pushes a new custom-order request (đặt làm riêng) —
// no product list or total, just the customer's description.
func (n *Notifier) NotifyCustomOrder(ctx context.Context, o *model.CustomOrderRequest) error {
	return n.sendMessage(ctx, formatCustomOrderMessage(o))
}

// NotifyPaymentSubmitted alerts the owner that the customer claims to have
// transferred the money so the owner can verify the bank statement.
func (n *Notifier) NotifyPaymentSubmitted(ctx context.Context, o *model.OrderRequest) error {
	msg := formatOrderMessage("Khách báo đã chuyển khoản — kiểm tra ngân hàng", o)
	return n.sendMessage(ctx, msg)
}

// SendTestMessage sends a short message to verify the setup works.
func (n *Notifier) SendTestMessage(ctx context.Context) error {
	return n.sendMessage(ctx, "Tin thử từ website Nhà Len Nhỏ — kênh thông báo đơn hàng đã hoạt động.")
}

// DiscoveredChat is one chat that has messaged the bot recently.
type DiscoveredChat struct {
	ChatID      string `json:"chatId"`
	DisplayName string `json:"displayName"`
	Text        string `json:"text"`
	At          string `json:"at"`
}

type getUpdatesEvent struct {
	EventName string `json:"event_name"`
	Message   *struct {
		Date int64 `json:"date"`
		From *struct {
			ID          string `json:"id"`
			DisplayName string `json:"display_name"`
		} `json:"from"`
		Chat *struct {
			ID string `json:"id"`
		} `json:"chat"`
		Text string `json:"text"`
	} `json:"message"`
}

// DiscoverChats calls getUpdates so the admin can find their chat_id after
// messaging the bot once from their personal Zalo account.
func (n *Notifier) DiscoverChats(ctx context.Context) ([]DiscoveredChat, error) {
	if n.cfg.ZaloBotToken == "" {
		return nil, ErrNotifierNotConfigured
	}
	url := n.cfg.ZaloBotAPIBase + "/bot" + n.cfg.ZaloBotToken + "/getUpdates?timeout=1"
	// GET with a short server-side long-poll window: without a pending update
	// the server replies 408 "Request timeout" after ~2s instead of blocking
	// for the 30s default. Treat that as "no chats yet".
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := n.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call getUpdates: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	// getUpdates returns {ok:true, result:[...events]}
	var parsed struct {
		OK        bool              `json:"ok"`
		Result    []getUpdatesEvent `json:"result"`
		Desc      string            `json:"description"`
		ErrorCode int               `json:"error_code"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return nil, fmt.Errorf("parse response (status %d): %w", resp.StatusCode, err)
	}
	if !parsed.OK {
		// error_code 408 (HTTP status may still be 200) means the long-poll
		// window elapsed without a pending update — the owner simply has not
		// messaged the bot yet.
		if parsed.ErrorCode == 408 || parsed.Desc == "Request timeout" {
			return []DiscoveredChat{}, nil
		}
		return nil, fmt.Errorf("getUpdates error: %s", parsed.Desc)
	}

	seen := map[string]bool{}
	out := make([]DiscoveredChat, 0, len(parsed.Result))
	for _, ev := range parsed.Result {
		if ev.Message == nil || ev.Message.Chat == nil || ev.Message.Chat.ID == "" {
			continue
		}
		id := ev.Message.Chat.ID
		if seen[id] {
			continue
		}
		seen[id] = true
		display := ""
		if ev.Message.From != nil {
			display = ev.Message.From.DisplayName
		}
		at := ""
		if ev.Message.Date > 0 {
			at = time.UnixMilli(ev.Message.Date).Format(time.RFC3339)
		}
		out = append(out, DiscoveredChat{
			ChatID:      id,
			DisplayName: html.EscapeString(display),
			Text:        ev.Message.Text,
			At:          at,
		})
	}
	return out, nil
}
