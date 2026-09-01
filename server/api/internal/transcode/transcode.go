package transcode

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/motionmesh/server/shared/models"
	"github.com/nats-io/nats.go"
)

type Service struct {
	db *pgxpool.Pool
	nc *nats.Conn
}

func NewService(db *pgxpool.Pool, nc *nats.Conn) *Service {
	return &Service{db: db, nc: nc}
}

type TranscodeJobMessage struct {
	VideoID           string  `json:"video_id"`
	SourceObjectKey   string  `json:"source_object_key"`
	TranscodeBucketID *string `json:"transcode_bucket_id,omitempty"`
}

// TriggerJob creates a job in the database and publishes a message to NATS.
func (s *Service) TriggerJob(ctx context.Context, video *models.Video) error {
	// 1. Create job in postgres idempotently
	var jobID string
	err := s.db.QueryRow(ctx,
		`INSERT INTO transcode_jobs (id, video_id, status, progress_percent)
		 SELECT gen_random_uuid(), $1, $2, 0
		 WHERE NOT EXISTS (SELECT 1 FROM transcode_jobs WHERE video_id = $1)
		 RETURNING id`,
		video.ID, models.JobStatusQueued,
	).Scan(&jobID)

	if errors.Is(err, pgx.ErrNoRows) {
		// Job already exists — let's check if we can re-trigger it.
		// We only re-trigger if it's failed or completed (not queued or processing).
		tag, updateErr := s.db.Exec(ctx,
			`UPDATE transcode_jobs 
			 SET status = $2, progress_percent = 0, error_msg = NULL, updated_at = now() 
			 WHERE video_id = $1 AND status NOT IN ('queued', 'processing')`,
			video.ID, models.JobStatusQueued)
		if updateErr != nil {
			return fmt.Errorf("failed to update transcode job: %w", updateErr)
		}
		if tag.RowsAffected() == 0 {
			// Job is currently queued or processing, or doesn't exist (which contradicts the branch, but just in case).
			// Do not re-publish.
			return nil
		}
	} else if err != nil {
		return fmt.Errorf("failed to create transcode job: %w", err)
	}

	// 2. Publish to NATS JetStream
	msg := TranscodeJobMessage{
		VideoID:           video.ID,
		SourceObjectKey:   video.ObjectKey,
		TranscodeBucketID: video.TranscodeBucketID,
	}
	payload, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal transcode job msg: %w", err)
	}

	js, err := s.nc.JetStream()
	if err != nil {
		return fmt.Errorf("failed to get jetstream context: %w", err)
	}

	// The worker listens on "transcode.jobs"
	_, err = js.Publish("transcode.jobs", payload)
	if err != nil {
		return fmt.Errorf("failed to publish to NATS: %w", err)
	}

	return nil
}

// ListJobs returns the N most recent transcode jobs for the account's videos.
func (s *Service) ListJobs(ctx context.Context, accountID string, limit int) ([]*models.Job, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	rows, err := s.db.Query(ctx, `
		SELECT tj.id, tj.video_id, tj.status, tj.progress_percent, tj.error_msg, tj.created_at, tj.updated_at
		FROM transcode_jobs tj
		JOIN videos v ON v.id = tj.video_id
		WHERE v.account_id = $1
		ORDER BY tj.created_at DESC
		LIMIT $2`, accountID, limit)
	if err != nil {
		return nil, fmt.Errorf("list jobs: %w", err)
	}
	defer rows.Close()

	var jobs []*models.Job
	for rows.Next() {
		j := &models.Job{}
		if err := rows.Scan(&j.ID, &j.VideoID, &j.Status, &j.ProgressPercent, &j.ErrorMsg, &j.CreatedAt, &j.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan job: %w", err)
		}
		jobs = append(jobs, j)
	}
	return jobs, rows.Err()
}
