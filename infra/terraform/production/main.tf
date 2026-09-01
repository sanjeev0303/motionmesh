# ─── VPC ─────────────────────────────────────────────────────────────────────

module "vpc" {
  source = "../modules/vpc"

  name = local.name
  cidr = var.vpc_cidr
  azs  = var.azs
}

# ─── Security Groups ──────────────────────────────────────────────────────────

module "security" {
  source = "../modules/security"

  vpc_id   = module.vpc.vpc_id
  vpc_cidr = var.vpc_cidr
}

# ─── S3 ──────────────────────────────────────────────────────────────────────

module "s3" {
  source = "../modules/s3"

  bucket_name          = local.s3_bucket_name
  cors_allowed_origins = local.cors_allowed_origins
}

# ─── IAM ─────────────────────────────────────────────────────────────────────

module "iam" {
  source = "../modules/iam"

  bucket_arn = module.s3.bucket_arn
}

# ─── Aurora PostgreSQL ────────────────────────────────────────────────────────

module "aurora" {
  source = "../modules/aurora"

  name              = local.name
  vpc_id            = module.vpc.vpc_id
  private_subnets   = module.vpc.private_subnet_ids
  security_group_id = module.security.aurora_sg_id

  db_name      = var.db_name
  db_username  = var.db_username
  db_password  = var.db_password
  instance_class = var.aurora_instance_class
}

# ─── ElastiCache Redis ────────────────────────────────────────────────────────

module "elasticache" {
  source = "../modules/elasticache"

  name              = local.name
  vpc_id            = module.vpc.vpc_id
  private_subnets   = module.vpc.private_subnet_ids
  security_group_id = module.security.redis_sg_id
  node_type         = var.redis_node_type
}

# ─── NATS JetStream (EC2) ─────────────────────────────────────────────────────

module "nats" {
  source = "../modules/nats"

  name                  = local.name
  vpc_id                = module.vpc.vpc_id
  subnet_id             = module.vpc.private_subnet_ids[1]
  security_group_id     = module.security.nats_sg_id
  instance_profile_name = module.iam.instance_profile_name
  instance_type         = var.nats_instance_type
  key_name              = var.key_name
}

# ─── Captions Sidecar (EC2) ───────────────────────────────────────────────────

module "captions" {
  source = "../modules/ec2-service"

  name               = "motionmesh-captions"
  subnet_id          = module.vpc.private_subnet_ids[1]
  security_group_ids = [module.security.captions_sg_id]
  instance_profile_name = module.iam.instance_profile_name
  instance_type      = var.captions_instance_type
  key_name           = var.key_name
  root_volume_size   = 30

  user_data = base64encode(templatefile("${path.module}/user-data/captions.sh.tftpl", {
    github_repository = var.github_repository
    github_branch     = var.github_branch
    aws_region        = var.aws_region
  }))
}

# ─── API EC2 ─────────────────────────────────────────────────────────────────

module "api" {
  source = "../modules/ec2-service"

  name               = "motionmesh-api"
  subnet_id          = module.vpc.private_subnet_ids[1]
  security_group_ids = [module.security.api_sg_id]
  instance_profile_name = module.iam.instance_profile_name
  instance_type      = var.api_instance_type
  key_name           = var.key_name
  root_volume_size   = 30
  target_group_arn   = module.alb.api_target_group_arn
  attach_to_alb      = true

  user_data = base64encode(templatefile("${path.module}/user-data/api.sh.tftpl", {
    github_repository    = var.github_repository
    github_branch        = var.github_branch
    aws_region           = var.aws_region
    database_url         = local.database_url
    redis_url            = local.redis_url
    nats_url             = local.nats_url
    storage_bucket       = local.s3_bucket_name
    jwt_secret           = var.jwt_secret
    clerk_secret_key     = var.clerk_secret_key
    clerk_jwks_url       = var.clerk_jwks_url
    stripe_secret_key    = var.stripe_secret_key
    stripe_webhook_secret = var.stripe_webhook_secret
    gemini_api_key       = var.gemini_api_key
    captions_sidecar_url = local.captions_sidecar_url
  }))

  depends_on = [module.aurora, module.elasticache, module.nats, module.captions]
}

# ─── Worker EC2 ──────────────────────────────────────────────────────────────

module "worker" {
  source = "../modules/ec2-service"

  name               = "motionmesh-worker"
  subnet_id          = module.vpc.private_subnet_ids[1]
  security_group_ids = [module.security.worker_sg_id]
  instance_profile_name = module.iam.instance_profile_name
  instance_type      = var.worker_instance_type
  key_name           = var.key_name
  root_volume_size   = 50
  instance_count     = var.worker_count

  user_data = base64encode(templatefile("${path.module}/user-data/worker.sh.tftpl", {
    github_repository    = var.github_repository
    github_branch        = var.github_branch
    aws_region           = var.aws_region
    database_url         = local.database_url
    redis_url            = local.redis_url
    nats_url             = local.nats_url
    storage_bucket       = local.s3_bucket_name
    jwt_secret           = var.jwt_secret
    clerk_secret_key     = var.clerk_secret_key
    clerk_jwks_url       = var.clerk_jwks_url
    stripe_secret_key    = var.stripe_secret_key
    stripe_webhook_secret = var.stripe_webhook_secret
    gemini_api_key       = var.gemini_api_key
    captions_sidecar_url = local.captions_sidecar_url
  }))

  depends_on = [module.aurora, module.elasticache, module.nats, module.captions]
}

# ─── Dashboard EC2 ───────────────────────────────────────────────────────────

module "dashboard" {
  source = "../modules/ec2-service"

  name               = "motionmesh-dashboard"
  subnet_id          = module.vpc.private_subnet_ids[1]
  security_group_ids = [module.security.dashboard_sg_id]
  instance_profile_name = module.iam.instance_profile_name
  instance_type      = var.dashboard_instance_type
  key_name           = var.key_name
  root_volume_size   = 30
  target_group_arn   = module.alb.dashboard_target_group_arn
  attach_to_alb      = true

  user_data = base64encode(templatefile("${path.module}/user-data/dashboard.sh.tftpl", {
    github_repository    = var.github_repository
    github_branch        = var.github_branch
    aws_region           = var.aws_region
    next_public_api_url  = local.public_api_url
    next_public_clerk_publishable_key = var.clerk_publishable_key
    next_public_motionmesh_bucket_id = local.s3_bucket_name
    next_public_motionmesh_transcode_bucket_id = local.s3_bucket_name
  }))
}

# ─── ACM Certificate ─────────────────────────────────────────────────────────

resource "aws_acm_certificate" "this" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = local.name }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.this.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.primary.zone_id
}

resource "aws_acm_certificate_validation" "this" {
  certificate_arn         = aws_acm_certificate.this.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ─── ALB ─────────────────────────────────────────────────────────────────────

module "alb" {
  source = "../modules/alb"

  name              = local.name
  vpc_id            = module.vpc.vpc_id
  public_subnets    = module.vpc.public_subnet_ids
  security_group_id = module.security.alb_sg_id
  certificate_arn   = aws_acm_certificate_validation.this.certificate_arn
  domain_name       = var.domain_name
  api_domain        = var.api_domain
}

# ─── Route 53 records ─────────────────────────────────────────────────────────

resource "aws_route53_record" "apex" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "A"
  allow_overwrite = true

  alias {
    name                   = module.alb.alb_dns_name
    zone_id                = module.alb.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"
  allow_overwrite = true

  alias {
    name                   = module.alb.alb_dns_name
    zone_id                = module.alb.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = var.api_domain
  type    = "A"
  allow_overwrite = true

  alias {
    name                   = module.alb.alb_dns_name
    zone_id                = module.alb.alb_zone_id
    evaluate_target_health = true
  }
}

# ─── CloudWatch Log Groups (pre-create for IAM log-driver) ────────────────────

resource "aws_cloudwatch_log_group" "api" {
  name              = "/motionmesh/api"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/motionmesh/worker"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "dashboard" {
  name              = "/motionmesh/dashboard"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "captions" {
  name              = "/motionmesh/captions"
  retention_in_days = 14
}
