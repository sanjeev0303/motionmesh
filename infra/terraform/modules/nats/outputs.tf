output "private_ip" {
  description = "Private IP of the NATS instance (use for NATS URL construction)"
  value       = aws_instance.nats.private_ip
}

output "instance_id" {
  value = aws_instance.nats.id
}
