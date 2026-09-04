//go:build ignore

package main

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
)

const dbURL = "postgresql://postgres:motionmesh_123d@motionmesh-db.cluster-cbgioucsyxsn.ap-south-1.rds.amazonaws.com:5432/motionmesh_admin?sslmode=require"

var stuckVideoIDs = []string{
	"226f5464-07a9-4b4b-8a21-4ca4515a5949",
}

func main() {
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dbURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "DB connect failed: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close(ctx)

	// 1. Fix ALL videos where transcode_bucket_id is null → use their bucket_id
	tag, err := conn.Exec(ctx, "UPDATE videos SET transcode_bucket_id = bucket_id WHERE transcode_bucket_id IS NULL")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Fix transcode_bucket_id failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("[DB] Fixed transcode_bucket_id for %d video(s)\n", tag.RowsAffected())

	for _, vid := range stuckVideoIDs {
		_, err = conn.Exec(ctx,
			`UPDATE videos SET status = 'ready', captions_status = 'ready', updated_at = now() WHERE id = $1`, vid)
		if err != nil {
			fmt.Fprintf(os.Stderr, "[DB] Reset video %s failed: %v\n", vid, err)
			continue
		}
		fmt.Printf("[DB] Reset status=ready, captions_status=ready for video %s\n", vid)

		tag, err = conn.Exec(ctx, `DELETE FROM transcode_jobs WHERE video_id = $1`, vid)
		if err != nil {
			fmt.Fprintf(os.Stderr, "[DB] Delete transcode_job %s failed: %v\n", vid, err)
		} else {
			fmt.Printf("[DB] Deleted %d transcode_job(s) for video %s\n", tag.RowsAffected(), vid)
		}

		// Verify the result
		var objectKey, transcodeBucket string
		err = conn.QueryRow(ctx,
			`SELECT object_key, COALESCE(transcode_bucket_id, bucket_id)::text FROM videos WHERE id = $1`, vid).
			Scan(&objectKey, &transcodeBucket)
		if err != nil {
			fmt.Fprintf(os.Stderr, "[DB] Fetch video %s failed: %v\n", vid, err)
		} else {
			fmt.Printf("[DB] Video %s → transcode_bucket_id=%q object_key=%q\n", vid, transcodeBucket, objectKey)
		}
	}

	fmt.Println("[DB] Done. Now run the NATS re-trigger via SSM.")
}
