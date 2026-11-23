package handler

import (
	"net/http"
)

// healthz reports process liveness. It must not depend on downstream services
// so the orchestrator does not restart a healthy process during a DB blip.
func (s *Server) healthz(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// readyz reports readiness, including database connectivity.
func (s *Server) readyz(w http.ResponseWriter, r *http.Request) {
	if s.db != nil {
		if err := s.db.Ping(r.Context()); err != nil {
			writeError(w, http.StatusServiceUnavailable, "database unavailable")
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}
