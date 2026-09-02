package uploader

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/motionmesh/server/shared/storage"
)

type UploadedFile struct {
	Key         string
	SizeBytes   int64
	ContentType string
}

type Uploader struct {
	store storage.ObjectStorage
}

func NewUploader(store storage.ObjectStorage) *Uploader {
	return &Uploader{store: store}
}

func (u *Uploader) uploadFile(ctx context.Context, filePath, objectKey, contentType, bucket string) (int64, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return 0, fmt.Errorf("failed to read file %s: %w", filePath, err)
	}
	if err := u.store.PutObject(ctx, bucket, objectKey, data, contentType); err != nil {
		return 0, fmt.Errorf("failed to upload %s: %w", objectKey, err)
	}
	return int64(len(data)), nil
}

// UploadHLS uploads the entire HLS output directory (all rendition subdirs + master playlist)
// to the given physical bucket using 16 concurrent workers.
func (u *Uploader) UploadHLS(ctx context.Context, videoID, dirPath, bucket string) ([]UploadedFile, error) {
	type task struct {
		filePath    string
		objectKey   string
		contentType string
	}

	// Walk the entire tmpDir tree — parallel-encode puts each rendition in a subdirectory.
	var tasks []task
	if err := filepath.WalkDir(dirPath, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return err
		}
		fileName := d.Name()
		// Build S3 key relative to dirPath
		relPath, _ := filepath.Rel(dirPath, path)
		objectKey := fmt.Sprintf("videos/%s/hls/%s", videoID, filepath.ToSlash(relPath))

		ct := "application/octet-stream"
		switch {
		case strings.HasSuffix(fileName, ".m3u8"):
			ct = "application/vnd.apple.mpegurl"
		case strings.HasSuffix(fileName, ".ts"):
			ct = "video/mp2t"
		}
		tasks = append(tasks, task{path, objectKey, ct})
		return nil
	}); err != nil {
		return nil, fmt.Errorf("walk hls dir: %w", err)
	}

	// 16 concurrent upload workers — saturates S3 bandwidth efficiently.
	const workers = 16
	taskCh := make(chan task, len(tasks))
	for _, t := range tasks {
		taskCh <- t
	}
	close(taskCh)

	var mu sync.Mutex
	var uploadedFiles []UploadedFile
	errCh := make(chan error, workers)
	var wg sync.WaitGroup

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for t := range taskCh {
				if ctx.Err() != nil {
					return
				}
				size, err := u.uploadFile(ctx, t.filePath, t.objectKey, t.contentType, bucket)
				if err != nil {
					errCh <- err
					return
				}
				mu.Lock()
				uploadedFiles = append(uploadedFiles, UploadedFile{Key: t.objectKey, SizeBytes: size, ContentType: t.contentType})
				mu.Unlock()
			}
		}()
	}

	wg.Wait()
	close(errCh)

	if err := <-errCh; err != nil {
		return nil, err
	}
	return uploadedFiles, nil
}

func (u *Uploader) UploadCaption(ctx context.Context, videoID, lang, vttContent, bucket string) (UploadedFile, error) {
	objectKey := fmt.Sprintf("videos/%s/captions/%s.vtt", videoID, lang)
	data := []byte(vttContent)
	if err := u.store.PutObject(ctx, bucket, objectKey, data, "text/vtt"); err != nil {
		return UploadedFile{}, fmt.Errorf("failed to upload caption: %w", err)
	}
	return UploadedFile{Key: objectKey, SizeBytes: int64(len(data)), ContentType: "text/vtt"}, nil
}

func (u *Uploader) UploadSprite(ctx context.Context, videoID, filePath, bucket string) (UploadedFile, error) {
	objectKey := fmt.Sprintf("videos/%s/thumbnails/sprite.jpg", videoID)
	size, err := u.uploadFile(ctx, filePath, objectKey, "image/jpeg", bucket)
	if err != nil {
		return UploadedFile{}, err
	}
	return UploadedFile{Key: objectKey, SizeBytes: size, ContentType: "image/jpeg"}, nil
}

func (u *Uploader) UploadPoster(ctx context.Context, videoID, filePath, bucket string) (UploadedFile, error) {
	objectKey := fmt.Sprintf("videos/%s/thumbnails/poster.jpg", videoID)
	size, err := u.uploadFile(ctx, filePath, objectKey, "image/jpeg", bucket)
	if err != nil {
		return UploadedFile{}, err
	}
	return UploadedFile{Key: objectKey, SizeBytes: size, ContentType: "image/jpeg"}, nil
}

func (u *Uploader) UploadPreview(ctx context.Context, videoID, filePath, bucket string) (UploadedFile, error) {
	objectKey := fmt.Sprintf("videos/%s/thumbnails/preview.mp4", videoID)
	size, err := u.uploadFile(ctx, filePath, objectKey, "video/mp4", bucket)
	if err != nil {
		return UploadedFile{}, err
	}
	return UploadedFile{Key: objectKey, SizeBytes: size, ContentType: "video/mp4"}, nil
}
