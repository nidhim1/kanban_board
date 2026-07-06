package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/nidhim1/kanban-board/backend/internal/config"
	"github.com/nidhim1/kanban-board/backend/internal/handlers"
	"github.com/nidhim1/kanban-board/backend/internal/middleware"
	"github.com/nidhim1/kanban-board/backend/internal/supabase"
)

func main() {
	// Load config from .env (fails fast if required vars are missing)
	cfg := config.Load()

	// Create the Supabase client (shared across all handlers)
	client := supabase.NewClient(cfg.SupabaseURL, cfg.SupabaseAnonKey)

	// Initialize handlers with the shared Supabase client
	authHandler := handlers.NewAuthHandler(client)
	tasksHandler := handlers.NewTasksHandler(client)

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

	// --- Public Routes (no auth required) ---

	// Health check — used by deployment platforms (Render, etc.)
	// to verify the server is alive. Also useful for manual testing.
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Auth endpoints are public - the user doesn't have a token yet
	r.Post("/api/auth/anonymous", authHandler.SignInAnonymously)
	r.Post("/api/auth/refresh", authHandler.RefreshToken)
	
	// --- Protected Routes (auth required) ---
	// Everything inside this group goes through AuthMiddleware first.
	r.Group(func(r chi.Router) {
			r.Use(middleware.AuthMiddleware)
	})

	r.Group(func(r chi.Router) {
		r.Use(middleware.AuthMiddleware)

		// Tasks — core CRUD and drag-and-drop reorder
		r.Get("/api/tasks", tasksHandler.GetTasks)
		r.Post("/api/tasks", tasksHandler.CreateTask)
		r.Patch("/api/tasks/{id}", tasksHandler.UpdateTask)
		r.Delete("/api/tasks/{id}", tasksHandler.DeleteTask)
		r.Put("/api/tasks/reorder", tasksHandler.ReorderTasks)
	})

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server starting on %s", addr)
	log.Fatal(http.ListenAndServe(addr, r))
}