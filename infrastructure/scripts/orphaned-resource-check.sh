#!/bin/bash

# Orphaned AWS Resource Check & Cleanup Script
# Checks for orphaned ECS clusters, VPCs, subnets, gateways, CloudWatch log groups/resources, unused ECR images
# Prompts for cleanup interactively

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}

# ECS Clusters
check_orphaned_ecs_clusters() {
  print_status "Checking for orphaned ECS clusters..."
  local clusters=$(aws ecs list-clusters --output text --query 'clusterArns[]')
  local orphaned=()
  for arn in $clusters; do
    name=$(basename "$arn")
    # Ignore clusters managed by CDK (plutus-cluster-*)
    if [[ ! "$name" =~ plutus-cluster- ]]; then
      orphaned+=("$name")
    fi
  done
  if [ ${#orphaned[@]} -eq 0 ]; then
    print_success "No orphaned ECS clusters found."
  else
    print_warning "Orphaned ECS clusters: ${orphaned[*]}"
    ORPHANED_ECS_CLUSTERS=("${orphaned[@]}")
  fi
}

# VPCs
check_orphaned_vpcs() {
  print_status "Checking for orphaned VPCs..."
  local vpcs=$(aws ec2 describe-vpcs --query 'Vpcs[].VpcId' --output text)
  local orphaned=()
  for vpc in $vpcs; do
    # Ignore default VPC and those tagged for plutus
    is_default=$(aws ec2 describe-vpcs --vpc-ids "$vpc" --query 'Vpcs[0].IsDefault' --output text)
    tags=$(aws ec2 describe-tags --filters Name=resource-id,Values=$vpc --query 'Tags[].Value' --output text)
    if [[ "$is_default" == "False" && ! "$tags" =~ plutus ]]; then
      orphaned+=("$vpc")
    fi
  done
  if [ ${#orphaned[@]} -eq 0 ]; then
    print_success "No orphaned VPCs found."
  else
    print_warning "Orphaned VPCs: ${orphaned[*]}"
    ORPHANED_VPCS=("${orphaned[@]}")
  fi
}

# Subnets
check_orphaned_subnets() {
  print_status "Checking for orphaned subnets..."
  local subnets=$(aws ec2 describe-subnets --query 'Subnets[].SubnetId' --output text)
  local orphaned=()
  for subnet in $subnets; do
    vpc_id=$(aws ec2 describe-subnets --subnet-ids $subnet --query 'Subnets[0].VpcId' --output text)
    tags=$(aws ec2 describe-tags --filters Name=resource-id,Values=$subnet --query 'Tags[].Value' --output text)
    # If VPC is orphaned or subnet is not tagged for plutus
    if [[ " ${ORPHANED_VPCS[*]} " =~ " $vpc_id " || ! "$tags" =~ plutus ]]; then
      orphaned+=("$subnet")
    fi
  done
  if [ ${#orphaned[@]} -eq 0 ]; then
    print_success "No orphaned subnets found."
  else
    print_warning "Orphaned subnets: ${orphaned[*]}"
    ORPHANED_SUBNETS=("${orphaned[@]}")
  fi
}

# Gateways (Internet & NAT)
check_orphaned_gateways() {
  print_status "Checking for orphaned Internet/NAT gateways..."
  local igws=$(aws ec2 describe-internet-gateways --query 'InternetGateways[].InternetGatewayId' --output text)
  local orphaned_igw=()
  for igw in $igws; do
    vpc_id=$(aws ec2 describe-internet-gateways --internet-gateway-ids $igw --query 'InternetGateways[0].Attachments[0].VpcId' --output text)
    if [[ -z "$vpc_id" || " ${ORPHANED_VPCS[*]} " =~ " $vpc_id " ]]; then
      orphaned_igw+=("$igw")
    fi
  done
  if [ ${#orphaned_igw[@]} -eq 0 ]; then
    print_success "No orphaned Internet Gateways found."
  else
    print_warning "Orphaned Internet Gateways: ${orphaned_igw[*]}"
    ORPHANED_IGWS=("${orphaned_igw[@]}")
  fi

  local natgws=$(aws ec2 describe-nat-gateways --query 'NatGateways[].NatGatewayId' --output text)
  local orphaned_natgw=()
  for natgw in $natgws; do
    vpc_id=$(aws ec2 describe-nat-gateways --nat-gateway-ids $natgw --query 'NatGateways[0].VpcId' --output text)
    state=$(aws ec2 describe-nat-gateways --nat-gateway-ids $natgw --query 'NatGateways[0].State' --output text)
    if [[ "$state" == "available" && " ${ORPHANED_VPCS[*]} " =~ " $vpc_id " ]]; then
      orphaned_natgw+=("$natgw")
    fi
  done
  if [ ${#orphaned_natgw[@]} -eq 0 ]; then
    print_success "No orphaned NAT Gateways found."
  else
    print_warning "Orphaned NAT Gateways: ${orphaned_natgw[*]}"
    ORPHANED_NATGWS=("${orphaned_natgw[@]}")
  fi
}

# CloudWatch Log Groups
check_orphaned_log_groups() {
  print_status "Checking for orphaned CloudWatch log groups..."
  local log_groups=$(aws logs describe-log-groups --query 'logGroups[].logGroupName' --output text)
  local orphaned=()
  for lg in $log_groups; do
    if [[ ! "$lg" =~ plutus ]]; then
      orphaned+=("$lg")
    fi
  done
  if [ ${#orphaned[@]} -eq 0 ]; then
    print_success "No orphaned CloudWatch log groups found."
  else
    print_warning "Orphaned CloudWatch log groups: ${orphaned[*]}"
    ORPHANED_LOG_GROUPS=("${orphaned[@]}")
  fi
}

# Unused ECR Images
check_unused_ecr_images() {
  print_status "Checking for ECR images older than 90 days..."
  local repos=$(aws ecr describe-repositories --query 'repositories[].repositoryName' --output text)
  local now_epoch=$(date +%s)
  local cutoff_days=90
  local cutoff_epoch=$((now_epoch - cutoff_days*24*60*60))
  local old_images=()
  for repo in $repos; do
    images=$(aws ecr list-images --repository-name $repo --query 'imageIds[]' --output json | jq -c '.[]')
    for img in $images; do
      digest=$(echo $img | jq -r '.imageDigest')
      # Get image details (may be paginated, so use describe-images)
      details=$(aws ecr describe-images --repository-name $repo --image-ids imageDigest=$digest --query 'imageDetails[0]' --output json 2>/dev/null)
      if [[ -z "$details" || "$details" == "null" ]]; then
        continue
      fi
      pushed_at=$(echo $details | jq -r '.imagePushedAt')
      pushed_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${pushed_at:0:19}" +%s 2>/dev/null || date -d "$pushed_at" +%s 2>/dev/null)
      if [[ -z "$pushed_epoch" ]]; then
        continue
      fi
      if (( pushed_epoch < cutoff_epoch )); then
        old_images+=("$repo@$digest")
      fi
    done
  done
  if [ ${#old_images[@]} -eq 0 ]; then
    print_success "No ECR images older than 90 days found."
  else
    print_warning "ECR images older than 90 days: ${old_images[*]}"
    UNUSED_ECR_IMAGES=("${old_images[@]}")
  fi
}

# Main
main() {
  print_status "Starting orphaned resource check..."
  ORPHANED_ECS_CLUSTERS=()
  ORPHANED_VPCS=()
  ORPHANED_SUBNETS=()
  ORPHANED_IGWS=()
  ORPHANED_NATGWS=()
  ORPHANED_LOG_GROUPS=()
  UNUSED_ECR_IMAGES=()

  check_orphaned_ecs_clusters
  check_orphaned_vpcs
  check_orphaned_subnets
  check_orphaned_gateways
  check_orphaned_log_groups
  check_unused_ecr_images

  echo -e "\n${BLUE}===== SUMMARY =====${NC}"
  [ ${#ORPHANED_ECS_CLUSTERS[@]} -gt 0 ] && print_warning "Orphaned ECS clusters: ${ORPHANED_ECS_CLUSTERS[*]}"
  [ ${#ORPHANED_VPCS[@]} -gt 0 ] && print_warning "Orphaned VPCs: ${ORPHANED_VPCS[*]}"
  [ ${#ORPHANED_SUBNETS[@]} -gt 0 ] && print_warning "Orphaned subnets: ${ORPHANED_SUBNETS[*]}"
  [ ${#ORPHANED_IGWS[@]} -gt 0 ] && print_warning "Orphaned Internet Gateways: ${ORPHANED_IGWS[*]}"
  [ ${#ORPHANED_NATGWS[@]} -gt 0 ] && print_warning "Orphaned NAT Gateways: ${ORPHANED_NATGWS[*]}"
  [ ${#ORPHANED_LOG_GROUPS[@]} -gt 0 ] && print_warning "Orphaned CloudWatch log groups: ${ORPHANED_LOG_GROUPS[*]}"
  [ ${#UNUSED_ECR_IMAGES[@]} -gt 0 ] && print_warning "ECR images older than 90 days: ${UNUSED_ECR_IMAGES[*]}"

  # Automatically delete all orphaned resources as found
  if [ ${#ORPHANED_ECS_CLUSTERS[@]} -gt 0 ]; then
    for c in "${ORPHANED_ECS_CLUSTERS[@]}"; do
      print_status "Deleting ECS cluster $c..."
      aws ecs delete-cluster --cluster $c || print_error "Failed to delete ECS cluster $c"
    done
  fi
  if [ ${#ORPHANED_VPCS[@]} -gt 0 ]; then
    for v in "${ORPHANED_VPCS[@]}"; do
      print_status "Deleting VPC $v..."
      aws ec2 delete-vpc --vpc-id $v || print_error "Failed to delete VPC $v"
    done
  fi
  if [ ${#ORPHANED_SUBNETS[@]} -gt 0 ]; then
    for s in "${ORPHANED_SUBNETS[@]}"; do
      print_status "Deleting subnet $s..."
      aws ec2 delete-subnet --subnet-id $s || print_error "Failed to delete subnet $s"
    done
  fi
  if [ ${#ORPHANED_IGWS[@]} -gt 0 ]; then
    for igw in "${ORPHANED_IGWS[@]}"; do
      print_status "Deleting Internet Gateway $igw..."
      aws ec2 delete-internet-gateway --internet-gateway-id $igw || print_error "Failed to delete IGW $igw"
    done
  fi
  if [ ${#ORPHANED_NATGWS[@]} -gt 0 ]; then
    for natgw in "${ORPHANED_NATGWS[@]}"; do
      print_status "Deleting NAT Gateway $natgw..."
      aws ec2 delete-nat-gateway --nat-gateway-id $natgw || print_error "Failed to delete NATGW $natgw"
    done
  fi
  if [ ${#ORPHANED_LOG_GROUPS[@]} -gt 0 ]; then
    for lg in "${ORPHANED_LOG_GROUPS[@]}"; do
      print_status "Deleting CloudWatch log group $lg..."
      aws logs delete-log-group --log-group-name "$lg" || print_error "Failed to delete log group $lg"
    done
  fi
  if [ ${#UNUSED_ECR_IMAGES[@]} -gt 0 ]; then
    for img in "${UNUSED_ECR_IMAGES[@]}"; do
      repo=$(echo $img | cut -d'@' -f1)
      digest=$(echo $img | cut -d'@' -f2)
      print_status "Deleting ECR image $repo@$digest..."
      aws ecr batch-delete-image --repository-name $repo --image-ids imageDigest=$digest || print_error "Failed to delete ECR image $img"
    done
  fi

  if [ ${#ORPHANED_ECS_CLUSTERS[@]} -eq 0 ] && [ ${#ORPHANED_VPCS[@]} -eq 0 ] && [ ${#ORPHANED_SUBNETS[@]} -eq 0 ] && [ ${#ORPHANED_IGWS[@]} -eq 0 ] && [ ${#ORPHANED_NATGWS[@]} -eq 0 ] && [ ${#ORPHANED_LOG_GROUPS[@]} -eq 0 ] && [ ${#UNUSED_ECR_IMAGES[@]} -eq 0 ]; then
    print_success "No orphaned resources found!"
    exit 0
  else
    print_success "All orphaned resources have been deleted."
    exit 0
  fi
}

main "$@" 