terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  #   For real production, use an s3 backend.
  backend "s3" {
    bucket       = "motionmesh-terraform-state-196936049283"
    key          = "production/terraform.tfstate"
    region       = "ap-south-1"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "motionmesh"
      Environment = "production"
      ManageBy    = "terraform"
    }
  }
}
