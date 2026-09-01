package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/motionmesh/server/api/internal/auth"
	authpostgres "github.com/motionmesh/server/api/internal/auth/postgres"
)

func main() {
    ctx := context.Background()
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}
    db, err := pgxpool.New(ctx, dsn)
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    repo := authpostgres.NewRepository(db)
    svc := auth.NewService(repo, nil, "", "")

    acc, err := repo.UpsertByClerkUserID(ctx, "test_user_123", "")
    if err != nil {
        log.Fatal("upsert:", err)
    }

    rawKey, _, err := svc.GenerateAPIKey(ctx, acc.ID, "Test Key")
    if err != nil {
        log.Fatal("generate:", err)
    }

    fmt.Printf("API_KEY=%s\n", rawKey)
    fmt.Printf("ACCOUNT_ID=%s\n", acc.ID)
}
