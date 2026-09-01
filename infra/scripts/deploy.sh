#!/bin/bash
set -e

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Starting MotionMesh AWS Deployment...${NC}"

# Ensure we are in the right directory relative to the repository root
cd "$(dirname "$0")/../terraform/production"

# Check if terraform.tfvars exists
if [ ! -f terraform.tfvars ]; then
  echo -e "${RED}Error: terraform.tfvars is missing!${NC}"
  echo "Please copy infra/terraform/production/terraform.tfvars.example to terraform.tfvars and populate your secrets."
  exit 1
fi

echo -e "${YELLOW}1. Initializing Terraform Backend...${NC}"
terraform init

echo -e "${YELLOW}2. Validating Terraform Configuration...${NC}"
terraform validate

echo -e "${YELLOW}3. Applying Terraform Configuration...${NC}"
# Remove -auto-approve if you prefer to manually review the plan first
terraform apply -auto-approve

echo -e "${GREEN}Deployment completed successfully!${NC}"

echo -e "${YELLOW}Deployment Outputs:${NC}"
terraform output
