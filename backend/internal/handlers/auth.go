package handlers

import (
	"io"
	"net/http"

	"github.com/nidhim1/kanban-board/backend/internal/supabase"
)

// AuthHandler manages authentication endpoints. It proxies requests to Supabase's GoTrue auth service.
type AuthHandler struct {
	Client *supabase.Client
}

// NewAuthHandler creates an AuthHandler with the given Supabase client.
func NewAuthHandler(client *supabase.Client) *AuthHandler {
	return &AuthHandler{Client: client}
}

// SignInAnonymously creates a guest session via Supabase anonymous auth.
//
// How it works:
//   1. Frontend calls POST /api/auth/anonymous (no body needed)
//   2. We forward an empty signup request to Supabase GoTrue
//   3. Supabase creates an anonymous user and returns:
//      - access_token (JWT for making authenticated requests)
//      - refresh_token (for getting a new access_token when it expires)
//      - user object (with the user's UUID)
//   4. We pass the entire response back to the frontend
//
// The frontend stores these tokens and includes the access_token in the Authorization header on all subsequent requests.
func (h *AuthHandler) SignInAnonymously(w http.ResponseWriter, r *http.Request) {
	resp, err := h.Client.Auth("POST", "signup", []byte(`{}`))
	if err != nil {
		http.Error(w, `{"error":"Failed to create anonymous session"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(body)
}

// RefreshToken exchanges a refresh_token for a new access_token.
//
// JWTs expire (Supabase default is 1 hour). When that happens, the frontend sends its refresh_token to get fresh credentials without making the user re-authenticate.
//
// Expected request body: {"refresh_token": "..."}
func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	resp, err := h.Client.Auth("POST", "token?grant_type=refresh_token", body)
	if err != nil {
		http.Error(w, `{"error":"Failed to refresh token"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(respBody)
}