package watermarks

import (
	"context"

	"github.com/motionmesh/server/shared/models"
)

type WatermarkRepository interface {
	GetActive(ctx context.Context, accountID string) (*models.WatermarkMetadata, error)
	SetActive(ctx context.Context, wm *models.WatermarkMetadata) (*models.WatermarkMetadata, error)
	UpdateSettings(ctx context.Context, accountID, position string, opacity float32, isActive bool) (*models.WatermarkMetadata, error)
	Deactivate(ctx context.Context, accountID string) error
}