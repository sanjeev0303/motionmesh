variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_id" {
  type        = string
  description = "Private subnet ID to place the NATS instance in"
}

variable "security_group_id" {
  type = string
}

variable "instance_profile_name" {
  type = string
}

variable "instance_type" {
  type    = string
  default = "t3.small"
}

variable "key_name" {
  type        = string
  default     = ""
  description = "EC2 key pair name (optional; use SSM Session Manager instead)"
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "nats" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id

  iam_instance_profile   = var.instance_profile_name
  vpc_security_group_ids = [var.security_group_id]

  key_name = var.key_name != "" ? var.key_name : null

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    encrypted             = true
    delete_on_termination = true
  }

  user_data_base64 = base64encode(templatefile("${path.module}/user-data.sh.tftpl", {}))

  metadata_options {
    http_tokens = "required" # IMDSv2 only
  }

  tags = {
    Name    = "${var.name}-nats"
    Service = "nats"
  }

  user_data_replace_on_change = true

  lifecycle {
    ignore_changes = [ami]
  }
}

resource "aws_cloudwatch_log_group" "nats" {
  name              = "/motionmesh/nats"
  retention_in_days = 14
}
