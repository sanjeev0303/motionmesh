# MotionMesh Pricing Model

## AWS Cost Basis (ap-south-1 / Mumbai region)

| Service | AWS Rate | Our Rate (+50% margin) |
|---------|----------|------------------------|
| S3 Storage | $0.025/GB-month | **$0.038/GB-month** |
| S3 Egress (internet) | $0.109/GB | **$0.164/GB** |
| MediaConvert (SD<30fps) | $0.0045/min | **$0.0068/min** |
| MediaConvert (HD<30fps) | $0.0090/min | **$0.0135/min** |
| EC2 t3.medium API (amortised) | ~$0.0001/req | absorbed |

> **Egress basis**: direct S3 internet transfer (ap-south-1 first 10 TB tier). No CDN/CloudFront in the delivery path today — egress is metered and billed at the actual delivery cost. Markup is cost × 1.5, rounded up to 3 decimals. Formula: `rate = ceil(cost × 1.5 × 1000) / 1000`.

## Effective Billed Rates (displayed to user)

| Resource | Unit | User Price |
|----------|------|------------|
| Storage | per GB/month | $0.038 |
| Egress | per GB | $0.164 |
| Transcoding | per minute (SD) | $0.0068 |
| Transcoding | per minute (HD) | $0.0135 |

---

## Plan Tiers

### 🆓 Free
- **Storage**: 5 GB — hard limit, blocks uploads at limit
- **Egress**: 10 GB/month — metered, never blocked (overage billed)
- **Transcoding**: 30 minutes/month — hard limit (blocks new jobs at limit), SD only, max 5 min/video
- **Videos**: max 20 — blocks uploads at limit
- **API Keys**: 2 — blocks key creation at limit
- **Buckets**: 1 — blocks bucket creation at limit
- **Max file size**: 200 MB/video
- Monthly cost to us: 5GB $0.125 + 10GB egress $1.09 + 30min SD $0.135 = **~$1.35/mo** → $0 charged (acquisition cost)

### ⚡ Pay-as-you-go (Starter)
- **Storage**: First 10 GB free, then $0.038/GB-month
- **Egress**: First 20 GB free, then $0.164/GB
- **Transcoding**: First 60 min free, then $0.0068/min (SD) / $0.0135/min (HD)
- **Videos**: unlimited
- **Max file size**: 2 GB/video, max 60 min/video
- **API Keys**: 5
- **Buckets**: 3
- No monthly fee — true metered billing

### 🚀 Pro — $29/month
- **Storage**: 300 GB included, then $0.038/GB
- **Egress**: 120 GB/month included, then $0.164/GB
- **Transcoding**: 1,200 minutes/month included, HD enabled, max 10 GB/video, 4 h/video
- **Videos**: unlimited
- **API Keys**: 20
- **Buckets**: 10
- **Cost basis at limits**: 300×$0.025=$7.50 + 120×$0.109=$13.08 + 1200×$0.009=$10.80 + EC2~$3 = **$34.38** → ×1.5 = $51.57
- **Note**: $29/month delivers 50% margin at ~52% average utilization — same philosophy as the original model (old Pro also cost ~$33.5 at 100% usage). 2026 revision cut quotas ~40% (from 500 GB / 200 GB / 2,000 min) to hold $29.

### 🏢 Scale / Enterprise — Custom
- Everything unlimited
- Dedicated support + SLA
- Contact sales

---

## Enforcement Model (Free tier only; PAYG/Pro metered, not blocked)

| Resource | Where enforced | Behavior on breach |
|---|---|---|
| Storage bytes | upload initiation pre-check | 402 `storage_limit_reached` |
| Video count / file size | upload initiation | 402 |
| Video duration | worker post-probe (`max_duration_sec` in job params) | job fails `duration_limit_exceeded` |
| Transcode minutes/month | transcode job pre-check (monthly window) | 402 `transcode_limit_reached` |
| Buckets / API keys | create handlers | 402 |
| Egress | **never blocked** — HLS proxy records `bandwidth_bytes` | metered + billed |