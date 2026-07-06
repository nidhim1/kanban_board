package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/nidhim1/kanban-board/backend/internal/middleware"
	"github.com/nidhim1/kanban-board/backend/internal/supabase"
)

// TasksHandler manages all task-related API endpoints.
type TasksHandler struct {
	Client *supabase.Client
}

// NewTasksHandler creates a TasksHandler with the given Supabase client.
func NewTasksHandler(client *supabase.Client) *TasksHandler {
	return &TasksHandler{Client: client}
}

// GetTasks returns all tasks for the authenticated user.
//
// Uses PostgREST's "resource embedding" to include related data in a single request instead of making separate queries:
//   - task_labels → labels (the colored tags on each card)
//   - task_assignees → team_members (avatar circles on each card)
//   - comments(count) (just the count, not full comments)
//
// Optional query params for filtering:
//   - ?status=todo (filter by column)
//   - ?priority=high (filter by priority)
//   - ?search=auth (search in title)
func (h *TasksHandler) GetTasks(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)

	// Build the PostgREST query with embedded relations
	path := "tasks?select=*," +
		"task_labels(label_id,labels(*))," +
		"task_assignees(member_id,team_members(*))," +
		"comments(count)" +
		"&order=position.asc"

	// Apply optional filters from query parameters
	if status := r.URL.Query().Get("status"); status != "" {
		path += "&status=eq." + url.QueryEscape(status)
	}

	if priority := r.URL.Query().Get("priority"); priority != "" {
		path += "&priority=eq." + url.QueryEscape(priority)
	}

	if search := r.URL.Query().Get("search"); search != "" {
		path += "&title=ilike.*" + url.QueryEscape(search) + "*"
	}

	resp, err := h.Client.PostgREST("GET", path, nil, token, nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to fetch tasks"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(body)
}

// CreateTask creates a new task and logs a "created" activity entry.
//
// Expected request body:
//
//	{
//	  "title": "Build auth module",      (required)
//	  "description": "JWT + sessions",   (optional)
//	  "status": "todo",                  (optional, defaults to "todo")
//	  "priority": "high",                (optional, defaults to "normal")
//	  "due_date": "2026-07-10",          (optional)
//	  "position": 0,                     (optional)
//	  "user_id": "uuid..."               (required, set by frontend)
//	}
func (h *TasksHandler) CreateTask(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Parse and validate
	var task map[string]interface{}
	if err := json.Unmarshal(body, &task); err != nil {
		http.Error(w, `{"error":"Invalid JSON"}`, http.StatusBadRequest)
		return
	}

	title, ok := task["title"].(string)
	if !ok || title == "" {
		http.Error(w, `{"error":"Title is required"}`, http.StatusBadRequest)
		return
	}

	// Handle completed_at: If creating a task directly in "done" status, set completed_at now
	if status, ok := task["status"].(string); ok && status == "done" {
		task["completed_at"] = time.Now().UTC().Format(time.RFC3339)
	}

	updatedBody, _ := json.Marshal(task)

	resp, err := h.Client.PostgREST("POST", "tasks", updatedBody, token, nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to create task"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	// Log "created" activity for the new task
	var created []map[string]interface{}
	if err := json.Unmarshal(respBody, &created); err == nil && len(created) > 0 {
		taskID, _ := created[0]["id"].(string)
		userID, _ := created[0]["user_id"].(string)
		h.logActivity(token, taskID, userID, "created", nil)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(respBody)
}

// UpdateTask updates an existing task by ID.
//
// This handler contains our most important business logic:
//
// 1. completed_at management:
//    - If status changes TO "done" → set completed_at to now
//    - If status changes FROM "done" → clear completed_at to null
//
// 2. Activity logging:
//    - Status changes → log "status_changed" with new_status
//    - Priority changes → log "priority_changed" with new_priority
//    This builds the activity timeline shown in the task detail panel.
func (h *TasksHandler) UpdateTask(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)
	taskID := chi.URLParam(r, "id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var updates map[string]interface{}
	if err := json.Unmarshal(body, &updates); err != nil {
		http.Error(w, `{"error":"Invalid JSON"}`, http.StatusBadRequest)
		return
	}

	// --- Business logic: completed_at management ---
	if newStatus, ok := updates["status"].(string); ok {
		if newStatus == "done" {
			// Moving to done → stamp completion time
			updates["completed_at"] = time.Now().UTC().Format(time.RFC3339)
		} else {
			// Moving away from done → clear completion time
			// PostgREST interprets null as SQL NULL
			updates["completed_at"] = nil
		}
	}

	updatedBody, _ := json.Marshal(updates)

	path := fmt.Sprintf("tasks?id=eq.%s", url.QueryEscape(taskID))
	resp, err := h.Client.PostgREST("PATCH", path, updatedBody, token, nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to update task"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	// --- Activity logging ---
	// Parse the updated task to get user_id for the activity log
	var updated []map[string]interface{}
	if err := json.Unmarshal(respBody, &updated); err == nil && len(updated) > 0 {
		userID, _ := updated[0]["user_id"].(string)

		// Log status change
		if newStatus, ok := updates["status"]; ok {
			h.logActivity(token, taskID, userID, "status_changed", map[string]interface{}{
				"new_status": newStatus,
			})
		}

		// Log priority change
		if newPriority, ok := updates["priority"]; ok {
			h.logActivity(token, taskID, userID, "priority_changed", map[string]interface{}{
				"new_priority": newPriority,
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(respBody)
}

// DeleteTask removes a task by ID.
// CASCADE on foreign keys means related task_labels, task_assignees, comments, and activity_log entries are automatically deleted.
func (h *TasksHandler) DeleteTask(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)
	taskID := chi.URLParam(r, "id")

	path := fmt.Sprintf("tasks?id=eq.%s", url.QueryEscape(taskID))
	resp, err := h.Client.PostgREST("DELETE", path, nil, token, nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to delete task"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.WriteHeader(http.StatusNoContent)
}

// ReorderTasks batch-updates positions and statuses for multiple tasks.
//
// This is called after a drag-and-drop operation. The frontend sends the new position and status for every task in the affected column(s).
//
// Expected request body (array):
//
//	[
//	  {"id": "uuid-1", "status": "in_progress", "position": 0},
//	  {"id": "uuid-2", "status": "in_progress", "position": 1},
//	  {"id": "uuid-3", "status": "todo", "position": 0}
//	]
//
// Note on completed_at: if a task is dragged to "done" or away from "done", we handle completed_at here too — same logic as UpdateTask.
func (h *TasksHandler) ReorderTasks(w http.ResponseWriter, r *http.Request) {
	token := middleware.GetToken(r)

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var reorders []struct {
		ID       string `json:"id"`
		Status   string `json:"status"`
		Position int    `json:"position"`
	}

	if err := json.Unmarshal(body, &reorders); err != nil {
		http.Error(w, `{"error":"Invalid JSON array"}`, http.StatusBadRequest)
		return
	}

	// Update each task's position and status
	for _, item := range reorders {
		update := map[string]interface{}{
			"status":   item.Status,
			"position": item.Position,
		}

		// Handle completed_at for drag-to-done / drag-from-done
		if item.Status == "done" {
			update["completed_at"] = time.Now().UTC().Format(time.RFC3339)
		} else {
			update["completed_at"] = nil
		}

		updateBody, _ := json.Marshal(update)
		path := fmt.Sprintf("tasks?id=eq.%s", url.QueryEscape(item.ID))
		resp, err := h.Client.PostgREST("PATCH", path, updateBody, token, nil)
		if err != nil {
			http.Error(w, `{"error":"Failed to reorder tasks"}`, http.StatusInternalServerError)
			return
		}
		resp.Body.Close()
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"success":true}`))
}

// logActivity inserts an entry into the activity_log table.
// This is a fire-and-forget helper — if logging fails, we don't fail the parent operation. Activity logs are informational, not critical to task operations.
func (h *TasksHandler) logActivity(token, taskID, userID, action string, details map[string]interface{}) {
	if details == nil {
		details = map[string]interface{}{}
	}
	detailsJSON, _ := json.Marshal(details)

	activityBody, _ := json.Marshal(map[string]interface{}{
		"task_id": taskID,
		"user_id": userID,
		"action":  action,
		"details": json.RawMessage(detailsJSON),
	})

	resp, err := h.Client.PostgREST("POST", "activity_log", activityBody, token, nil)
	if err == nil {
		resp.Body.Close()
	}
	// Intentionally not returning errors — logging should not block the main operation from succeeding
}