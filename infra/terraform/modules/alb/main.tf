variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnets" {
  type = list(string)
}

variable "security_group_id" {
  type = string
}

variable "certificate_arn" {
  type        = string
  description = "ACM certificate ARN for HTTPS"
}

variable "api_target_port" {
  type    = number
  default = 8080
}

variable "dashboard_target_port" {
  type    = number
  default = 3000
}

variable "domain_name" {
  type = string
}

variable "api_domain" {
  type = string
}

# ─── Load Balancer ────────────────────────────────────────────────────────────

resource "aws_lb" "this" {
  name               = "${var.name}-alb"
  internal           = false
  load_balancer_type = "application"

  security_groups = [var.security_group_id]
  subnets         = var.public_subnets

  enable_deletion_protection = true

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    prefix  = "alb"
    enabled = true
  }

  tags = { Name = "${var.name}-alb" }
}

# S3 bucket for ALB access logs
resource "aws_s3_bucket" "alb_logs" {
  bucket        = "${var.name}-alb-logs-${data.aws_caller_identity.current.account_id}"
  force_destroy = false

  tags = { Name = "${var.name}-alb-logs" }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "alb_logs" {
  bucket                  = aws_s3_bucket.alb_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ALB log delivery policy
resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::${local.elb_account_id}:root" }
      Action    = "s3:PutObject"
      Resource  = "${aws_s3_bucket.alb_logs.arn}/alb/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
    }]
  })
}

# ELB account IDs per region for ALB log delivery
locals {
  elb_account_ids = {
    "ap-south-1" = "718504428378"
    "us-east-1"  = "127311923021"
    "us-west-2"  = "797873946194"
    "eu-west-1"  = "156460612806"
  }
  elb_account_id = lookup(local.elb_account_ids, data.aws_region.current.name, "718504428378")
}

# ─── Target Groups ────────────────────────────────────────────────────────────

resource "aws_lb_target_group" "api" {
  name        = "${var.name}-api-tg"
  port        = var.api_target_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    path                = "/health"
    interval            = 30
    timeout             = 10
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = { Name = "${var.name}-api-tg" }
}

resource "aws_lb_target_group" "dashboard" {
  name        = "${var.name}-dashboard-tg"
  port        = var.dashboard_target_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    path                = "/"
    interval            = 30
    timeout             = 10
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200-399"
  }

  deregistration_delay = 30

  tags = { Name = "${var.name}-dashboard-tg" }
}

# ─── Listeners ────────────────────────────────────────────────────────────────

# HTTP → redirect to HTTPS
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS listener — default action: dashboard
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.dashboard.arn
  }
}

# api.motionmesh.co.in → API target group
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    host_header {
      values = [var.api_domain]
    }
  }
}
