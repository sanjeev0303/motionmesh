package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	dbURL := "postgresql://postgres:motionmesh_123d@motionmesh-db.cluster-cbgioucsyxsn.ap-south-1.rds.amazonaws.com:5432/motionmesh_admin?sslmode=require"
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer db.Close()

	videoID := "226f5464-07a9-4b4b-8a21-4ca4515a5949"

	res, err := db.Exec(`
		UPDATE videos
		SET status = 'ready',
			captions_status = 'ready',
			updated_at = NOW()
		WHERE id = $1
	`, videoID)

	if err != nil {
		log.Fatalf("Failed to update: %v", err)
	}

	rows, _ := res.RowsAffected()
	fmt.Printf("Updated %d rows successfully. Set status to 'ready' and captions_status to 'ready'.\n", rows)
}
