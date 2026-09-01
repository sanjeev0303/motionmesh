output "alb_sg_id" {
  value = aws_security_group.alb.id
}

output "api_sg_id" {
  value = aws_security_group.api.id
}

output "dashboard_sg_id" {
  value = aws_security_group.dashboard.id
}

output "worker_sg_id" {
  value = aws_security_group.worker.id
}

output "nats_sg_id" {
  value = aws_security_group.nats.id
}

output "captions_sg_id" {
  value = aws_security_group.captions.id
}

output "aurora_sg_id" {
  value = aws_security_group.aurora.id
}

output "redis_sg_id" {
  value = aws_security_group.redis.id
}
