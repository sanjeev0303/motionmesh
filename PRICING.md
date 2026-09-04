# MotionMesh Pricing Model

## AWS Cost Basis (ap-south-1 / Mumbai region)

| Service | AWS Rate | Our Rate (+30% margin) |
|---------|----------|------------------------|
| S3 Storage | $0.025/GB-month | **$0.030/GB-month** |
| S3 Egress (internet) | $0.109/GB | **$0.015/GB** (blended, CDN cached) |
| MediaConvert (SD<30fps) | $0.0045/min | **$0.006/min** |
| MediaConvert (HD<30fps) | $0.0090/min | **$0.012/min** |
| EC2 t3.medium API (amortised) | ~$0.0001/req | absorbed |
| CloudFront CDN | $0.0085/GB | absorbed in egress |

## Effective Billed Rates (displayed to user)

| Resource | Unit | User Price |
|----------|------|------------|
| Storage | per GB/month | $0.030 |
| Egress | per GB | $0.015 |
| Transcoding | per minute (SD) | $0.006 |
| Transcoding | per minute (HD) | $0.012 |

---

## Plan Tiers

### 🆓 Free
- **Storage**: 5 GB hard limit
- **Egress**: 10 GB/month hard limit
- **Transcoding**: 30 minutes/month hard limit, SD only, max 5 min per video
- **Videos**: max 20 videos
- **API Keys**: 2
- **Buckets**: 1
- Monthly cost to us: ~$0.15 → $0 charged (acquisition cost)

### ⚡ Pay-as-you-go (Starter)
- **Storage**: First 10 GB free, then $0.030/GB-month
- **Egress**: First 20 GB free, then $0.015/GB
- **Transcoding**: First 60 min free, then $0.006/min (SD) / $0.012/min (HD)
- **Videos**: unlimited
- **API Keys**: 5
- **Buckets**: 3
- No monthly fee — true metered billing

### 🚀 Pro — $29/month
- **Storage**: 500 GB included, then $0.030/GB
- **Egress**: 200 GB/month included, then $0.015/GB
- **Transcoding**: 2,000 minutes/month included, HD enabled, max 60 min per video
- **Videos**: unlimited
- **API Keys**: 20
- **Buckets**: 10
- **Cost basis at limits**: Storage 500GB×$0.025=$12.5 + Transcode 2000×$0.0090=$18 + EC2=$3 = ~$33.5 → $29 price w/ 30% on lower usage avg

### 🏢 Scale / Enterprise — Custom
- Everything unlimited
- Dedicated support + SLA
- Contact sales
