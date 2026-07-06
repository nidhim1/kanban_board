package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/go-chi/chi/v5"
	"github.com/nidhim1/kanban-board/backend/internal/middleware"
	"github.com/nidhim1/kanban-board/backend/internal/supabase"
)

// LabelsHandler manages label CRUD and task-label assignments.
type LabelsHandler struct {
	Client *supabase.Client
}

func NewLabelsHandler(client *supabase.Client) *LabelsHandler {
	return &LabelsHandler{Client: client}
}

// GetLabels returns all labels for the authenticated user, ordered by creation date so the UI shows them consistently.
func (h *LabelsHandler) GetLabels(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)

	resp, err := h.Client.PostgREST("GET", "labels?order=created_at.asc", nil, token, nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to fetch labels"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(body)
}

// CreateLabel creates a new label.
// Expected body: {"name": "Feature", "color": "#378ADD", "user_id": "uuid"}
func (h *LabelsHandler) CreateLabel(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate that name is present
	var label map[string]interface{}
	if err := json.Unmarshal(body, &label); err != nil {
		http.Error(w, `{"error":"Invalid JSON"}`, http.StatusBadRequest)
		return
	}

	name, ok := label["name"].(string)
	if !ok || name == "" {
		http.Error(w, `{"error":"Name is required"}`, http.StatusBadRequest)
		return
	}

	resp, err := h.Client.PostgREST("POST", "labels", body, token, nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to create label"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(respBody)
}

// DeleteLabel removes a label by ID.
// task_labels entries referencing this label are automatically deleted via ON DELETE CASCADE.
func (h *LabelsHandler) DeleteLabel(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)
	labelID := chi.URLParam(r, "id")

	path := fmt.Sprintf("labels?id=eq.%s", url.QueryEscape(labelID))
	resp, err := h.Client.PostgREST("DELETE", path, nil, token, nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to delete label"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.WriteHeader(http.StatusNoContent)
}

// AssignLabel adds a label to a task by inserting into task_labels.
//
// Uses PostgREST's "resolution=ignore-duplicates" header so that assigning the same label twice doesn't cause an error — it just silently ignores the duplicate. This is safer than checking first because it avoids race conditions.
//
// Expected body: {"task_id": "uuid", "label_id": "uuid"}
func (h *LabelsHandler) AssignLabel(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	resp, err := h.Client.PostgREST("POST", "task_labels", body, token,
		map[string]string{"Prefer": "return=representation,resolution=ignore-duplicates"})
	if err != nil {
		http.Error(w, `{"error":"Failed to assign label"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(respBody)
}

// RemoveLabel removes a label from a task.
// Deletes the row from task_labels where both task_id and label_id match.
func (h *LabelsHandler) RemoveLabel(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)
	taskID := chi.URLParam(r, "taskId")
	labelID := chi.URLParam(r, "labelId")

	path := fmt.Sprintf("task_labels?task_id=eq.%s&label_id=eq.%s",
		url.QueryEscape(taskID), url.QueryEscape(labelID))
	resp, err := h.Client.PostgREST("DELETE", path, nil, token, nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to remove label"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.WriteHeader(http.StatusNoContent)
}