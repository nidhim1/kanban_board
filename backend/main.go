package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/nidhim1/kanban-board/backend/internal/config"
	"github.com/nidhim1/kanban-board/backend/internal/supabase"
)

func main() {
	// Load config from .env (fails fast if required vars are missing)
	cfg := config.Load()

	// Create the Supabase client (shared across all handlers)
	_ = supabase.NewClient(cfg.SupabaseURL, cfg.SupabaseAnonKey)

	// Create the Chi router
	r := chi.NewRouter()

	// --- Global Middleware ---

	// Logger: prints each request like "GET /api/tasks 200 12ms"
	r.Use(chimiddleware.Logger)

	// Recoverer: catches panics in handlers and returns 500 instead of crashing the whole server
	r.Use(chimiddleware.Recoverer)

	// RequestID: adds a unique ID to each request for tracing/debugging
	r.Use(chimiddleware.RequestID)

	// CORS: allows the React frontend to call our API. Without this, browsers block cross-origin requests.
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{
			"http://localhost:5173",   // Vite dev server
			"http://localhost:3000",   // Alternative dev port
			"https://*.vercel.app",    // Production frontend
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300, // Cache preflight for 5 minutes
	}))

	// --- Routes ---

	// Health check — used by deployment platforms (Render, etc.)
	// to verify the server is alive. Also useful for manual testing.
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server starting on %s", addr)
	log.Fatal(http.ListenAndServe(addr, r))
}