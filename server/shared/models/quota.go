package models

// PlanQuota defines hard resource limits per plan tier.
// -1 means unlimited (enterprise only).
type PlanQuota struct {
	StorageBytes        int64  // Max total storage in bytes
	EgressBytes         int64  // Max egress per month in bytes
	TranscodeMinutes    int64  // Max transcode minutes per month
	MaxVideos           int64  // Max number of videos (-1 = unlimited)
	MaxBuckets          int64  // Max number of buckets
	MaxAPIKeys          int64  // Max number of API keys
	MaxVideoSizeMB      int64  // Max single video file size in MB (-1 = unlimited)
	MaxVideoDurationSec int64  // Max video duration in seconds (-1 = unlimited)
	TranscodeQuality    string // "sd" | "hd"
}
