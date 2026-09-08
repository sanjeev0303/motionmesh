package watermarks

import (
	"context"

	"github.com/motionmesh/server/shared/models"
)

type Service struct {
	repo WatermarkRepository
}

func NewService(repo WatermarkRepository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetActive(ctx context.Context, accountID string) (*models.WatermarkMetadata, error) {
	return s.repo.GetActive(ctx, accountID)
}

func (s *Service) SetActive(ctx context.Context, wm *models.WatermarkMetadata) (*models.WatermarkMetadata, error) {
	return s.repo.SetActive(ctx, wm)
}

func (s *Service) UpdateSettings(ctx context.Context, accountID, position string, opacity float32, isActive bool) (*models.WatermarkMetadata, error) {
	return s.repo.UpdateSettings(ctx, accountID, position, opacity, isActive)
}

func (s *Service) Deactivate(ctx context.Context, accountID string) error {
	return s.repo.Deactivate(ctx, accountID)
}