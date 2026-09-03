package videos

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/motionmesh/server/api/internal/auth"
	"github.com/motionmesh/server/api/internal/buckets"
	"github.com/motionmesh/server/api/internal/transcode"
	"github.com/motionmesh/server/shared/logger"
	"github.com/motionmesh/server/shared/models"
	"github.com/motionmesh/server/shared/storage"
)

type Handler struct {
	svc          *Service
	storage      storage.ObjectStorage
	transcodeSvc *transcode.Service
	bucketSvc    *buckets.Service
	bucketID     string
}

func NewHandler(svc *Service, storage storage.ObjectStorage, transcodeSvc *transcode.Service, bucketSvc *buckets.Service, bucketID string) *Handler {
	return &Handler{svc: svc, storage: storage, transcodeSvc: transcodeSvc, bucketSvc: bucketSvc, bucketID: bucketID}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.HandleListVideos)
	r.Post("/", h.HandleUploadInitiation)
	r.Get("/{id}", h.HandleGetVideo)
	r.Delete("/{id}", h.HandleDeleteVideo)
	r.Post("/{id}/upload", h.HandleProxyUpload)
	r.Post("/{id}/finalize-upload", h.HandleFinalizeUpload)
	r.Get("/{id}/thumbnail", h.HandleGetThumbnail)
	r.Get("/{id}/playback", h.HandleGetPlaybackInfo)
	r.Post("/{id}/transcode", h.HandleCreateTranscodeJob)
	// HLS proxy: serves .m3u8 playlists and .ts segments from S3, solving CORS/auth
	r.Get("/{id}/hls/*", h.HandleHLSProxy)
	// Multipart upload — client uses these for parallel chunked S3 PUT
	r.Post("/{id}/multipart-create", h.HandleMultipartCreate)
	r.Post("/{id}/multipart-parts", h.HandleMultipartPresignParts)
	r.Post("/{id}/multipart-complete", h.HandleMultipartComplete)
	r.Post("/{id}/multipart-abort", h.HandleMultipartAbort)
}

func (h *Handler) HandleListVideos(w http.ResponseWriter, r *http.Request) {
	acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || acc == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	externalUserID := r.URL.Query().Get("external_user_id")
	var extUserID *string
	if externalUserID != "" {
		extUserID = &externalUserID
	}

	limitStr := r.URL.Query().Get("limit")
	limit, _ := strconv.Atoi(limitStr)
	cursor := r.URL.Query().Get("cursor")

	videos, err := h.svc.ListVideos(r.Context(), acc.ID, extUserID, limit, cursor)
	if err != nil {
		logger.New().Error("list videos: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(videos)
}

func (h *Handler) HandleGetVideo(w http.ResponseWriter, r *http.Request) {
	acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || acc == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	video, err := h.svc.GetVideo(r.Context(), id, acc.ID)
	if err != nil {
		logger.New().Error("get video: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if video == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(video)
}

func (h *Handler) HandleDeleteVideo(w http.ResponseWriter, r *http.Request) {
	acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || acc == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	
	video, err := h.svc.GetVideo(r.Context(), id, acc.ID)
	if err != nil {
		logger.New().Error("get video to delete: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if video == nil {
		logger.New().Info("video not found or already deleted: %s", id)
		http.Error(w, "video not found", http.StatusNotFound)
		return
	}

	err = h.svc.DeleteVideo(r.Context(), id, acc.ID)
	if err != nil {
		logger.New().Error("delete video: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Clean up storage bucket files
	keysToDelete := []string{
		video.ObjectKey,
	}
	if video.ThumbnailKey != nil {
		keysToDelete = append(keysToDelete, *video.ThumbnailKey)
	}
	if video.PreviewKey != nil {
		keysToDelete = append(keysToDelete, *video.PreviewKey)
	}
	if video.SpriteKey != nil {
		keysToDelete = append(keysToDelete, *video.SpriteKey)
	}

	for _, key := range keysToDelete {
		if key != "" {
			// Wait, the renditions/thumbnails are in transcodeBucketID if it exists, otherwise BucketID!
			bucket := video.BucketID
			if video.TranscodeBucketID != nil {
				bucket = *video.TranscodeBucketID
			}
			bucketName := h.getPhysicalBucketName(r.Context(), acc.ID, bucket)
			err := h.storage.DeleteObject(r.Context(), bucketName, key)
			if err != nil {
				logger.New().Error("failed to delete storage key %s for video %s: %v", key, id, err)
			}
		}
	}

	logger.New().Info("successfully deleted video id: %s", id)

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) HandleUploadInitiation(w http.ResponseWriter, r *http.Request) {
	acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || acc == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Filename          string  `json:"filename"`
		SizeBytes         float64 `json:"size_bytes"`
		BucketID          *string `json:"bucket_id,omitempty"`
		ExternalUserID    *string `json:"external_user_id,omitempty"`
		TranscodeBucketID *string `json:"transcode_bucket_id,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	bucketIDVal := ""
	transcodeBucketIDVal := ""
	if req.BucketID != nil { bucketIDVal = *req.BucketID }
	if req.TranscodeBucketID != nil { transcodeBucketIDVal = *req.TranscodeBucketID }
	logger.New().Info("Upload initiation req: filename=%s bucket_id=%q transcode_bucket_id=%q", req.Filename, bucketIDVal, transcodeBucketIDVal)

	objectKey := acc.ID + "/videos/" + req.Filename

	var bucketID string
	var transcodeBucketID *string

	buckets, err := h.bucketSvc.ListBuckets(r.Context(), acc.ID)
	var availableBuckets []*models.Bucket
	if err == nil {
		availableBuckets = buckets
	}

	if req.BucketID != nil && *req.BucketID != "" {
		if _, err := uuid.Parse(*req.BucketID); err == nil {
			bucketID = *req.BucketID
		} else {
			// Fallback: search by bucket name
			for _, b := range availableBuckets {
				if b.Name == *req.BucketID {
					bucketID = b.ID
					break
				}
			}
		}
	}
	
	if bucketID == "" && len(availableBuckets) > 0 {
		bucketID = availableBuckets[0].ID
	}
	
	if bucketID == "" {
		logger.New().Error("no buckets found for account %s", acc.ID)
		http.Error(w, "No storage bucket configured", http.StatusBadRequest)
		return
	}
	
	if req.TranscodeBucketID != nil && *req.TranscodeBucketID != "" {
		if _, err := uuid.Parse(*req.TranscodeBucketID); err == nil {
			transcodeBucketID = req.TranscodeBucketID
		} else {
			// Fallback: search by bucket name
			for _, b := range availableBuckets {
				if b.Name == *req.TranscodeBucketID {
					tid := b.ID
					transcodeBucketID = &tid
					break
				}
			}
		}
	}
	
	if transcodeBucketID == nil && bucketID != "" {
		tid := bucketID
		transcodeBucketID = &tid
	}

	var resolvedTranscodeBucket string
	if transcodeBucketID != nil { resolvedTranscodeBucket = *transcodeBucketID }
	logger.New().Info("Resolved bucket_id=%q transcode_bucket_id=%q", bucketID, resolvedTranscodeBucket)

	video := &models.Video{
		AccountID:         acc.ID,
		BucketID:          bucketID,
		TranscodeBucketID: transcodeBucketID,
		ObjectKey:         objectKey,
		Title:             filepath.Base(req.Filename),
		SizeBytes:         req.SizeBytes,
		ExternalUserID:    req.ExternalUserID,
	}

	createdVideo, err := h.svc.InitiateUpload(r.Context(), video)
	if err != nil {
		logger.New().Error("create video record: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	bucketName := h.getPhysicalBucketName(r.Context(), acc.ID, bucketID)
	uploadURL, err := h.storage.GetPresignedUploadURL(r.Context(), bucketName, objectKey, "video/mp4")
	if err != nil {
		logger.New().Error("generate upload url: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"video":      createdVideo,
		"upload_url": uploadURL,
		"object_key": objectKey,
	})
}

func (h *Handler) HandleProxyUpload(w http.ResponseWriter, r *http.Request) {
	acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || acc == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	video, err := h.svc.GetVideo(r.Context(), id, acc.ID)
	if err != nil || video == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	contentType := r.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "video/mp4"
	}

	// Use Content-Length from the request header to stream without buffering.
	// Limit the stream to 5 GiB as a safeguard.
	const maxSize = 5 << 30
	size := r.ContentLength
	if size <= 0 || size > maxSize {
		size = maxSize
	}

	body := http.MaxBytesReader(w, r.Body, maxSize)

	bucketName := h.getPhysicalBucketName(r.Context(), acc.ID, video.BucketID)
	if err := h.storage.PutObjectStream(r.Context(), bucketName, video.ObjectKey, body, size, contentType); err != nil {
		logger.New().Error("proxy upload stream: %v", err)
		http.Error(w, "storage upload failed", http.StatusInternalServerError)
		return
	}

	// Record the uploaded source file in the bucket tracking table
	objRec := []models.BucketObject{
		{
			BucketID:    video.BucketID,
			Key:         video.ObjectKey,
			SizeBytes:   size,
			ContentType: contentType,
		},
	}
	if err := h.bucketSvc.UpsertObjects(r.Context(), objRec); err != nil {
		logger.New().Error("upsert source object to bucket tracker: %v", err)
	}

	// Trigger transcode now that the file is in storage
	if err := h.transcodeSvc.TriggerJob(r.Context(), video); err != nil {
		logger.New().Error("trigger transcode job: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "uploaded"})
}

func (h *Handler) HandleFinalizeUpload(w http.ResponseWriter, r *http.Request) {
	acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || acc == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	video, err := h.svc.GetVideo(r.Context(), id, acc.ID)
	if err != nil || video == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	// Record the uploaded source file in the bucket tracking table
	objRec := []models.BucketObject{
		{
			BucketID:    video.BucketID,
			Key:         video.ObjectKey,
			SizeBytes:   int64(video.SizeBytes),
			ContentType: "video/mp4", // Or passed in via request, defaulting to mp4
		},
	}
	if err := h.bucketSvc.UpsertObjects(r.Context(), objRec); err != nil {
		logger.New().Error("upsert source object to bucket tracker: %v", err)
	}

	// Trigger transcode now that the file is in storage
	if err := h.transcodeSvc.TriggerJob(r.Context(), video); err != nil {
		logger.New().Error("trigger transcode job: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "finalized"})
}

func (h *Handler) HandleGetThumbnail(w http.ResponseWriter, r *http.Request) {
	acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || acc == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	video, err := h.svc.GetVideo(r.Context(), id, acc.ID)
	if err != nil || video == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if video.ThumbnailKey == nil {
		http.Error(w, "thumbnail not ready", http.StatusNotFound)
		return
	}

	bucket := video.BucketID
	if video.TranscodeBucketID != nil {
		bucket = *video.TranscodeBucketID
	}
	bucketName := h.getPhysicalBucketName(r.Context(), acc.ID, bucket)
	url, err := h.storage.GetPresignedURL(r.Context(), bucketName, *video.ThumbnailKey)
	if err != nil {
		logger.New().Error("presign thumbnail: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, url, http.StatusFound)
}

func (h *Handler) HandleCreateTranscodeJob(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	acc, ok := ctx.Value(auth.AccountContextKey).(*models.Account)
	if !ok || acc == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	videoID := chi.URLParam(r, "id")
	video, err := h.svc.GetVideo(ctx, videoID, acc.ID)
	if err != nil {
		logger.New().Error("get video: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if video == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	if err := h.transcodeSvc.TriggerJob(ctx, video); err != nil {
		logger.New().Error("trigger transcode job: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "queued"})
}

func (h *Handler) HandleGetPlaybackInfo(w http.ResponseWriter, r *http.Request) {
	acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || acc == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	video, err := h.svc.GetVideo(r.Context(), id, acc.ID)
	if err != nil {
		logger.New().Error("get video playback info: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if video == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	if video.Status != models.VideoStatusReady {
		http.Error(w, "video not ready", http.StatusBadRequest)
		return
	}

	// Use the HLS proxy URL instead of a presigned S3 URL.
	// This avoids CORS/401 issues: the browser fetches via our API which signs S3 requests.
	baseProxyURL := fmt.Sprintf("%s/v1/videos/%s/hls", getProxyBaseURL(r), video.ID)
	playlistUrl := fmt.Sprintf("%s/master.m3u8", baseProxyURL)

	var subtitleUrl string
	if video.CaptionsStatus == "ready" {
		capKey := fmt.Sprintf("videos/%s/captions/en.vtt", video.ID)
		bucket := video.BucketID
		if video.TranscodeBucketID != nil {
			bucket = *video.TranscodeBucketID
		}
		bucketName := h.getPhysicalBucketName(r.Context(), acc.ID, bucket)
		url, _ := h.storage.GetPresignedURL(r.Context(), bucketName, capKey)
		subtitleUrl = url
	}

	var timelineSpritesUrl string
	if video.SpriteKey != nil {
		bucket := video.BucketID
		if video.TranscodeBucketID != nil {
			bucket = *video.TranscodeBucketID
		}
		bucketName := h.getPhysicalBucketName(r.Context(), acc.ID, bucket)
		url, _ := h.storage.GetPresignedURL(r.Context(), bucketName, *video.SpriteKey)
		timelineSpritesUrl = url
	}

	response := map[string]interface{}{
		"playlistUrl":        playlistUrl,
		"subtitleUrl":        subtitleUrl,
		"timelineSpritesUrl": timelineSpritesUrl,
		"playerSettings": map[string]interface{}{
			"primaryColor": "#06b6d4",
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleHLSProxy fetches HLS playlist and segment files from S3 and serves them
// to the browser. For .m3u8 playlists it rewrites relative URIs to go through
// this same proxy, so HLS.js never talks to S3 directly (no CORS/auth issues).
func (h *Handler) HandleHLSProxy(w http.ResponseWriter, r *http.Request) {
	videoID := chi.URLParam(r, "id")
	
	// Fetch the video without requiring an account context since HLS is public streaming
	video, err := h.svc.GetPublicVideo(r.Context(), videoID)
	if err != nil || video == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	// The wildcard segment after /hls/ (e.g. "master.m3u8", "720p/stream.m3u8", "720p/seg001.ts")
	segPath := chi.URLParam(r, "*")

	// ── VTT caption files ────────────────────────────────────────────────────
	// Caption VTTs are stored under videos/{id}/captions/ by the worker, NOT
	// under hls/. Intercept *.vtt requests and proxy from the captions prefix.
	if strings.HasSuffix(segPath, ".vtt") {
		lang := strings.TrimSuffix(filepath.Base(segPath), ".vtt")
		vttKey := fmt.Sprintf("videos/%s/captions/%s.vtt", videoID, lang)
		bucket := video.BucketID
		if video.TranscodeBucketID != nil {
			bucket = *video.TranscodeBucketID
		}
		bucketName := h.getPhysicalBucketName(r.Context(), video.AccountID, bucket)
		body, err := h.storage.GetObjectStream(r.Context(), bucketName, vttKey)
		if err != nil {
			logger.New().Error("hls proxy: vtt %s: %v", vttKey, err)
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		defer body.Close()
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "text/vtt; charset=utf-8")
		w.Header().Set("Cache-Control", "public, max-age=3600")
		buf := make([]byte, 32*1024)
		for {
			n, err := body.Read(buf)
			if n > 0 {
				_, _ = w.Write(buf[:n])
			}
			if err != nil {
				break
			}
		}
		return
	}

	s3Key := fmt.Sprintf("videos/%s/hls/%s", videoID, segPath)

	bucket := video.BucketID
	if video.TranscodeBucketID != nil {
		bucket = *video.TranscodeBucketID
	}
	bucketName := h.getPhysicalBucketName(r.Context(), video.AccountID, bucket)
	body, err := h.storage.GetObjectStream(r.Context(), bucketName, s3Key)
	if err != nil {
		logger.New().Error("hls proxy: get object %s: %v", s3Key, err)
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	defer body.Close()

	// Set CORS headers so the browser (or HLS.js) can load across origins
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")

	if strings.HasSuffix(segPath, ".m3u8") {
		w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
		w.Header().Set("Cache-Control", "no-cache")

		// Build the proxy base so relative URIs in the playlist are rewritten.
		// proxyDir is the directory of the current playlist file via the proxy.
		// e.g. for master.m3u8 → /v1/videos/{id}/hls
		//      for 720p/stream.m3u8 → /v1/videos/{id}/hls/720p
		proxyBase := fmt.Sprintf("%s/v1/videos/%s/hls", getProxyBaseURL(r), videoID)
		// directory relative to the playlist's own location
		slashIdx := strings.LastIndex(segPath, "/")
		if slashIdx >= 0 {
			proxyBase += "/" + segPath[:slashIdx]
		}

		isMaster := segPath == "master.m3u8"

		scanner := bufio.NewScanner(body)
		for scanner.Scan() {
			line := scanner.Text()

			// Strip subtitle EXT-X-MEDIA tags from master.m3u8 completely.
			// Vidstack handles captions via its own <Track> element (subtitleUrl
			// from the playback API), so letting HLS.js also load them causes
			// double-fetch and the broken hls/en.m3u8 → hls/en.vtt path error.
			if isMaster && strings.HasPrefix(line, "#EXT-X-MEDIA:TYPE=SUBTITLES") {
				continue
			}
			// Also strip the SUBTITLES= attribute from EXT-X-STREAM-INF lines
			// so HLS.js doesn't reference a now-absent subtitle group.
			if isMaster && strings.HasPrefix(line, "#EXT-X-STREAM-INF:") {
				line = strings.ReplaceAll(line, ",SUBTITLES=\"subs\"", "")
			}

			// Rewrite URI lines (non-comment, non-empty) to go through our proxy.
			// Leave absolute https:// lines untouched.
			if line != "" && !strings.HasPrefix(line, "#") && !strings.HasPrefix(line, "http") {
				line = proxyBase + "/" + line
			}
			fmt.Fprintln(w, line)
		}
		
		if err := scanner.Err(); err != nil {
			logger.New().Error("error scanning playlist: %v", err)
		}
		return
	}

	if strings.HasSuffix(segPath, ".ts") {
		w.Header().Set("Content-Type", "video/mp2t")
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		w.Header().Set("Content-Type", "application/octet-stream")
	}

	buf := make([]byte, 32*1024)
	for {
		n, err := body.Read(buf)
		if n > 0 {
			_, _ = w.Write(buf[:n])
		}
		if err != nil {
			break
		}
	}
}


func getProxyBaseURL(r *http.Request) string {
	if pub := os.Getenv("PUBLIC_API_URL"); pub != "" {
		return pub
	}

	scheme := "https"
	if r.TLS == nil {
		scheme = "http"
	}
	if fwdProto := r.Header.Get("X-Forwarded-Proto"); fwdProto != "" {
		scheme = fwdProto
	}

	host := r.Host
	if fwdHost := r.Header.Get("X-Forwarded-Host"); fwdHost != "" {
		host = fwdHost
	}

	return fmt.Sprintf("%s://%s", scheme, host)
}

func (h *Handler) getPhysicalBucketName(ctx context.Context, accountID string, bucketID string) string {
	buckets, err := h.bucketSvc.ListBuckets(ctx, accountID)
	if err == nil {
		for _, b := range buckets {
			if b.ID == bucketID {
				return b.Name
			}
		}
	}
	return h.bucketID
}

// ─── Multipart upload handlers ────────────────────────────────────────────────
// These four endpoints let the browser upload large files directly to S3 in
// parallel parts (5 MiB each) without routing any payload bytes through the API.

// HandleMultipartCreate asks S3 to start a multipart upload and returns the
// upload_id the client must pass to every subsequent part request.
func (h *Handler) HandleMultipartCreate(w http.ResponseWriter, r *http.Request) {
	acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || acc == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id := chi.URLParam(r, "id")
	video, err := h.svc.GetVideo(r.Context(), id, acc.ID)
	if err != nil || video == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	bucketName := h.getPhysicalBucketName(r.Context(), acc.ID, video.BucketID)
	contentType := r.URL.Query().Get("content_type")
	if contentType == "" {
		contentType = "video/mp4"
	}
	uploadID, err := h.storage.CreateMultipartUpload(r.Context(), bucketName, video.ObjectKey, contentType)
	if err != nil {
		logger.New().Error("create multipart: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"upload_id": uploadID})
}

// HandleMultipartPresignParts returns presigned PUT URLs for a list of part numbers.
// Body: {"upload_id":"...","part_numbers":[1,2,3,...]}
func (h *Handler) HandleMultipartPresignParts(w http.ResponseWriter, r *http.Request) {
	acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || acc == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id := chi.URLParam(r, "id")
	video, err := h.svc.GetVideo(r.Context(), id, acc.ID)
	if err != nil || video == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	var req struct {
		UploadID    string  `json:"upload_id"`
		PartNumbers []int32 `json:"part_numbers"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UploadID == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	bucketName := h.getPhysicalBucketName(r.Context(), acc.ID, video.BucketID)
	urls := make(map[string]string, len(req.PartNumbers))
	for _, pn := range req.PartNumbers {
		url, err := h.storage.PresignUploadPart(r.Context(), bucketName, video.ObjectKey, req.UploadID, pn)
		if err != nil {
			logger.New().Error("presign part %d: %v", pn, err)
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
		urls[strconv.Itoa(int(pn))] = url
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"urls": urls})
}

// HandleMultipartComplete calls S3 CompleteMultipartUpload, triggers transcode.
// Body: {"upload_id":"...","parts":[{"part_number":1,"etag":"\"abc\""},...] }
func (h *Handler) HandleMultipartComplete(w http.ResponseWriter, r *http.Request) {
	acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || acc == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id := chi.URLParam(r, "id")
	video, err := h.svc.GetVideo(r.Context(), id, acc.ID)
	if err != nil || video == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	var req struct {
		UploadID string `json:"upload_id"`
		Parts    []struct {
			PartNumber int32  `json:"part_number"`
			ETag       string `json:"etag"`
		} `json:"parts"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UploadID == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	bucketName := h.getPhysicalBucketName(r.Context(), acc.ID, video.BucketID)
	parts := make([]storage.CompletedPart, len(req.Parts))
	for i, p := range req.Parts {
		parts[i] = storage.CompletedPart{PartNumber: p.PartNumber, ETag: p.ETag}
	}
	if err := h.storage.CompleteMultipartUpload(r.Context(), bucketName, video.ObjectKey, req.UploadID, parts); err != nil {
		logger.New().Error("complete multipart: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	// Record object + trigger transcode
	_ = h.bucketSvc.UpsertObjects(r.Context(), []models.BucketObject{{
		BucketID:    video.BucketID,
		Key:         video.ObjectKey,
		SizeBytes:   int64(video.SizeBytes),
		ContentType: "video/mp4",
	}})
	if err := h.transcodeSvc.TriggerJob(r.Context(), video); err != nil {
		logger.New().Error("trigger transcode after multipart: %v", err)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "complete"})
}

// HandleMultipartAbort cancels a stalled multipart upload.
// Body: {"upload_id":"..."}
func (h *Handler) HandleMultipartAbort(w http.ResponseWriter, r *http.Request) {
	acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || acc == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id := chi.URLParam(r, "id")
	video, err := h.svc.GetVideo(r.Context(), id, acc.ID)
	if err != nil || video == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	var req struct {
		UploadID string `json:"upload_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UploadID == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	bucketName := h.getPhysicalBucketName(r.Context(), acc.ID, video.BucketID)
	_ = h.storage.AbortMultipartUpload(r.Context(), bucketName, video.ObjectKey, req.UploadID)
	w.WriteHeader(http.StatusNoContent)
}
