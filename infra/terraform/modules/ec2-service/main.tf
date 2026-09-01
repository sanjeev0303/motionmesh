variable "name" {
  type        = string
  description = "Service name, e.g. 'api', 'worker', 'dashboard', 'captions'"
}

variable "subnet_id" {
  type        = string
  description = "Private subnet ID to place the instance in"
}

variable "security_group_ids" {
  type        = list(string)
  description = "Security group IDs to attach"
}

variable "instance_profile_name" {
  type = string
}

variable "instance_type" {
  type    = string
  default = "t3.medium"
}

variable "key_name" {
  type    = string
  default = ""
}

variable "root_volume_size" {
  type    = number
  default = 30
}

variable "user_data" {
  type        = string
  description = "Base64-encoded user data script"
}

variable "target_group_arn" {
  type        = string
  default     = ""
  description = "Optional ALB target group ARN to register this instance with"
}

variable "attach_to_alb" {
  type        = bool
  default     = false
  description = "Whether to attach instances to the ALB target group"
}

variable "instance_count" {
  type        = number
  default     = 1
  description = "Number of instances to launch (for worker scaling)"
}

# ─── AMI ─────────────────────────────────────────────────────────────────────

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

# ─── EC2 Instances ────────────────────────────────────────────────────────────

resource "aws_instance" "this" {
  count = var.instance_count

  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id

  iam_instance_profile   = var.instance_profile_name
  vpc_security_group_ids = var.security_group_ids

  key_name = var.key_name != "" ? var.key_name : null

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size
    encrypted             = true
    delete_on_termination = true
  }

  user_data_base64 = var.user_data

  metadata_options {
    http_tokens = "required" # IMDSv2 only
  }

  tags = {
    Name    = "${var.name}-${count.index + 1}"
    Service = var.name
  }

  user_data_replace_on_change = true

  lifecycle {
    ignore_changes = [ami]
  }
}

# ─── ALB Registration ─────────────────────────────────────────────────────────

resource "aws_lb_target_group_attachment" "this" {
  count = var.attach_to_alb ? var.instance_count : 0

  target_group_arn = var.target_group_arn
  target_id        = aws_instance.this[count.index].id
}
