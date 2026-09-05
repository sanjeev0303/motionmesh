// Package pricing is the single source of truth for user-facing rates and
// per-plan resource quotas. Every layer (middleware, billing handler, videos
// handler) must read from here instead of maintaining its own copy.
package pricing

import "github.com/motionmesh/server/shared/models"

// Rates holds the user-facing metered prices.
//
// Each rate = AWS marginal cost × 1.5 (50% profit margin), rounded up to 3+
// decimals. Cost basis: ap-south-1. Egress is direct S3 internet egress
// (the HLS proxy streams from S3 through the API; no CDN in the path).
type Rates struct {
	// StoragePerGBMonth dollars per stored GB per month ($0.025 × 1.5 = $0.0375 → $0.038).
	StoragePerGBMonth float64
	// EgressPerGB dollars per delivered GB ($0.109 × 1.5 = $0.1635 → $0.164).
	EgressPerGB float64
	// TranscodeSDPerMin dollars per minute of SD (<30fps) transcode ($0.0045 × 1.5 = $0.00675 → $0.0068).
	TranscodeSDPerMin float64
	// TranscodeHDPerMin dollars per minute of HD (<30fps) transcode ($0.0090 × 1.5 = $0.0135).
	TranscodeHDPerMin float64
}

// Default is the production rate card (50% margin).
var Default = Rates{
	StoragePerGBMonth: 0.038,
	EgressPerGB:       0.164,
	TranscodeSDPerMin: 0.0068,
	TranscodeHDPerMin: 0.0135,
}

// PlanQuotas holds hard limits per plan tier. -1 means unlimited.
//
// Pro reprice (50% margin, $29/mo): quotas cut ~40% from the previous
// 500GB/200GB/2000min — see .omo/plans/pricing-overhaul.md for economics.
var PlanQuotas = map[string]models.PlanQuota{
	"free": {
		StorageBytes:        5 * 1024 * 1024 * 1024,  // 5 GB
		EgressBytes:         10 * 1024 * 1024 * 1024, // 10 GB/month (recorded, not blocked)
		TranscodeMinutes:    30,                       // 30 minutes/month
		MaxVideos:           20,
		MaxBuckets:          1,
		MaxAPIKeys:          2,
		MaxVideoSizeMB:      200,  // 200 MB per video
		MaxVideoDurationSec: 300,  // 5 min per video (SD only)
		TranscodeQuality:    "sd",
	},
	"starter": { // pay-as-you-go — soft limits, billed beyond the free allowance
		StorageBytes:        10 * 1024 * 1024 * 1024,  // 10 GB free, then metered
		EgressBytes:         20 * 1024 * 1024 * 1024,  // 20 GB free
		TranscodeMinutes:    60,                        // 60 min free, then metered
		MaxVideos:           -1,                        // unlimited
		MaxBuckets:          3,
		MaxAPIKeys:          5,
		MaxVideoSizeMB:      2048, // 2 GB per video
		MaxVideoDurationSec: 3600, // 60 min
		TranscodeQuality:    "hd",
	},
	"pro": { // $29/mo included quota, then metered
		StorageBytes:        300 * 1024 * 1024 * 1024, // 300 GB included
		EgressBytes:         120 * 1024 * 1024 * 1024, // 120 GB/month included
		TranscodeMinutes:    1200,                      // 1,200 min included
		MaxVideos:           -1,                        // unlimited
		MaxBuckets:          10,
		MaxAPIKeys:          20,
		MaxVideoSizeMB:      10240, // 10 GB per video
		MaxVideoDurationSec: 14400, // 4 hours
		TranscodeQuality:    "hd",
	},
	"enterprise": {
		StorageBytes:        -1, // unlimited
		EgressBytes:         -1,
		TranscodeMinutes:    -1,
		MaxVideos:           -1,
		MaxBuckets:          -1,
		MaxAPIKeys:          -1,
		MaxVideoSizeMB:      -1,
		MaxVideoDurationSec: -1,
		TranscodeQuality:    "hd",
	},
}

// QuotaForPlan returns the quota for a plan, defaulting to free for unknown plans.
func QuotaForPlan(plan string) models.PlanQuota {
	if q, ok := PlanQuotas[plan]; ok {
		return q
	}
	return PlanQuotas["free"]
}