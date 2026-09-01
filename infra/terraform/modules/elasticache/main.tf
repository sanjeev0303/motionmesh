variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnets" {
  type = list(string)
}

variable "security_group_id" {
  type        = string
  description = "Security group to attach to the replication group"
}

variable "node_type" {
  type    = string
  default = "cache.t4g.small"
}

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name}-redis"
  subnet_ids = var.private_subnets
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = replace(var.name, "_", "-")
  description          = "MotionMesh Redis/Valkey"

  engine      = "redis"
  node_type   = var.node_type
  port        = 6379

  num_cache_clusters = 2

  automatic_failover_enabled = true
  multi_az_enabled           = true

  at_rest_encryption_enabled = true
  transit_encryption_enabled = false

  subnet_group_name  = aws_elasticache_subnet_group.this.name
  security_group_ids = [var.security_group_id]

  apply_immediately = true

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }

  tags = {
    Name = "${var.name}-redis"
  }
}

resource "aws_cloudwatch_log_group" "redis" {
  name              = "/motionmesh/elasticache/redis"
  retention_in_days = 7
}
