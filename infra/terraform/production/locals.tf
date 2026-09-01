locals {
  name   = "motionmesh-prod"
  region = var.aws_region

  # Internal DNS names used for private service-to-service communication
  nats_url             = "nats://${module.nats.private_ip}:4222"
  redis_url            = "redis://${module.elasticache.primary_endpoint}:6379/0"
  aurora_endpoint      = module.aurora.cluster_endpoint
  aurora_db_name       = var.db_name
  captions_private_ip  = module.captions.private_ips[0]
  captions_sidecar_url = "http://${module.captions.private_ips[0]}:8000"

  # DATABASE_URL for Go services (pgx driver, sslmode=require for Aurora)
  database_url = "postgres://${var.db_username}:${var.db_password}@${module.aurora.cluster_endpoint}:${module.aurora.cluster_port}/${local.aurora_db_name}?sslmode=require"

  # S3 bucket name (account-scoped for global uniqueness)
  s3_bucket_name = "motionmesh-production-${data.aws_caller_identity.current.account_id}"

  # Public API URL (baked into dashboard at build time)
  public_api_url = "https://${var.api_domain}"

  # CORS origins for the API
  cors_allowed_origins = [
    "https://${var.domain_name}",
    "https://www.${var.domain_name}",
    "https://motionmesh-opal.vercel.app"
  ]
}
