output "instance_profile_name" {
  value = aws_iam_instance_profile.ec2_s3.name
}

output "instance_profile_arn" {
  value = aws_iam_instance_profile.ec2_s3.arn
}

output "role_arn" {
  value = aws_iam_role.ec2_s3.arn
}
