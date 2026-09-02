package storage

import (
	"context"
	"io"
)

// ObjectStorage is the interface the service layer depends on.
// Any S3-compatible backend implements this by satisfying
// the method set — no backend-specific type ever appears in service code.
type ObjectStorage interface {
	PutObject(ctx context.Context, bucket string, key string, data []byte, contentType string) error
	PutObjectStream(ctx context.Context, bucket string, key string, r io.Reader, size int64, contentType string) error
	GetObject(ctx context.Context, bucket string, key string) ([]byte, error)
	GetObjectStream(ctx context.Context, bucket string, key string) (io.ReadCloser, error)
	DeleteObject(ctx context.Context, bucket string, key string) error
	GetPresignedURL(ctx context.Context, bucket string, key string) (string, error)
	GetPresignedUploadURL(ctx context.Context, bucket string, key, contentType string) (string, error)
	// Multipart upload — enables parallel chunked browser uploads
	CreateMultipartUpload(ctx context.Context, bucket, key, contentType string) (uploadID string, err error)
	PresignUploadPart(ctx context.Context, bucket, key, uploadID string, partNumber int32) (presignedURL string, err error)
	CompleteMultipartUpload(ctx context.Context, bucket, key, uploadID string, parts []CompletedPart) error
	AbortMultipartUpload(ctx context.Context, bucket, key, uploadID string) error
}

// CompletedPart mirrors the S3 completed-part structure so the interface
// stays decoupled from the AWS SDK types.
type CompletedPart struct {
	PartNumber int32
	ETag       string
}
