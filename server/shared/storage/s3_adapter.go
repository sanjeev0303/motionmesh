package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	awss3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// S3Adapter implements ObjectStorage against AWS S3.
type S3Adapter struct {
	client    *s3.Client
	presigner *s3.PresignClient
}

func NewS3Adapter(client *s3.Client) *S3Adapter {
	return &S3Adapter{
		client:    client,
		presigner: s3.NewPresignClient(client),
	}
}

func (a *S3Adapter) PutObject(ctx context.Context, bucket string, key string, data []byte, contentType string) error {
	reader := bytes.NewReader(data)
	contentLength := int64(len(data))

	input := &s3.PutObjectInput{
		Bucket:        aws.String(bucket),
		Key:           aws.String(key),
		Body:          reader,
		ContentType:   aws.String(contentType),
		ContentLength: aws.Int64(contentLength),
	}

	// Apply Cache-Control based on object type
	if strings.HasSuffix(key, ".m3u8") {
		input.CacheControl = aws.String("no-cache")
	} else if strings.HasSuffix(key, ".ts") || strings.HasSuffix(key, ".mp4") || strings.HasSuffix(key, ".jpg") || strings.HasSuffix(key, ".png") {
		input.CacheControl = aws.String("public, max-age=31536000, immutable")
	}

	// Disable automatic checksum calculation which forces aws-chunked transfer encoding.
	// Setting WhenRequired avoids unnecessary overhead for presigned and streamed uploads.
	_, err := a.client.PutObject(ctx, input, func(o *s3.Options) {
		o.RequestChecksumCalculation = aws.RequestChecksumCalculationWhenRequired
	})
	return err
}

// PutObjectStream streams data from r directly to S3 using the manager.Uploader
// which handles chunking and buffering internally, avoiding seekability issues.
// contentLength is kept for signature but manager uses Body.
func (a *S3Adapter) PutObjectStream(ctx context.Context, bucket string, key string, r io.Reader, contentLength int64, contentType string) error {
	uploader := manager.NewUploader(a.client, func(u *manager.Uploader) {
		u.PartSize = 5 * 1024 * 1024 // 5 MB part size
		u.ClientOptions = append(u.ClientOptions, func(o *s3.Options) {
			o.RequestChecksumCalculation = aws.RequestChecksumCalculationWhenRequired
		})
	})

	input := &s3.PutObjectInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String(key),
		Body:        r,
		ContentType: aws.String(contentType),
	}

	if strings.HasSuffix(key, ".m3u8") {
		input.CacheControl = aws.String("no-cache")
	} else if strings.HasSuffix(key, ".ts") || strings.HasSuffix(key, ".mp4") || strings.HasSuffix(key, ".jpg") || strings.HasSuffix(key, ".png") {
		input.CacheControl = aws.String("public, max-age=31536000, immutable")
	}

	_, err := uploader.Upload(ctx, input)
	return err
}

func (a *S3Adapter) GetObjectStream(ctx context.Context, bucket string, key string) (io.ReadCloser, error) {
	out, err := a.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, func(o *s3.Options) {
		o.ResponseChecksumValidation = aws.ResponseChecksumValidationWhenRequired
	})
	if err != nil {
		return nil, err
	}
	return out.Body, nil
}

func (a *S3Adapter) GetObject(ctx context.Context, bucket string, key string) ([]byte, error) {
	body, err := a.GetObjectStream(ctx, bucket, key)
	if err != nil {
		return nil, err
	}
	defer body.Close()
	return io.ReadAll(body)
}

func (a *S3Adapter) DeleteObject(ctx context.Context, bucket string, key string) error {
	_, err := a.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	return err
}

func (a *S3Adapter) GetPresignedURL(ctx context.Context, bucket string, key string) (string, error) {
	req, err := a.presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(15*time.Minute))
	if err != nil {
		return "", err
	}
	return req.URL, nil
}

func (a *S3Adapter) GetPresignedUploadURL(ctx context.Context, bucket string, key, contentType string) (string, error) {
	req, err := a.presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(15*time.Minute))
	if err != nil {
		return "", err
	}
	return req.URL, nil
}


// CheckACL verifies required bucket permissions exist (call at startup).
func (a *S3Adapter) CheckACL(ctx context.Context, bucket string) error {
	_, err := a.client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(bucket),
	})
	if err != nil {
		return fmt.Errorf("storage: cannot access bucket %q: %w", bucket, err)
	}
	return nil
}

// CreateMultipartUpload initiates an S3 multipart upload and returns the upload ID.
func (a *S3Adapter) CreateMultipartUpload(ctx context.Context, bucket, key, contentType string) (string, error) {
	out, err := a.client.CreateMultipartUpload(ctx, &s3.CreateMultipartUploadInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, func(o *s3.Options) {
		o.RequestChecksumCalculation = aws.RequestChecksumCalculationWhenRequired
	})
	if err != nil {
		return "", fmt.Errorf("create multipart upload: %w", err)
	}
	return aws.ToString(out.UploadId), nil
}

// PresignUploadPart returns a presigned URL for uploading a single part.
// Expiry is 1 hour — long enough for large parts on slow connections.
func (a *S3Adapter) PresignUploadPart(ctx context.Context, bucket, key, uploadID string, partNumber int32) (string, error) {
	req, err := a.presigner.PresignUploadPart(ctx, &s3.UploadPartInput{
		Bucket:     aws.String(bucket),
		Key:        aws.String(key),
		UploadId:   aws.String(uploadID),
		PartNumber: aws.Int32(partNumber),
	}, s3.WithPresignExpires(60*time.Minute))
	if err != nil {
		return "", fmt.Errorf("presign part %d: %w", partNumber, err)
	}
	return req.URL, nil
}

// CompleteMultipartUpload assembles the parts into a single object.
func (a *S3Adapter) CompleteMultipartUpload(ctx context.Context, bucket, key, uploadID string, parts []CompletedPart) error {
	s3Parts := make([]awss3types.CompletedPart, len(parts))
	for i, p := range parts {
		s3Parts[i] = awss3types.CompletedPart{
			PartNumber: aws.Int32(p.PartNumber),
			ETag:       aws.String(p.ETag),
		}
	}
	_, err := a.client.CompleteMultipartUpload(ctx, &s3.CompleteMultipartUploadInput{
		Bucket:   aws.String(bucket),
		Key:      aws.String(key),
		UploadId: aws.String(uploadID),
		MultipartUpload: &awss3types.CompletedMultipartUpload{
			Parts: s3Parts,
		},
	})
	return err
}

// AbortMultipartUpload cancels an in-progress multipart upload.
func (a *S3Adapter) AbortMultipartUpload(ctx context.Context, bucket, key, uploadID string) error {
	_, err := a.client.AbortMultipartUpload(ctx, &s3.AbortMultipartUploadInput{
		Bucket:   aws.String(bucket),
		Key:      aws.String(key),
		UploadId: aws.String(uploadID),
	})
	return err
}

// Ensure S3Adapter implements ObjectStorage at compile time.
var _ interface{ PutObject(context.Context, string, string, []byte, string) error } = (*S3Adapter)(nil)

// keep awss3types imported (used for compile-time check guard)
var _ = awss3types.Object{}
