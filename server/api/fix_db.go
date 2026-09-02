package main

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
)

func main() {
	dbURL := "postgresql://postgres:motionmesh_123d@motionmesh-db.cluster-cbgioucsyxsn.ap-south-1.rds.amazonaws.com:5432/motionmesh_admin?sslmode=require"
	
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dbURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close(ctx)

	// Fix transcode_bucket_id for all videos
	tag, err := conn.Exec(ctx, "UPDATE videos SET transcode_bucket_id = $1 WHERE transcode_bucket_id IS NULL", "f331b900-5ea4-43f1-9a76-f54428c33878")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Update transcode_bucket_id failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Updated %d videos with transcode_bucket_id\n", tag.RowsAffected())

	// Set the failed video to queued
	tag, err = conn.Exec(ctx, "UPDATE videos SET status = 'queued' WHERE id = '195959c6-7a40-43d2-b413-3a8618de9748'")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Update failed video failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Re-queued failed video. Rows affected: %d\n", tag.RowsAffected())
}
