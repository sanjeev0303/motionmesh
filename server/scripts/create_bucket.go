//go:build ignore

// create_bucket.go — one-time helper to create the MotionMesh S3 bucket.
// Run with: AWS_REGION=ap-south-1 go run ./scripts/create_bucket.go
// Uses the default credential chain (env vars, ~/.aws/credentials, EC2 IMDSv2).

package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

func main() {
	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = "ap-south-1"
	}
	bucket := os.Getenv("STORAGE_BUCKET")
	if bucket == "" {
		bucket = "motionmesh-dev"
	}

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(region),
	)
	if err != nil {
		log.Fatal(err)
	}

	client := s3.NewFromConfig(cfg)

	_, err = client.CreateBucket(context.TODO(), &s3.CreateBucketInput{
		Bucket: aws.String(bucket),
		CreateBucketConfiguration: &s3types.CreateBucketConfiguration{
			LocationConstraint: s3types.BucketLocationConstraint(region),
		},
	})
	if err != nil {
		fmt.Printf("Error creating %s: %v\n", bucket, err)
		os.Exit(1)
	}

	fmt.Printf("Successfully created s3://%s in %s\n", bucket, region)
}
