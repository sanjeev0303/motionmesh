-- Drop analytics tables.
-- NOTE: usage_events is the live billing ledger (queried by getSubscription and
-- written by the NATS usage consumer) — it must never be dropped here.
DROP TABLE IF EXISTS analytics_daily CASCADE;
DROP TABLE IF EXISTS video_playback_events CASCADE;
DROP TABLE IF EXISTS video_chapters CASCADE;
