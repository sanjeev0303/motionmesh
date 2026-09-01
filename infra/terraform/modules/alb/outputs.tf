output "alb_arn" {
  value = aws_lb.this.arn
}

output "alb_dns_name" {
  description = "DNS name of the ALB (use as alias target in Route 53)"
  value       = aws_lb.this.dns_name
}

output "alb_zone_id" {
  description = "Hosted zone ID of the ALB (required for Route 53 alias records)"
  value       = aws_lb.this.zone_id
}

output "api_target_group_arn" {
  value = aws_lb_target_group.api.arn
}

output "dashboard_target_group_arn" {
  value = aws_lb_target_group.dashboard.arn
}
