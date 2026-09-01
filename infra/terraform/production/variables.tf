variable "aws_region" {
  type        = string
  default     = "ap-south-1"
  description = "AWS region for all resources"
}

variable "domain_name" {
  type        = string
  default     = "motionmesh.co.in"
  description = "Root domain name (must already exist as a Route 53 hosted zone)"
}

variable "api_domain" {
  type        = string
  default     = "api.motionmesh.co.in"
  description = "Subdomain for the API"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "azs" {
  type    = list(string)
  default = ["ap-south-1a", "ap-south-1b"]
}

# ─── Database ─────────────────────────────────────────────────────────────────

variable "db_name" {
  type    = string
  default = "motionmesh"
}

variable "db_username" {
  type      = string
  sensitive = true
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "aurora_instance_class" {
  type    = string
  default = "db.t4g.medium"
}

# ─── Redis ────────────────────────────────────────────────────────────────────

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.small"
}

# ─── Application secrets ──────────────────────────────────────────────────────

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "clerk_publishable_key" {
  type      = string
  sensitive = true
}

variable "clerk_secret_key" {
  type      = string
  sensitive = true
}

variable "clerk_jwks_url" {
  type = string
}

variable "stripe_secret_key" {
  type      = string
  sensitive = true
}

variable "stripe_webhook_secret" {
  type      = string
  sensitive = true
}

variable "huggingface_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

# ─── Repository ──────────────────────────────────────────────────────────────

variable "github_repository" {
  type    = string
  default = "https://github.com/sanjeev0303/motionmesh.git"
}

variable "github_branch" {
  type    = string
  default = "main"
}

# ─── EC2 instance types ──────────────────────────────────────────────────────

variable "api_instance_type" {
  type    = string
  default = "t2.micro"
}

variable "worker_instance_type" {
  type    = string
  default = "t3.medium"
  description = "Workers need more CPU/RAM for FFmpeg transcoding"
}

variable "worker_count" {
  type        = number
  default     = 1
  description = "Number of worker instances (scale out without redesigning infra)"
}

variable "dashboard_instance_type" {
  type    = string
  default = "t2.micro"
}

variable "nats_instance_type" {
  type    = string
  default = "t2.micro"
}

variable "captions_instance_type" {
  type        = string
  default     = "t3.medium"
  description = "Captions needs ~4 GB RAM for faster-whisper model"
}

# ─── EC2 key pair ─────────────────────────────────────────────────────────────

variable "key_name" {
  type        = string
  default     = ""
  description = "EC2 key pair for SSH access. Leave empty to use SSM Session Manager only."
}
