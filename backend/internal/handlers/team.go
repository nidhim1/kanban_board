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

// TeamHandler manages team member CRUD and task assignments.
type TeamHandler struct {
	Client *supabase.Client
}

func NewTeamHandler(client *supabase.Client) *TeamHandler {
	return &TeamHandler{Client: client}
}

// GetMembers returns all team members for the authenticated user.
func (h *TeamHandler) GetMembers(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)

	resp, err := h.Client.PostgREST("GET", "team_members?order=created_at.asc", nil, token, nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to fetch team members"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(body)
}

// CreateMember creates a new team member.
// Expected body: {"name": "Anna Rodriguez", "avatar_color": "#378ADD", "user_id": "uuid"}
func (h *TeamHandler) CreateMember(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var member map[string]interface{}
	if err := json.Unmarshal(body, &member); err != nil {
		http.Error(w, `{"error":"Invalid JSON"}`, http.StatusBadRequest)
		return
	}

	name, ok := member["name"].(string)
	if !ok || name == "" {
		http.Error(w, `{"error":"Name is required"}`, http.StatusBadRequest)
		return
	}

	resp, err := h.Client.PostgREST("POST", "team_members", body, token, nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to create team member"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(respBody)
}

// DeleteMember removes a team member by ID.
// task_assignees entries are automatically cleaned up via CASCADE.
func (h *TeamHandler) DeleteMember(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)
	memberID := chi.URLParam(r, "id")

	path := fmt.Sprintf("team_members?id=eq.%s", url.QueryEscape(memberID))
	resp, err := h.Client.PostgREST("DELETE", path, nil, token, nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to delete team member"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.WriteHeader(http.StatusNoContent)
}

// AssignMember adds a member to a task.
// Uses ignore-duplicates to safely handle double-assignments.
// Expected body: {"task_id": "uuid", "member_id": "uuid"}
func (h *TeamHandler) AssignMember(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	resp, err := h.Client.PostgREST("POST", "task_assignees", body, token,
		map[string]string{"Prefer": "return=representation,resolution=ignore-duplicates"})
	if err != nil {
		http.Error(w, `{"error":"Failed to assign member"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(respBody)
}

// RemoveMember removes a member from a task.
func (h *TeamHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)
	taskID := chi.URLParam(r, "taskId")
	memberID := chi.URLParam(r, "memberId")

	path := fmt.Sprintf("task_assignees?task_id=eq.%s&member_id=eq.%s",
		url.QueryEscape(taskID), url.QueryEscape(memberID))
	resp, err := h.Client.PostgREST("DELETE", path, nil, token, nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to remove member from task"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.WriteHeader(http.StatusNoContent)
}