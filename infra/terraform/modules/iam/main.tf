variable "bucket_arn" {
  type        = string
  description = "ARN of the S3 bucket EC2 instances need access to"
}

# ─── EC2 Instance Profile for S3 access ──────────────────────────────────────

resource "aws_iam_role" "ec2_s3" {
  name = "motionmesh-ec2-s3"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_policy" "s3_access" {
  name        = "motionmesh-s3-access"
  description = "Allow EC2 instances to read/write the MotionMesh S3 bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket", "s3:HeadObject", "s3:GetObjectAttributes"]
        Resource = [var.bucket_arn, "${var.bucket_arn}/*"]
      },
      {
        # Allow CreateMultipartUpload, UploadPart, CompleteMultipartUpload
        Effect   = "Allow"
        Action   = ["s3:AbortMultipartUpload", "s3:ListMultipartUploadParts"]
        Resource = "${var.bucket_arn}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "s3_access" {
  role       = aws_iam_role.ec2_s3.name
  policy_arn = aws_iam_policy.s3_access.arn
}

# SSM managed policy so you can shell into instances without a bastion
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2_s3.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# CloudWatch agent
resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.ec2_s3.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "ec2_s3" {
  name = "motionmesh-ec2-s3"
  role = aws_iam_role.ec2_s3.name
}
