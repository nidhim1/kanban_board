package middleware

import (
	"context"
	"net/http"
	"strings"
)

// contextKey is a custom type for context keys to avoid collisions.
// Using a plain string like "token" could clash with other packages that also use string keys. A custom type prevents that.
type contextKey string

// AuthTokenKey is the context key where we store the JWT token. Handlers retrieve it via middleware.GetToken(r).
const AuthTokenKey contextKey = "authToken"

// AuthMiddleware extracts the Bearer token from the Authorization header and stores it in the request context for downstream handlers.
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check for the Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":"Missing Authorization header"}`, http.StatusUnauthorized)
			return
		}

		// Expected format: "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			http.Error(w, `{"error":"Invalid Authorization header format"}`, http.StatusUnauthorized)
			return
		}

		token := parts[1]
		if token == "" {
			http.Error(w, `{"error":"Empty token"}`, http.StatusUnauthorized)
			return
		}

		// Store token in request context - handlers access it via GetToken()
		ctx := context.WithValue(r.Context(), AuthTokenKey, token)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetToken retrieves the JWT token from the request context.
// Returns empty string if no token is present (shouldn't happen if AuthMiddleware is applied to the route).
func GetToken(r *http.Request) string {
	token, _ := r.Context().Value(AuthTokenKey).(string)
	return token
}