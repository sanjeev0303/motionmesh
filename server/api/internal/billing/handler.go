package billing

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/motionmesh/server/api/internal/auth"
	"github.com/motionmesh/server/shared/models"
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"plan":                  account.Plan,
		"status":                account.Status,
		"prepaidBalance":        float64(account.Balance) / 100.0, // Convert cents to dollars
		"storageUsedBytes":      storageUsedBytes,
		"egressUsedBytes":       egressUsedBytes,
		"transcodeMinutesUsed":  float64(transcodeSeconds) / 60.0,
		"transcodeMinutesLimit": 5000,
	})
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

		resp = append(resp, usageResponse{
			ID:       ev.ID,
			Date:     ev.CreatedAt.Format("2006-01-02T15:04:05Z"),
			Type:     ev.EventType,
			Resource: "System",
			Quantity: qtyStr,
			Cost:     0, // Need to implement pricing logic if cost > 0
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
		PriceID   string `json:"price_id"`
		ReturnURL string `json:"return_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	url, err := h.service.CreateCheckoutSession(r.Context(), account, req.PriceID, req.ReturnURL)
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
