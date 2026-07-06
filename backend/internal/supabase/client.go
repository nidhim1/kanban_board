package supabase

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
)

// Client handles all HTTP communication with Supabase.
// It doesn't parse responses - handlers do that, because different endpoints return different shapes.
type Client struct {
	BaseURL string       // e.g. "https://xyz.supabase.co"
	AnonKey string       // Supabase anon/public key
	HTTP    *http.Client // reusable HTTP client (connection pooling)
}

// NewClient creates a Supabase client.
// Uses a shared http.Client for connection reuse across requests.
func NewClient(baseURL, anonKey string) *Client {
	return &Client{
		BaseURL: baseURL,
		AnonKey: anonKey,
		HTTP:    &http.Client{},
	}
}

// PostgREST sends a request to Supabase's PostgREST API.
//
// Parameters:
//   - method: HTTP method (GET, POST, PATCH, DELETE)
//   - path: resource path after /rest/v1/ (e.g. "tasks?status=eq.todo")
//   - body: JSON request body (nil for GET/DELETE)
//   - authToken: user's JWT token for RLS enforcement
//   - extraHeaders: additional headers (e.g. Prefer for upsert behavior)
//
// The caller is responsible for closing resp.Body.
func (c *Client) PostgREST(method, path string, body []byte, authToken string, extraHeaders map[string]string) (*http.Response, error) {
	url := fmt.Sprintf("%s/rest/v1/%s", c.BaseURL, path)

	var bodyReader io.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	}

	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	// Required headers for every Supabase request
	req.Header.Set("apikey", c.AnonKey)
	req.Header.Set("Content-Type", "application/json")

	// "return=representation" tells PostgREST to return the
	// created/updated row in the response (instead of empty 204)
	req.Header.Set("Prefer", "return=representation")

	// Auth: use user's JWT if provided, otherwise fall back
	// to the anon key (for non-authenticated queries)
	if authToken != "" {
		req.Header.Set("Authorization", "Bearer "+authToken)
	} else {
		req.Header.Set("Authorization", "Bearer "+c.AnonKey)
	}

	// Allow handlers to set extra headers (e.g. for upsert)
	for k, v := range extraHeaders {
		req.Header.Set(k, v)
	}

	return c.HTTP.Do(req)
}

// Auth sends a request to Supabase's GoTrue auth API.
//
// Parameters:
//   - method: HTTP method (POST for signup/token)
//   - path: path after /auth/v1/ (e.g. "signup", "token?grant_type=refresh_token")
//   - body: JSON request body
//
// The caller is responsible for closing resp.Body.
func (c *Client) Auth(method, path string, body []byte) (*http.Response, error) {
	url := fmt.Sprintf("%s/auth/v1/%s", c.BaseURL, path)

	var bodyReader io.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	}

	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	// Auth API only needs the apikey, no user token
	req.Header.Set("apikey", c.AnonKey)
	req.Header.Set("Content-Type", "application/json")

	return c.HTTP.Do(req)
}