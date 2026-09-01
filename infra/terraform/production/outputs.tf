output "alb_dns_name" {
  description = "ALB DNS name — use as CNAME or alias in external DNS"
  value       = module.alb.alb_dns_name
}

output "api_url" {
  description = "Public API URL"
  value       = "https://${var.api_domain}"
}

output "dashboard_url" {
  description = "Public dashboard URL"
  value       = "https://${var.domain_name}"
}

output "aurora_endpoint" {
  description = "Aurora writer endpoint (internal)"
  value       = module.aurora.cluster_endpoint
}

output "aurora_reader_endpoint" {
  description = "Aurora reader endpoint (internal)"
  value       = module.aurora.reader_endpoint
}

output "redis_endpoint" {
  description = "ElastiCache primary endpoint (internal)"
  value       = module.elasticache.primary_endpoint
}

output "nats_private_ip" {
  description = "NATS EC2 private IP"
  value       = module.nats.private_ip
}

output "s3_bucket_name" {
  description = "S3 bucket name for application storage"
  value       = module.s3.bucket_name
}

output "s3_bucket_region" {
  description = "Region where the S3 bucket lives"
  value       = module.s3.bucket_region
}

output "captions_private_ip" {
  description = "Private IP of the captions sidecar instance"
  value       = module.captions.private_ips[0]
}

output "api_instance_ids" {
  value = module.api.instance_ids
}

output "worker_instance_ids" {
  value = module.worker.instance_ids
}

output "dashboard_instance_ids" {
  value = module.dashboard.instance_ids
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.this.arn
}

output "route53_nameservers" {
  description = "Nameservers for the hosted zone — delegate from your registrar"
  value       = data.aws_route53_zone.primary.name_servers
}
