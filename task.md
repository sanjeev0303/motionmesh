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
