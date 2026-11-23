package handler

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/qg/web/backend/internal/config"
	appmw "github.com/qg/web/backend/internal/middleware"
	"github.com/qg/web/backend/internal/repository"
	"github.com/qg/web/backend/internal/service"
)

// Server holds dependencies shared by every HTTP handler.
type Server struct {
	cfg          *config.Config
	db           *repository.DB
	logger       *slog.Logger
	auth         *service.AuthService
	orders       *service.OrderService
	customerAuth *service.CustomerAuthService
	notifier     *service.Notifier
	forms        *appmw.RateLimiter
	login        *appmw.RateLimiter
	global       *appmw.RateLimiter
	acctFailures *appmw.RateLimiter
}

// New builds a Server with its services and rate limiters.
func New(cfg *config.Config, db *repository.DB, logger *slog.Logger) *Server {
	return &Server{
		cfg:          cfg,
		db:           db,
		logger:       logger,
		auth:         service.NewAuthService(db, cfg),
		orders:       service.NewOrderService(db),
		customerAuth: service.NewCustomerAuthService(db, cfg),
		notifier:     service.NewNotifier(cfg),
		forms:        appmw.NewRateLimiter(cfg.FormRateLimitPerMinute, time.Minute),
		login:        appmw.NewRateLimiter(cfg.LoginRateLimitPerMinute, time.Minute),
		global:       appmw.NewRateLimiter(cfg.GlobalRateLimitPerMinute, time.Minute),
		acctFailures: appmw.NewRateLimiter(cfg.AccountFailureLimitPerMinute, time.Minute),
	}
}

// Routes assembles the HTTP router.
func (s *Server) Routes() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(appmw.RealIP())
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(appmw.SecurityHeaders)
	r.Use(appmw.RequestLogger(s.logger))
	r.Use(appmw.CORS(s.cfg.CORSAllowedOrigin))

	// Global per-IP rate limit on every public path (catalog browsing, media,
	// forms…). Health endpoints are exempt so container healthchecks and
	// monitoring cannot be starved by an abusive client (brief 8.1/8.4:
	// abuse controls in depth; the stricter per-route limiters below still
	// apply on top of this one).
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			path := r.URL.Path
			if path == "/healthz" || path == "/readyz" {
				next.ServeHTTP(w, r)
				return
			}
			s.global.Middleware(appmw.ClientIP)(next).ServeHTTP(w, r)
		})
	})

	r.Get("/healthz", s.healthz)
	r.Get("/readyz", s.readyz)
	r.Get("/media/{name}", s.serveMedia)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/", func(w http.ResponseWriter, _ *http.Request) {
			writeJSON(w, http.StatusOK, map[string]string{"service": "qg-web-api", "version": "v1"})
		})

		// Public catalog and content.
		r.Get("/categories", s.listCategories)
		r.Get("/products", s.listProducts)
		r.Get("/products/{slug}", s.getProduct)
		r.Get("/colors", s.listColors)
		r.Get("/posts", s.listPosts)
		r.Get("/posts/{slug}", s.getPost)

		// Public form submissions (rate limited per IP).
		r.Group(func(r chi.Router) {
			r.Use(s.forms.Middleware(formKey))
			r.Post("/order-requests", s.createOrder)
			r.Post("/custom-order-requests", s.createCustomOrder)
			r.Post("/products/{slug}/reviews", s.createReview)
		})

		// Unified login (admin or customer) and session introspection.
		r.Group(func(r chi.Router) {
			r.Use(s.login.Middleware(loginKey))
			r.Post("/auth/login", s.unifiedLogin)
		})
		r.Post("/auth/logout", s.unifiedLogout)
		r.Get("/auth/me", s.unifiedMe)

		// Customer accounts, cart checkout and order history.
		r.Group(func(r chi.Router) {
			r.Use(s.login.Middleware(loginKey))
			r.Post("/account/register", s.customerRegister)
			r.Post("/account/login", s.customerLogin)
		})
		r.Post("/account/logout", s.customerLogout)
		r.Get("/account/me", s.customerMe)
		r.Group(func(r chi.Router) {
			r.Use(s.requireCustomer)
			r.With(s.forms.Middleware(formKey)).Post("/checkout", s.checkout)
			r.Get("/account/orders", s.customerOrders)
			r.Get("/account/orders/{code}", s.customerOrder)
			r.Post("/account/orders/{code}/payment-submitted", s.customerPaymentSubmitted)
			r.Post("/account/password", s.customerChangePassword)
		})

		// Admin API.
		r.Route("/admin", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(s.login.Middleware(loginKey))
				r.Post("/login", s.adminLogin)
			})
			r.Post("/logout", s.adminLogout)
			r.Get("/me", s.adminMe)

			r.Group(func(r chi.Router) {
				r.Use(s.requireAdmin)
				r.Get("/stats", s.adminStats)

				r.Post("/uploads", s.adminUploadImage)

				r.Get("/posts", s.adminListPosts)
				r.Post("/posts", s.adminCreatePost)
				r.Post("/posts/bulk", s.adminBulkCreatePosts)
				r.Get("/posts/{id}", s.adminGetPost)
				r.Put("/posts/{id}", s.adminUpdatePost)
				r.Delete("/posts/{id}", s.adminDeletePost)

				r.Get("/products", s.adminListProducts)
				r.Post("/products", s.adminCreateProduct)
				r.Get("/products/{id}", s.adminGetProduct)
				r.Put("/products/{id}", s.adminUpdateProduct)
				r.Delete("/products/{id}", s.adminDeleteProduct)

				r.Get("/orders", s.adminListOrders)
				r.Get("/orders/{id}", s.adminGetOrder)
				r.Patch("/orders/{id}/status", s.adminUpdateOrderStatus)
				r.Patch("/orders/{id}/note", s.adminUpdateOrderNote)
				r.Delete("/orders/{id}", s.adminDeleteOrder)
				r.Patch("/orders/{id}/payment", s.adminUpdateOrderPayment)

				r.Post("/notifications/test", s.adminSendTestNotification)
				r.Get("/notifications/chats", s.adminDiscoverChats)

				r.Get("/custom-orders", s.adminListCustomOrders)
				r.Get("/custom-orders/{id}", s.adminGetCustomOrder)
				r.Patch("/custom-orders/{id}/status", s.adminUpdateCustomOrderStatus)
				r.Patch("/custom-orders/{id}/note", s.adminUpdateCustomOrderNote)
				r.Delete("/custom-orders/{id}", s.adminDeleteCustomOrder)

				r.Get("/reviews", s.adminListReviews)
				r.Patch("/reviews/{id}", s.adminApproveReview)
				r.Delete("/reviews/{id}", s.adminDeleteReview)

				r.Get("/customers", s.adminListCustomers)
				r.Patch("/customers/{id}", s.adminUpdateCustomer)
				r.Delete("/customers/{id}", s.adminDeleteCustomer)

				r.Post("/password", s.adminChangePassword)
			})
		})
	})

	return r
}

func formKey(r *http.Request) string  { return "form:" + appmw.ClientIP(r) }
func loginKey(r *http.Request) string { return "login:" + appmw.ClientIP(r) }
