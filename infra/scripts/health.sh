#!/bin/bash
# A script to check the health of deployed MotionMesh AWS services

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Running MotionMesh AWS Infrastructure Health Check...${NC}"
echo "------------------------------------------------------------"

# 1. Check Public Endpoints (ALB & Route 53)
API_URL="https://api.motionmesh.co.in/health"
DASHBOARD_URL="https://motionmesh.co.in"

echo -n "1. Checking API Endpoint ($API_URL)... "
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" || echo "failed")
if [ "$API_STATUS" -eq 200 ] 2>/dev/null; then
  echo -e "${GREEN}✅ PASSED (Status: 200)${NC}"
else
  echo -e "${RED}❌ FAILED (Status: $API_STATUS)${NC}"
  if command -v aws >/dev/null 2>&1; then
    echo -e "   ${YELLOW}Querying ALB Target Group Health for API...${NC}"
    API_TG_ARN=$(aws elbv2 describe-target-groups --names "motionmesh-prod-api-tg" --query "TargetGroups[0].TargetGroupArn" --output text 2>/dev/null || true)
    if [ -n "$API_TG_ARN" ]; then
      aws elbv2 describe-target-health --target-group-arn "$API_TG_ARN" --query "TargetHealthDescriptions[*].[Target.Id,TargetHealth.State,TargetHealth.Reason,TargetHealth.Description]" --output table
    fi
  fi
fi

echo -n "2. Checking Dashboard Endpoint ($DASHBOARD_URL)... "
DASHBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DASHBOARD_URL" || echo "failed")
if [[ "$DASHBOARD_STATUS" =~ ^[23][0-9][0-9]$ ]] 2>/dev/null; then
  echo -e "${GREEN}✅ PASSED (Status: $DASHBOARD_STATUS)${NC}"
else
  echo -e "${RED}❌ FAILED (Status: $DASHBOARD_STATUS)${NC}"
  if command -v aws >/dev/null 2>&1; then
    echo -e "   ${YELLOW}Querying ALB Target Group Health for Dashboard...${NC}"
    DASHBOARD_TG_ARN=$(aws elbv2 describe-target-groups --names "motionmesh-prod-dashboard-tg" --query "TargetGroups[0].TargetGroupArn" --output text 2>/dev/null || true)
    if [ -n "$DASHBOARD_TG_ARN" ]; then
      aws elbv2 describe-target-health --target-group-arn "$DASHBOARD_TG_ARN" --query "TargetHealthDescriptions[*].[Target.Id,TargetHealth.State,TargetHealth.Reason,TargetHealth.Description]" --output table
    fi
  fi
fi

# 2. Check EC2 Instances Status
echo -e "\n${YELLOW}3. Checking EC2 Instances Status...${NC}"
if command -v aws >/dev/null 2>&1; then
  aws ec2 describe-instance-status \
    --filters "Name=instance-state-name,Values=running" \
    --query "InstanceStatuses[*].[InstanceId,InstanceState.Name,InstanceStatus.Status,SystemStatus.Status]" \
    --output table
else
  echo -e "${RED}aws-cli not found. Skipping EC2 checks.${NC}"
fi

# 3. Check Aurora Database Cluster Status
echo -e "\n${YELLOW}4. Checking Aurora Database Status...${NC}"
if command -v aws >/dev/null 2>&1; then
  aws rds describe-db-clusters \
    --query "DBClusters[?DatabaseName=='motionmesh'].[DBClusterIdentifier,Status]" \
    --output table
else
  echo -e "${RED}aws-cli not found. Skipping RDS checks.${NC}"
fi

# 4. Check ElastiCache Redis Status
echo -e "\n${YELLOW}5. Checking Redis Status...${NC}"
if command -v aws >/dev/null 2>&1; then
  aws elasticache describe-replication-groups \
    --query "ReplicationGroups[*].[ReplicationGroupId,Status]" \
    --output table
else
  echo -e "${RED}aws-cli not found. Skipping ElastiCache checks.${NC}"
fi

# 5. Check CloudWatch Alarms
echo -e "\n${YELLOW}6. Checking CloudWatch Alarms...${NC}"
if command -v aws >/dev/null 2>&1; then
  ALARM_COUNT=$(aws cloudwatch describe-alarms --state-value ALARM --query 'MetricAlarms[*].[AlarmName]' --output text | wc -w)
  if [ "$ALARM_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ Found $ALARM_COUNT alarms in ALARM state!${NC}"
    aws cloudwatch describe-alarms --state-value ALARM --query 'MetricAlarms[*].[AlarmName]' --output text
  else
    echo -e "${GREEN}✅ No CloudWatch alarms triggered.${NC}"
  fi
fi

echo -e "\n${GREEN}Health check complete.${NC}"
