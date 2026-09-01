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
  description = "Security group to attach to the cluster"
}

variable "db_name" {
  type = string
}

variable "db_username" {
  type      = string
  sensitive = true
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "instance_class" {
  type    = string
  default = "db.t4g.medium"
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-aurora"
  subnet_ids = var.private_subnets

  tags = {
    Name = "${var.name}-aurora-subnet-group"
  }
}

resource "aws_rds_cluster" "this" {
  cluster_identifier = "${var.name}-aurora"

  engine         = "aurora-postgresql"
  engine_version = "16.14"

  database_name   = var.db_name
  master_username = var.db_username
  master_password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.security_group_id]

  backup_retention_period   = 7
  preferred_backup_window   = "03:00-04:00"
  preferred_maintenance_window = "sun:05:00-sun:06:00"

  storage_encrypted = true

  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.name}-final-${formatdate("YYYYMMDDhhmmss", timestamp())}"

  deletion_protection = true

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name = "${var.name}-aurora"
  }

  lifecycle {
    ignore_changes = [final_snapshot_identifier]
  }
}

resource "aws_rds_cluster_instance" "writer" {
  identifier = "${var.name}-aurora-writer"

  cluster_identifier = aws_rds_cluster.this.id

  instance_class = var.instance_class
  engine         = aws_rds_cluster.this.engine
  engine_version = aws_rds_cluster.this.engine_version

  publicly_accessible = false

  db_subnet_group_name = aws_db_subnet_group.this.name

  performance_insights_enabled = true

  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  tags = {
    Name = "${var.name}-aurora-writer"
  }
}

# Enhanced monitoring role for RDS
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.name}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
