package watermarks

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/motionmesh/server/api/internal/auth"
	"github.com/motionmesh/server/api/internal/buckets"
	"github.com/motionmesh/server/shared/models"
	"github.com/motionmesh/server/shared/storage"
)

const maxWatermarkSize = 10 << 20

var watermarkContentTypes = map[string]string{
	"image/png":  ".png",
	"image/jpeg": ".jpg",
	"image/webp": ".webp",
}

func isValidWatermarkPosition(position string) bool {
	switch position {
	case "top-left", "top-right", "bottom-left", "bottom-right", "center":
		return true
	}
	return false
}

type Handler struct {
	svc       *Service
	storage   storage.ObjectStorage
	bucketSvc *buckets.Service
	bucketID  string
}

func NewHandler(svc *Service, storage storage.ObjectStorage, bucketSvc *buckets.Service, bucketID string) *Handler {
	return &Handler{svc: svc, storage: storage, bucketSvc: bucketSvc, bucketID: bucketID}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.HandleGet)
	r.Post("/", h.HandleSetWatermark)
	r.Delete("/", h.HandleDelete)
}

func (h *Handler) HandleGet(w http.ResponseWriter, r *http.Request) {
	acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || acc == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	wm, err := h.svc.GetActive(r.Context(), acc.ID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if wm == nil {
		http.Error(w, "no watermark configured", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(wm)
}

func (h *Handler) HandleSetWatermark(w http.ResponseWriter, r *http.Request) {
	acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || acc == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxWatermarkSize)
	if err := r.ParseMultipartForm(maxWatermarkSize); err != nil {
		http.Error(w, "watermark file too large or malformed multipart form", http.StatusBadRequest)
		return
	}
	defer r.MultipartForm.RemoveAll()

	position := r.FormValue("position")
	if position == "" {
		position = "bottom-right"
	}
	if !isValidWatermarkPosition(position) {
		http.Error(w, "invalid position", http.StatusBadRequest)
		return
	}

	opacity := float32(0.8)
	if v := r.FormValue("opacity"); v != "" {
		f, err := strconv.ParseFloat(v, 32)
		if err != nil || f < 0 || f > 1 {
			http.Error(w, "opacity must be a number between 0 and 1", http.StatusBadRequest)
			return
		}
		opacity = float32(f)
	}

	isActive := true
	if v := r.FormValue("is_active"); v != "" {
		b, err := strconv.ParseBool(v)
		if err != nil {
			http.Error(w, "is_active must be a boolean", http.StatusBadRequest)
			return
		}
		isActive = b
	}

	wm, err := h.upsertWatermark(w, r, acc, position, opacity)
	if err != nil {
		return
	}

	out := wm
	if !isActive {
		if err := h.svc.Deactivate(r.Context(), acc.ID); err != nil {
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
		out, _ = h.svc.GetActive(r.Context(), acc.ID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

func (h *Handler) upsertWatermark(w http.ResponseWriter, r *http.Request, acc *models.Account, position string, opacity float32) (*models.WatermarkMetadata, error) {
	file, header, err := r.FormFile("file")
	if err == http.ErrMissingFile {
		wm, err := h.svc.UpdateSettings(r.Context(), acc.ID, position, opacity, true)
		if err != nil {
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return nil, err
		}
		if wm == nil {
			http.Error(w, "no watermark configured", http.StatusNotFound)
			return nil, fmt.Errorf("no active watermark row to update")
		}
		return wm, nil
	}
	if err != nil {
		http.Error(w, "could not read upload", http.StatusBadRequest)
		return nil, err
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	ext, ok := watermarkContentTypes[contentType]
	if !ok {
		http.Error(w, "watermark must be a PNG, JPEG, or WebP image", http.StatusUnsupportedMediaType)
		return nil, fmt.Errorf("unsupported content type %q", contentType)
	}

	key := fmt.Sprintf("watermarks/%s/%s%s", acc.ID, uuid.NewString(), ext)
	bucketName := h.getPrimaryBucketName(r.Context(), acc.ID)

	if err := h.storage.PutObjectStream(r.Context(), bucketName, key, file, header.Size, contentType); err != nil {
		http.Error(w, "could not store watermark", http.StatusInternalServerError)
		return nil, err
	}

	wm, err := h.svc.SetActive(r.Context(), &models.WatermarkMetadata{
		AccountID:      acc.ID,
		AssetObjectKey: key,
		Position:       position,
		Opacity:        opacity,
		IsActive:       true,
	})
	if err != nil {
		_ = h.storage.DeleteObject(r.Context(), bucketName, key)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return nil, err
	}
	return wm, nil
}

func (h *Handler) getPrimaryBucketName(ctx context.Context, accountID string) string {
	buckets, err := h.bucketSvc.ListBuckets(ctx, accountID)
	if err == nil {
		for _, b := range buckets {
			if b.Name != "" {
				return b.Name
			}
		}
	}
	return h.bucketID
}

func (h *Handler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || acc == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.svc.Deactivate(r.Context(), acc.ID); err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}