output "primary_endpoint" {
  description = "Primary endpoint for Redis writes"
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "reader_endpoint" {
  description = "Reader endpoint for Redis reads"
  value       = aws_elasticache_replication_group.this.reader_endpoint_address
}

output "port" {
  value = 6379
}
