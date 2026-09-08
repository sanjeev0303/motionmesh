package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/motionmesh/server/shared/models"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

const watermarkColumns = "id, account_id, asset_object_key, position, opacity, is_active, created_at"

func scanWatermark(row pgx.Row) (*models.WatermarkMetadata, error) {
	var wm models.WatermarkMetadata
	err := row.Scan(&wm.ID, &wm.AccountID, &wm.AssetObjectKey, &wm.Position, &wm.Opacity, &wm.IsActive, &wm.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &wm, nil
}

func (r *Repository) GetActive(ctx context.Context, accountID string) (*models.WatermarkMetadata, error) {
	query := `SELECT ` + watermarkColumns + `
		FROM watermark_metadata
		WHERE account_id = $1 AND is_active = true
		ORDER BY created_at DESC
		LIMIT 1`
	return scanWatermark(r.db.QueryRow(ctx, query, accountID))
}

func (r *Repository) SetActive(ctx context.Context, wm *models.WatermarkMetadata) (*models.WatermarkMetadata, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `UPDATE watermark_metadata SET is_active = false WHERE account_id = $1 AND is_active = true`, wm.AccountID); err != nil {
		return nil, err
	}

	query := `INSERT INTO watermark_metadata (account_id, asset_object_key, position, opacity, is_active)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING ` + watermarkColumns
	created, err := scanWatermark(tx.QueryRow(ctx, query, wm.AccountID, wm.AssetObjectKey, wm.Position, wm.Opacity, wm.IsActive))
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return created, nil
}

func (r *Repository) UpdateSettings(ctx context.Context, accountID, position string, opacity float32, isActive bool) (*models.WatermarkMetadata, error) {
	query := `UPDATE watermark_metadata
		SET position = $1, opacity = $2, is_active = $3
		WHERE account_id = $4 AND is_active = true
		RETURNING ` + watermarkColumns
	return scanWatermark(r.db.QueryRow(ctx, query, position, opacity, isActive, accountID))
}

func (r *Repository) Deactivate(ctx context.Context, accountID string) error {
	_, err := r.db.Exec(ctx, `UPDATE watermark_metadata SET is_active = false WHERE account_id = $1 AND is_active = true`, accountID)
	return err
}