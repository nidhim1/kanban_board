package handlers

import (
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/go-chi/chi/v5"
	"github.com/nidhim1/kanban-board/backend/internal/middleware"
	"github.com/nidhim1/kanban-board/backend/internal/supabase"
)

// ActivityHandler provides read-only access to the activity log.
type ActivityHandler struct {
	Client *supabase.Client
}

func NewActivityHandler(client *supabase.Client) *ActivityHandler {
	return &ActivityHandler{Client: client}
}

// GetActivity returns the activity log for a specific task.
// Ordered newest-first so the most recent action appears at the top.
// Limited to 50 entries to keep the response size reasonable.
func (h *ActivityHandler) GetActivity(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)
	taskID := chi.URLParam(r, "taskId")

	path := fmt.Sprintf("activity_log?task_id=eq.%s&order=created_at.desc&limit=50",
		url.QueryEscape(taskID))
	resp, err := h.Client.PostgREST("GET", path, nil, token, nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to fetch activity log"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(body)
}