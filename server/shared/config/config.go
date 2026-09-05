package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	// Core infrastructure
	DatabaseURL string
	RedisURL    string
	QueueURL    string

	// Object storage — AWS S3 bucket (IAM role used in production)
	StorageBucket          string
	StorageTranscodeBucket string // separate bucket for HLS/captions output; falls back to StorageBucket
	StorageRegion          string

	// Auth
	ClerkSecretKey string
	ClerkJWKSURL   string
	JWTSecret      string

	// Billing
	StripeSecretKey     string
	StripeWebhookSecret string
	ProPriceID          string // Stripe Price ID for the Pro plan ($29/mo)

	// Worker / Sidecar
	CaptionsSidecarURL string
	HuggingfaceAPIKey  string

	// CORS (comma-separated list of allowed origins)
	CorsAllowedOrigins string
}

func Load() *Config {
	// Load base .env (does not overwrite shell exports)
	for _, f := range []string{".env", "../.env"} {
		if _, err := os.Stat(f); err == nil {
			_ = godotenv.Load(f)
			break
		}
	}
	// Load .env.local overrides (overrides .env AND shell exports)
	// Create server/.env.local to point services at SSM-tunneled localhost ports.
	localLoaded := false
	for _, f := range []string{".env.local", "../.env.local"} {
		if _, err := os.Stat(f); err == nil {
			_ = godotenv.Overload(f)
			localLoaded = true
			break
		}
	}
	if !localLoaded {
		// Warn so developers know why they're hitting cloud endpoints
		_, _ = os.Stderr.WriteString("WARN: no .env.local found — using cloud endpoints from .env\n")
	}

	return &Config{
		DatabaseURL: getEnv("DATABASE_URL", ""),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379/0"),
		QueueURL:    getEnv("QUEUE_URL", "nats://localhost:4222"),

		StorageBucket:          getEnv("STORAGE_BUCKET", "motionmesh-dev"),
		StorageTranscodeBucket: getEnv("STORAGE_TRANSCODE_BUCKET", ""),
		StorageRegion:          getEnv("STORAGE_REGION", "ap-south-1"),

		ClerkSecretKey: getEnv("CLERK_SECRET_KEY", ""),
		ClerkJWKSURL:   getEnv("CLERK_JWKS_URL", ""),
		JWTSecret:      getEnv("JWT_SECRET", ""),

		StripeSecretKey:     getEnv("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret: getEnv("STRIPE_WEBHOOK_SECRET", ""),
		ProPriceID:          getEnv("STRIPE_PRO_PRICE_ID", ""),

		CaptionsSidecarURL: getEnv("CAPTIONS_SIDECAR_URL", "http://localhost:8000"),
		HuggingfaceAPIKey:  getEnv("HUGGINGFACE_API_KEY", ""),

		CorsAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", ""),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
