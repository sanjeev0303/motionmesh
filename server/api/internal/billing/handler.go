package billing

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/motionmesh/server/api/internal/auth"
	"github.com/motionmesh/server/shared/models"
	"github.com/motionmesh/server/shared/pricing"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	// Webhooks
	r.Post("/webhook", h.handleWebhook)

	// Protected routes (require auth middleware upstream)
	r.Get("/invoices", h.listInvoices)
	r.Get("/subscription", h.getSubscription)
	r.Get("/usage-events", h.getUsageEvents)
	r.Post("/portal", h.createPortalSession)
	r.Post("/checkout", h.createCheckoutSession)
	r.Post("/funds", h.addFunds)
}

func (h *Handler) handleWebhook(w http.ResponseWriter, r *http.Request) {
	// Stripe webhook signature is required
	sigHeader := r.Header.Get("Stripe-Signature")
	
	payload, err := ParseBody(r)
	if err != nil {
		http.Error(w, "Failed to read body", http.StatusBadRequest)
		return
	}

	if err := h.service.HandleWebhook(r.Context(), payload, sigHeader); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *Handler) listInvoices(w http.ResponseWriter, r *http.Request) {
	account, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || account == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if account.StripeCustomerID == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]map[string]interface{}{})
		return
	}

	invoices, err := h.service.ListInvoices(r.Context(), *account.StripeCustomerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(invoices)
}

func (h *Handler) getSubscription(w http.ResponseWriter, r *http.Request) {
	account, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || account == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Fetch usage metrics
	storageUsedBytes, _ := h.service.GetStorageUsage(r.Context(), account.ID)
	egressUsedBytes, _ := h.service.GetAggregatedUsage(r.Context(), account.ID, "bandwidth_bytes")
	transcodeSeconds, _ := h.service.GetAggregatedUsage(r.Context(), account.ID, "video_transcode_seconds")

	// Resolve plan limits dynamically from pricing (single source of truth)
	quota := pricing.QuotaForPlan(account.Plan)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"plan":                   account.Plan,
		"status":                 account.Status,
		"prepaidBalance":         float64(account.Balance) / 100.0,
		"storageUsedBytes":       storageUsedBytes,
		"storageLimitBytes":      quota.StorageBytes,
		"egressUsedBytes":        egressUsedBytes,
		"egressLimitBytes":       quota.EgressBytes,
		"transcodeMinutesUsed":   float64(transcodeSeconds) / 60.0,
		"transcodeMinutesLimit":  quota.TranscodeMinutes,
		"maxVideos":              quota.MaxVideos,
		"maxBuckets":             quota.MaxBuckets,
		"maxAPIKeys":             quota.MaxAPIKeys,
		"transcodeQuality":       quota.TranscodeQuality,
		"maxVideoSizeMB":         quota.MaxVideoSizeMB,
		"maxVideoDurationSec":    quota.MaxVideoDurationSec,
	})
}

// computeEventCost calculates the USD cost for a usage event.
func computeEventCost(eventType string, quantity int64, quality string) float64 {
	rates := pricing.Default
	switch eventType {
	case "storage_bytes":
		gb := float64(quantity) / (1024 * 1024 * 1024)
		return gb * rates.StoragePerGBMonth
	case "bandwidth_bytes":
		gb := float64(quantity) / (1024 * 1024 * 1024)
		return gb * rates.EgressPerGB
	case "video_transcode_seconds":
		minutes := float64(quantity) / 60.0
		if quality == "hd" {
			return minutes * rates.TranscodeHDPerMin
		}
		return minutes * rates.TranscodeSDPerMin
	}
	return 0
}

func (h *Handler) getUsageEvents(w http.ResponseWriter, r *http.Request) {
	account, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || account == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	events, err := h.service.ListUsageEvents(r.Context(), account.ID, 50)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	quality := pricing.QuotaForPlan(account.Plan).TranscodeQuality

	type usageResponse struct {
		ID       string  `json:"id"`
		Date     string  `json:"date"`
		Type     string  `json:"type"`
		Resource string  `json:"resource"`
		Quantity string  `json:"quantity"`
		Cost     float64 `json:"cost"`
	}

	var resp []usageResponse
	for _, ev := range events {
		qtyStr := fmt.Sprintf("%d", ev.Quantity)
		if ev.EventType == "storage_bytes" || ev.EventType == "bandwidth_bytes" {
			qtyStr = fmt.Sprintf("%.2f GB", float64(ev.Quantity)/(1024*1024*1024))
		} else if ev.EventType == "video_transcode_seconds" {
			qtyStr = fmt.Sprintf("%.2f min", float64(ev.Quantity)/60.0)
		}

		// Map internal event types to display names
		displayType := ev.EventType
		switch ev.EventType {
		case "storage_bytes":
			displayType = "storage"
		case "bandwidth_bytes":
			displayType = "egress"
		case "video_transcode_seconds":
			displayType = "transcode"
		}

		resp = append(resp, usageResponse{
			ID:       ev.ID,
			Date:     ev.CreatedAt.Format("2006-01-02T15:04:05Z"),
			Type:     displayType,
			Resource: "System",
			Quantity: qtyStr,
			Cost:     computeEventCost(ev.EventType, ev.Quantity, quality),
		})
	}

	if resp == nil {
		resp = []usageResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}


func (h *Handler) createPortalSession(w http.ResponseWriter, r *http.Request) {
	account, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || account == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		ReturnURL string `json:"return_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	url, err := h.service.CreatePortalSession(r.Context(), account, req.ReturnURL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"url": url,
	})
}

func (h *Handler) createCheckoutSession(w http.ResponseWriter, r *http.Request) {
	account, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || account == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Plan      string `json:"plan"`
		ReturnURL string `json:"return_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.Plan == "" {
		http.Error(w, "plan is required", http.StatusBadRequest)
		return
	}

	url, err := h.service.CreateCheckoutSession(r.Context(), account, req.Plan, req.ReturnURL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"url": url,
	})
}

func (h *Handler) addFunds(w http.ResponseWriter, r *http.Request) {
	account, ok := r.Context().Value(auth.AccountContextKey).(*models.Account)
	if !ok || account == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Amount int64 `json:"amount"` // in cents
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	newBalance, err := h.service.AddFunds(r.Context(), account.ID, req.Amount)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"balance": newBalance,
	})
}
