package middleware

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/motionmesh/server/api/internal/auth"
	"github.com/motionmesh/server/shared/logger"
	"github.com/motionmesh/server/shared/models"
)

// PlanLimits defines hard limits per plan for real-time enforcement.
// These are checked on every upload / transcode / bucket create request.
var PlanLimits = map[string]models.PlanQuota{
	"free": {
		StorageBytes:       5 * 1024 * 1024 * 1024,        // 5 GB
		EgressBytes:        10 * 1024 * 1024 * 1024,       // 10 GB/month
		TranscodeMinutes:   30,                             // 30 minutes/month
		MaxVideos:          20,
		MaxBuckets:         1,
		MaxAPIKeys:         2,
		MaxVideoSizeMB:     200,                            // 200 MB per video
		MaxVideoDurationSec: 300,                           // 5 min per video (SD only)
		TranscodeQuality:   "sd",
	},
	"starter": { // pay-as-you-go — soft limits, billed beyond free tier
		StorageBytes:       10 * 1024 * 1024 * 1024,       // 10 GB free, then metered
		EgressBytes:        20 * 1024 * 1024 * 1024,       // 20 GB free
		TranscodeMinutes:   60,                             // 60 min free, then metered
		MaxVideos:          -1,                             // unlimited
		MaxBuckets:         3,
		MaxAPIKeys:         5,
		MaxVideoSizeMB:     2048,                           // 2 GB per video
		MaxVideoDurationSec: 3600,                          // 60 min
		TranscodeQuality:   "hd",
	},
	"pro": {
		StorageBytes:       500 * 1024 * 1024 * 1024,      // 500 GB included
		EgressBytes:        200 * 1024 * 1024 * 1024,      // 200 GB/month included
		TranscodeMinutes:   2000,                           // 2,000 min included
		MaxVideos:          -1,                             // unlimited
		MaxBuckets:         10,
		MaxAPIKeys:         20,
		MaxVideoSizeMB:     10240,                          // 10 GB per video
		MaxVideoDurationSec: 14400,                         // 4 hours
		TranscodeQuality:   "hd",
	},
	"enterprise": {
		StorageBytes:       -1, // unlimited
		EgressBytes:        -1,
		TranscodeMinutes:   -1,
		MaxVideos:          -1,
		MaxBuckets:         -1,
		MaxAPIKeys:         -1,
		MaxVideoSizeMB:     -1,
		MaxVideoDurationSec: -1,
		TranscodeQuality:   "hd",
	},
}

type PlanChecker interface {
	GetAccountPlan(ctx context.Context, accountID string) (string, error)
}

// RequirePlan returns HTTP middleware that enforces a minimum plan tier.
func RequirePlan(tier string, checker PlanChecker) func(http.Handler) http.Handler {
	planRank := map[string]int{
		"free":       0,
		"starter":    1,
		"pro":        2,
		"enterprise": 3,
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
			if !ok || acc == nil {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			currentPlan, err := checker.GetAccountPlan(r.Context(), acc.ID)
			if err != nil {
				currentPlan = acc.Plan // fallback
			}

			accountRank := planRank[currentPlan]
			requiredRank := planRank[tier]

			if accountRank < requiredRank {
				logger.New().Error("RequirePlan forbidden: account_id=%s current_plan=%s account_rank=%d required_plan=%s required_rank=%d", acc.ID, currentPlan, accountRank, tier, requiredRank)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				json.NewEncoder(w).Encode(map[string]string{
					"error":         "plan_upgrade_required",
					"required_plan": tier,
					"current_plan":  currentPlan,
					"message":       "Upgrade your plan to access this feature.",
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// EnforceQuota checks resource limits and returns 402 when hard quota is exceeded.
func EnforceQuota(resource string, checker QuotaChecker) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			acc, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
			if !ok || acc == nil {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			plan, err := checker.GetAccountPlan(r.Context(), acc.ID)
			if err != nil {
				plan = acc.Plan
			}

			quota, ok := PlanLimits[plan]
			if !ok {
				quota = PlanLimits["free"]
			}

			exceeded, limit := checker.CheckQuota(r.Context(), acc.ID, resource, quota)
			if exceeded {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusPaymentRequired)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"error":    "quota_exceeded",
					"resource": resource,
					"limit":    limit,
					"plan":     plan,
					"message":  "You have reached the " + resource + " limit for the " + plan + " plan. Please upgrade.",
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// QuotaChecker is implemented by the billing service.
type QuotaChecker interface {
	PlanChecker
	CheckQuota(ctx context.Context, accountID, resource string, quota models.PlanQuota) (exceeded bool, limit int64)
}
