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

// CommentsHandler manages task comments.
type CommentsHandler struct {
	Client *supabase.Client
}

func NewCommentsHandler(client *supabase.Client) *CommentsHandler {
	return &CommentsHandler{Client: client}
}

// GetComments returns all comments for a specific task, ordered chronologically (oldest first)
func (h *CommentsHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)
	taskID := chi.URLParam(r, "taskId")

	path := fmt.Sprintf("comments?task_id=eq.%s&order=created_at.asc",
		url.QueryEscape(taskID))
	resp, err := h.Client.PostgREST("GET", path, nil, token, nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to fetch comments"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(body)
}

// CreateComment adds a comment to a task and logs a "commented" activity.
//
// The task_id comes from the URL path, not the request body.
// This prevents a mismatch where someone sends task_id=X in the URL but task_id=Y in the body.
//
// Expected body: {"content": "Looks good!", "user_id": "uuid", "author_name": "Guest"}
func (h *CommentsHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)
	taskID := chi.URLParam(r, "taskId")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var comment map[string]interface{}
	if err := json.Unmarshal(body, &comment); err != nil {
		http.Error(w, `{"error":"Invalid JSON"}`, http.StatusBadRequest)
		return
	}

	content, ok := comment["content"].(string)
	if !ok || content == "" {
		http.Error(w, `{"error":"Content is required"}`, http.StatusBadRequest)
		return
	}

	// Override task_id from URL to prevent mismatches
	comment["task_id"] = taskID
	updatedBody, _ := json.Marshal(comment)

	resp, err := h.Client.PostgREST("POST", "comments", updatedBody, token, nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to create comment"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	// Log "commented" activity (fire-and-forget)
	var created []map[string]interface{}
	if err := json.Unmarshal(respBody, &created); err == nil && len(created) > 0 {
		userID, _ := created[0]["user_id"].(string)
		activityBody, _ := json.Marshal(map[string]interface{}{
			"task_id": taskID,
			"user_id": userID,
			"action":  "commented",
			"details": map[string]interface{}{},
		})
		actResp, err := h.Client.PostgREST("POST", "activity_log", activityBody, token, nil)
		if err == nil {
			actResp.Body.Close()
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(respBody)
}

// DeleteComment removes a comment by ID.
// RLS ensures users can only delete their own comments.
func (h *CommentsHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)
	commentID := chi.URLParam(r, "id")

	path := fmt.Sprintf("comments?id=eq.%s", url.QueryEscape(commentID))
	resp, err := h.Client.PostgREST("DELETE", path, nil, token, nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to delete comment"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.WriteHeader(http.StatusNoContent)
}