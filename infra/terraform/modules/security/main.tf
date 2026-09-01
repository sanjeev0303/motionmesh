variable "vpc_id" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

# ─── ALB ─────────────────────────────────────────────────────────────────────

resource "aws_security_group" "alb" {
  name        = "motionmesh-alb"
  description = "Public-facing ALB: accept HTTP/HTTPS from Internet"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "motionmesh-alb-sg" }
}

# ─── API EC2 ─────────────────────────────────────────────────────────────────

resource "aws_security_group" "api" {
  name        = "motionmesh-api"
  description = "Go API: accept traffic from ALB only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "API port from ALB"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "motionmesh-api-sg" }
}

# ─── Dashboard EC2 ───────────────────────────────────────────────────────────

resource "aws_security_group" "dashboard" {
  name        = "motionmesh-dashboard"
  description = "Next.js dashboard: accept traffic from ALB only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Dashboard port from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "motionmesh-dashboard-sg" }
}

# ─── Worker EC2 ──────────────────────────────────────────────────────────────

resource "aws_security_group" "worker" {
  name        = "motionmesh-worker"
  description = "Go worker: no inbound from Internet"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "motionmesh-worker-sg" }
}

# ─── NATS EC2 ────────────────────────────────────────────────────────────────

resource "aws_security_group" "nats" {
  name        = "motionmesh-nats"
  description = "NATS JetStream: accept from API and worker only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "NATS from API"
    from_port       = 4222
    to_port         = 4222
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }

  ingress {
    description     = "NATS from worker"
    from_port       = 4222
    to_port         = 4222
    protocol        = "tcp"
    security_groups = [aws_security_group.worker.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "motionmesh-nats-sg" }
}

# ─── Captions Sidecar EC2 ────────────────────────────────────────────────────

resource "aws_security_group" "captions" {
  name        = "motionmesh-captions"
  description = "Captions sidecar: accept from worker only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Captions port from worker"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.worker.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "motionmesh-captions-sg" }
}

# ─── Aurora PostgreSQL ────────────────────────────────────────────────────────

resource "aws_security_group" "aurora" {
  name        = "motionmesh-aurora"
  description = "Aurora PostgreSQL: accept from API and worker only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from API"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }

  ingress {
    description     = "PostgreSQL from worker"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.worker.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "motionmesh-aurora-sg" }
}

# ─── ElastiCache Redis ────────────────────────────────────────────────────────

resource "aws_security_group" "redis" {
  name        = "motionmesh-redis"
  description = "ElastiCache Redis: accept from API and worker only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis from API"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }

  ingress {
    description     = "Redis from worker"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.worker.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "motionmesh-redis-sg" }
}
