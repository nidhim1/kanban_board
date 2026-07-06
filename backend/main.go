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

	// Initialize all handlers with the shared Supabase client
	authHandler := handlers.NewAuthHandler(client)
	tasksHandler := handlers.NewTasksHandler(client)
	labelsHandler := handlers.NewLabelsHandler(client)
	teamHandler := handlers.NewTeamHandler(client)
	commentsHandler := handlers.NewCommentsHandler(client)
	activityHandler := handlers.NewActivityHandler(client)

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

	// Auth endpoints are public
	r.Post("/api/auth/anonymous", authHandler.SignInAnonymously)
	r.Post("/api/auth/refresh", authHandler.RefreshToken)
	
	// --- Protected Routes ---
	r.Group(func(r chi.Router) {
		r.Use(middleware.AuthMiddleware)

		// Tasks — core CRUD and drag-and-drop reorder
		r.Get("/api/tasks", tasksHandler.GetTasks)
		r.Post("/api/tasks", tasksHandler.CreateTask)
		r.Patch("/api/tasks/{id}", tasksHandler.UpdateTask)
		r.Delete("/api/tasks/{id}", tasksHandler.DeleteTask)
		r.Put("/api/tasks/reorder", tasksHandler.ReorderTasks)

		// Labels
		r.Get("/api/labels", labelsHandler.GetLabels)
		r.Post("/api/labels", labelsHandler.CreateLabel)
		r.Delete("/api/labels/{id}", labelsHandler.DeleteLabel)

		// Task-label assignments
		r.Post("/api/task-labels", labelsHandler.AssignLabel)
		r.Delete("/api/task-labels/{taskId}/{labelId}", labelsHandler.RemoveLabel)
		
		// Team members
		r.Get("/api/team", teamHandler.GetMembers)
		r.Post("/api/team", teamHandler.CreateMember)
		r.Delete("/api/team/{id}", teamHandler.DeleteMember)
		
		// Task-member assignments
		r.Post("/api/task-assignees", teamHandler.AssignMember)
		r.Delete("/api/task-assignees/{taskId}/{memberId}", teamHandler.RemoveMember)
		
		// Comments
		r.Get("/api/tasks/{taskId}/comments", commentsHandler.GetComments)
		r.Post("/api/tasks/{taskId}/comments", commentsHandler.CreateComment)
		r.Delete("/api/comments/{id}", commentsHandler.DeleteComment)
		
		// Activity log
		r.Get("/api/tasks/{taskId}/activity", activityHandler.GetActivity)
	})

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server starting on %s", addr)
	log.Fatal(http.ListenAndServe(addr, r))
}