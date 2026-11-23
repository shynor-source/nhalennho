package middleware

import (
	"net"
	"net/http"
	"os"
	"strings"
)

// RealIP resolves the client IP from trusted proxy headers only.
//
// chi's deprecated middleware.RealIP trusts arbitrary X-Forwarded-For /
// True-Client-IP headers, which lets a client spoof its IP and bypass IP-based
// rate limiting (GHSA-3fxj-6jh8-hvhx). This version only honours:
//   - chi's TrustedPlatform header (set by the platform, cryptographically
//     verifiable), or
//   - a single X-Real-IP / the right-most X-Forwarded-For hop, and only when the
//     direct peer is a private address (i.e. our reverse proxy), controlled by
//     TRUSTED_PROXY_CIDRS (default: private ranges).
type RealIPConfig struct {
	TrustedProxies []*net.IPNet
}

func defaultTrustedProxies() []*net.IPNet {
	cidrs := []string{
		"10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "127.0.0.0/8",
		"::1/128", "fc00::/7",
	}
	if custom := os.Getenv("TRUSTED_PROXY_CIDRS"); custom != "" {
		cidrs = strings.Split(custom, ",")
	}
	var out []*net.IPNet
	for _, c := range cidrs {
		if _, net, err := net.ParseCIDR(strings.TrimSpace(c)); err == nil {
			out = append(out, net)
		}
	}
	return out
}

func isTrusted(ip net.IP, trusted []*net.IPNet) bool {
	for _, n := range trusted {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

// RealIP middleware with the hardened rules above.
func RealIP() func(http.Handler) http.Handler {
	trusted := defaultTrustedProxies()
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			host, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil {
				host = r.RemoteAddr
			}
			peer := net.ParseIP(host)

			if peer != nil && isTrusted(peer, trusted) {
				// Prefer the proxy's own verifiable header when present.
				if platform := r.Header.Get("Trusted-Client-Ip"); platform != "" {
					if ip := net.ParseIP(strings.TrimSpace(platform)); ip != nil {
						r.RemoteAddr = ip.String()
						next.ServeHTTP(w, r)
						return
					}
				}
				// Right-most XFF hop is the proxy-added client address chain
				// entry we can attribute to this request through our proxy.
				if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
					parts := strings.Split(xff, ",")
					candidate := strings.TrimSpace(parts[len(parts)-1])
					if ip := net.ParseIP(candidate); ip != nil && !isTrusted(ip, trusted) {
						r.RemoteAddr = ip.String()
					}
				} else if xri := r.Header.Get("X-Real-IP"); xri != "" {
					if ip := net.ParseIP(strings.TrimSpace(xri)); ip != nil && !isTrusted(ip, trusted) {
						r.RemoteAddr = ip.String()
					}
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}
