package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all environment-driven configuration.
// Loaded once at startup and passed to handlers via dependency injection.
type Config struct {
	SupabaseURL     string
	SupabaseAnonKey string
	Port            string
}

// Load reads environment variables and returns a validated Config.
// Calls log.Fatal if required variables are missing - we want to fail fast at startup, not discover missing config mid-request.
func Load() *Config {
	// Load .env file if it exists (ignored in production where env vars are set by the hosting platform directly)
	_ = godotenv.Load()

	cfg := &Config{
		SupabaseURL:     getEnv("SUPABASE_URL", ""),
		SupabaseAnonKey: getEnv("SUPABASE_ANON_KEY", ""),
		Port:            getEnv("PORT", "8080"),
	}

	if cfg.SupabaseURL == "" || cfg.SupabaseAnonKey == "" {
		log.Fatal("FATAL: SUPABASE_URL and SUPABASE_ANON_KEY must be set")
	}

	return cfg
}

// getEnv reads an env var with a fallback default.
func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}