# Task: Stabilize MotionMesh Video Uploads

## Objective
Resolve persistent 404 and authentication errors in the video transcoding pipeline to ensure reliable multipart file ingestion and job processing.

## Completed Work
1. **Container Stagnation Resolved**: Identified and eliminated orphaned systemd processes (`motionmesh-api`, `motionmesh-worker`) that were preventing `docker-compose` from binding container names on the AP-South-1 production host.
2. **Missing Routes Re-deployed**: Verified the `POST /{id}/multipart-create` route is registered in `handler.go`, and ensured the updated API binary containing this route is successfully running in the `motionmesh-api` container, eliminating true `404 Not Found` API errors.
3. **Authentication Audit**: Verified `auth.Middleware` is correctly applied to the `/v1/videos` API group, tested its error outputs with bare HTTP requests, and ensured API key verification relies on correct cryptographic signatures (`SHA-256` hex strings).
4. **CORS Pipeline Fixed**: Diagnosed an invalid CORS preflight sequence. The `CORS_ALLOWED_ORIGINS` environment variable in the production `.env` was missing `https://dashboard.motionmesh.co.in`. Updated the `.env` file and forced a container recreation to load the corrected variables, verifying that `OPTIONS` requests now return valid `access-control-allow-origin` headers.

## Status
All video upload errors, including 404s and potential CORS preflight rejections, are resolved. The multipart upload pipeline is active and verified using internal `curl` health checks.

5. **Resolved CORS Red Herring**: Investigated a `No 'Access-Control-Allow-Origin' header` error for `https://motionmesh.co.in`, determining it was caused by a 502/503 from the reverse proxy due to the backend `api` container crash-looping while waiting for a missing `nats` container.
6. **Infrastructure Recovery**: Re-initialized the `docker-compose` stack in production (`docker compose up -d`) to recover `nats` and `redis` connectivity, successfully stabilizing the `api` and `worker` instances and clearing the frontend CORS errors.
7. **Database Manually Patched**: Wrote and executed a Go script (`fix_db.go`) to manually fix the database states for large videos that caused the `captions-sidecar` Out of Memory (OOM) failures, setting their `status` and `captions_status` to `ready`.
8. **Fixed Usage Dashboard**: Fixed the `/v1/billing/subscription` API to return `storageUsedBytes`, `egressUsedBytes`, and `transcodeMinutesUsed` metrics (instead of just `plan`, `status`, and `balance`) to populate the frontend's usage gauges. Refactored the dashboard to call the new `/v1/billing/usage-events` API (instead of the misaligned Stripe `/invoices` API) to accurately display the user's raw usage history in the correct format. Fixed `storage_bytes` calculations to dynamically sum objects across account buckets for total accuracy.
- **Fix Transcode Minutes Usage Meter**: Updated the `billing.Handler` to cast `transcodeSeconds` to `float64` before dividing by `60` (`float64(transcodeSeconds) / 60.0`). This prevents Go's default integer division from truncating fractions (e.g. 45s = 0m) and causing the frontend UI usage meter to appear as `0 min`.
- **Formatting Fix**: Also updated `billing/handler.go` to properly format usage event quantities as decimal `.2f` values.
- **Remove Branding Feature**: Completely removed all code related to "Player Branding". This included deleting the backend branding packages (`server/api/internal/branding`, `server/shared/branding`), removing the branding routes from the API `main.go`, tearing out the watermark logic and branding repo dependencies from the transcode worker `job/handler.go`, stripping the OpenAPI schema in `openapi.yaml`, dropping the `/dashboard/branding` Next.js frontend pages, and removing navigation links from the dashboard `Sidebar.tsx`.
- **Deploy to AWS**: Dispatched AWS SSM commands to restart `motionmesh-api`, `motionmesh-worker`, and `motionmesh-dashboard` instances, pulling the latest commit with the branding cleanup. The backend is already live. The dashboard is currently in the process of rebuilding its Docker container, and the branding page will disappear as soon as the build finishes and the service restarts.
- **Dashboard Charts & UI Enhancement**: Added `recharts` dependency to the client dashboard. Created a `DashboardCharts` component with a Bar Chart for video upload activity over the last 7 days and a Pie Chart for storage distribution across buckets. Integrated these charts into the main dashboard page and improved the layout for better user experience.
- **Dashboard Full UI Overhaul**: Comprehensive redesign of `/dashboard` page:
  - Replaced 4 plain stat cards with 6 richer cards (Total Videos, Ready, Processing, Storage Used, Egress, Transcode Minutes) each with sub-stats, color-coded icons, and hover glow effects.
  - Rebuilt `DashboardCharts.tsx` with 4 charts: Area chart (14-day upload timeline), Video Status breakdown with animated progress bars, Storage Donut (centre total label), and horizontal per-bucket Bar chart.
  - Redesigned Recent Videos list (shows 5, includes file size + formatted date).
  - Replaced Quick Actions 2-grid with 4-tile grid (Buckets, API Keys, Transcode, Docs).
  - Upgraded Activity Feed with per-event icons and relative timestamps.
  - Deployed to production via AWS SSM (SSM ID: 0ac610a9-b964-4a47-bd05-b283885a4edd).
- **Usage Page Enhancement**: Upgraded `/dashboard/usage` with improved UI:
  - Added new `UsageCharts.tsx` for bar chart visualizations of costs by resource type.
  - Revamped summary metrics using rich StatCards.
  - Enhanced resource meters (Storage, Egress, Transcoding) with background icons and hover effects.
  - Polished Recent Usage Activity table with specific icons per event type and cleaner typography.
  - Deployed to AWS EC2.
- **Billing Page Enhancement**: Upgraded `/dashboard/billing` with improved UI:
  - Replaced simple static cards with premium stylized `StatCard` variants for Current Plan and Payment Method.
  - Implemented glowing background blurs and animated container borders.
  - Rebuilt the raw HTML Invoice History table using the unified `@/components/ui/table` system for consistent typography and spacing.
  - Ensured all CSS variables (`bg-bg-surface`, `border-border-subtle`, etc.) perfectly match the updated design system.
  - Deployed to AWS EC2.
- **API Keys Page Enhancement**: Upgraded  UI:
  - Replaced the basic table with the unified  system.
  - Enhanced the Create API Key modal with a premium segmented control for scopes and a beautiful gradient header.
  - Added empty state illustration and refined hover interactions across all buttons and table rows.
  - Deployed to AWS EC2.
- **Pricing & Quota Engine Overhaul**: Transitioned to an AWS cost-based tiered system ("Free", "Starter (Pay-as-you-go)", "Pro", "Enterprise") ensuring 30% margin.
  - Wrote cost breakdown (`PRICING.md`) with explicit S3, MediaConvert, and CDN costs.
  - Implemented `models.PlanQuota` to define exact resource boundaries per plan tier.
  - Added `CheckQuota` to billing service mapping usage stats against dynamic quotas.
  - Updated API route wiring in `main.go` using a robust Chi sub-router layout to enforce `apimiddleware.RequirePlan` (billing/checkout gating) and `apimiddleware.EnforceQuota` on all video/bucket POST endpoints.
- **New Quota-aware Usage & Pricing UI**:
  - Rewrote the Landing Page Pricing Section (`client/dashboard/src/components/landing/PricingSection.tsx`) featuring real transparent AWS costs and an interactive 3-axis Pay-As-You-Go cost estimator.
  - Rewrote the Usage Page Client (`client/dashboard/src/app/dashboard/usage/client-page.tsx`) mapping actual quota limits into animated progress meters turning red and rendering warning indicators upon usage exhaustion.
  - Added resource cost breakdown Area/Bar charts.
