#!/bin/bash

# Rollback Script for Plutus Voice Agent
# Allows rollback to previous deployments using various tag strategies

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check AWS CLI configuration
check_aws_config() {
    if ! command_exists aws; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi

    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi

    print_success "AWS CLI is configured"
}

# Function to get AWS account ID
get_aws_account_id() {
    aws sts get-caller-identity --query Account --output text
}

# Function to get AWS region
get_aws_region() {
    aws configure get region || echo "us-east-1"
}

# Function to list available images in ECR
list_ecr_images() {
    local repository_name="$1"
    local region="$2"
    
    print_status "Listing available images in ECR repository: $repository_name"
    
    aws ecr describe-images \
        --repository-name "$repository_name" \
        --region "$region" \
        --query 'imageDetails[*].[imageTags[0],imagePushedAt]' \
        --output table
}

# Function to get recent deployments
get_recent_deployments() {
    local repository_name="$1"
    local region="$2"
    local limit="${3:-10}"
    
    print_status "Getting recent deployments (last $limit):"
    
    aws ecr describe-images \
        --repository-name "$repository_name" \
        --region "$region" \
        --query "imageDetails[?imageTags[0]!='latest' && imageTags[0]!='latest-dev' && imageTags[0]!='latest-staging' && imageTags[0]!='latest-prod'].{Tag:imageTags[0],PushedAt:imagePushedAt}" \
        --output table \
        --max-items "$limit"
}

# Function to validate image tag exists
validate_image_tag() {
    local repository_name="$1"
    local region="$2"
    local image_tag="$3"
    
    print_status "Validating image tag exists: $image_tag"
    
    if aws ecr describe-images \
        --repository-name "$repository_name" \
        --region "$region" \
        --image-ids imageTag="$image_tag" >/dev/null 2>&1; then
        print_success "Image tag exists: $image_tag"
        return 0
    else
        print_error "Image tag does not exist: $image_tag"
        return 1
    fi
}

# Function to rollback ECS service
rollback_ecs_service() {
    local cluster_name="$1"
    local service_name="$2"
    local image_uri="$3"
    local region="$4"
    
    print_status "Rolling back ECS service: $service_name"
    print_status "New image: $image_uri"
    
    # Get current task definition
    local current_task_def=$(aws ecs describe-services \
        --cluster "$cluster_name" \
        --services "$service_name" \
        --region "$region" \
        --query 'services[0].taskDefinition' \
        --output text)
    
    print_status "Current task definition: $current_task_def"
    
    # Get task definition details
    local task_def_details=$(aws ecs describe-task-definition \
        --task-definition "$current_task_def" \
        --region "$region")
    
    # Update task definition with new image
    local new_task_def=$(echo "$task_def_details" | \
        jq --arg image "$image_uri" \
        '.taskDefinition | .containerDefinitions[0].image = $image | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)')
    
    # Register new task definition
    local new_task_def_arn=$(aws ecs register-task-definition \
        --cli-input-json "$new_task_def" \
        --region "$region" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)
    
    print_success "New task definition registered: $new_task_def_arn"
    
    # Update service with new task definition
    aws ecs update-service \
        --cluster "$cluster_name" \
        --service "$service_name" \
        --task-definition "$new_task_def_arn" \
        --region "$region"
    
    print_success "Service updated successfully"
    print_status "Rollback in progress. Check service status with:"
    print_status "aws ecs describe-services --cluster $cluster_name --services $service_name --region $region"
}

# Function to rollback by version
rollback_by_version() {
    local environment="$1"
    local version="$2"
    local repository_name="$3"
    local region="$4"
    
    local image_tag="v$version"
    local account_id=$(get_aws_account_id)
    local image_uri="$account_id.dkr.ecr.$region.amazonaws.com/$repository_name:$image_tag"
    
    print_status "Rolling back to version: $version"
    
    if validate_image_tag "$repository_name" "$region" "$image_tag"; then
        local cluster_name="plutus-cluster-$environment"
        local service_name="plutus-service-$environment"
        
        rollback_ecs_service "$cluster_name" "$service_name" "$image_uri" "$region"
    else
        print_error "Cannot rollback to version $version - image not found"
        exit 1
    fi
}

# Function to rollback by commit
rollback_by_commit() {
    local environment="$1"
    local commit="$2"
    local repository_name="$3"
    local region="$4"
    
    local image_tag="commit-$commit"
    local account_id=$(get_aws_account_id)
    local image_uri="$account_id.dkr.ecr.$region.amazonaws.com/$repository_name:$image_tag"
    
    print_status "Rolling back to commit: $commit"
    
    if validate_image_tag "$repository_name" "$region" "$image_tag"; then
        local cluster_name="plutus-cluster-$environment"
        local service_name="plutus-service-$environment"
        
        rollback_ecs_service "$cluster_name" "$service_name" "$image_uri" "$region"
    else
        print_error "Cannot rollback to commit $commit - image not found"
        exit 1
    fi
}

# Function to rollback by build number
rollback_by_build() {
    local environment="$1"
    local build_number="$2"
    local repository_name="$3"
    local region="$4"
    
    local image_tag="build-$build_number"
    local account_id=$(get_aws_account_id)
    local image_uri="$account_id.dkr.ecr.$region.amazonaws.com/$repository_name:$image_tag"
    
    print_status "Rolling back to build: $build_number"
    
    if validate_image_tag "$repository_name" "$region" "$image_tag"; then
        local cluster_name="plutus-cluster-$environment"
        local service_name="plutus-service-$environment"
        
        rollback_ecs_service "$cluster_name" "$service_name" "$image_uri" "$region"
    else
        print_error "Cannot rollback to build $build_number - image not found"
        exit 1
    fi
}

# Function to rollback by timestamp
rollback_by_timestamp() {
    local environment="$1"
    local timestamp="$2"
    local repository_name="$3"
    local region="$4"
    
    local image_tag="timestamp-$timestamp"
    local account_id=$(get_aws_account_id)
    local image_uri="$account_id.dkr.ecr.$region.amazonaws.com/$repository_name:$image_tag"
    
    print_status "Rolling back to timestamp: $timestamp"
    
    if validate_image_tag "$repository_name" "$region" "$image_tag"; then
        local cluster_name="plutus-cluster-$environment"
        local service_name="plutus-service-$environment"
        
        rollback_ecs_service "$cluster_name" "$service_name" "$image_uri" "$region"
    else
        print_error "Cannot rollback to timestamp $timestamp - image not found"
        exit 1
    fi
}

# Function to rollback to latest environment tag
rollback_to_latest() {
    local environment="$1"
    local repository_name="$2"
    local region="$3"
    
    local image_tag="latest-$environment"
    local account_id=$(get_aws_account_id)
    local image_uri="$account_id.dkr.ecr.$region.amazonaws.com/$repository_name:$image_tag"
    
    print_status "Rolling back to latest $environment tag"
    
    if validate_image_tag "$repository_name" "$region" "$image_tag"; then
        local cluster_name="plutus-cluster-$environment"
        local service_name="plutus-service-$environment"
        
        rollback_ecs_service "$cluster_name" "$service_name" "$image_uri" "$region"
    else
        print_error "Cannot rollback to latest $environment - image not found"
        exit 1
    fi
}

# Function to validate environment
validate_environment() {
    local env="$1"
    case $env in
        dev|staging|prod)
            return 0
            ;;
        *)
            print_error "Invalid environment: $env. Must be one of: dev, staging, prod"
            exit 1
            ;;
    esac
}

# Function to show usage
usage() {
    echo "Usage: $0 [environment] [rollback_type] [value]"
    echo ""
    echo "Arguments:"
    echo "  environment      Deployment environment (dev|staging|prod)"
    echo "  rollback_type    Type of rollback (version|commit|build|timestamp|latest)"
    echo "  value           Value for rollback (version number, commit hash, build number, timestamp)"
    echo ""
    echo "Rollback Types:"
    echo "  version         Rollback to specific version (e.g., 1.0.0)"
    echo "  commit          Rollback to specific commit (e.g., d9b6f36)"
    echo "  build           Rollback to specific build number (e.g., 1750995995)"
    echo "  timestamp       Rollback to specific timestamp (e.g., 20250627-034635)"
    echo "  latest          Rollback to latest environment tag"
    echo ""
    echo "Examples:"
    echo "  $0 dev version 1.0.0"
    echo "  $0 staging commit d9b6f36"
    echo "  $0 prod build 1750995995"
    echo "  $0 dev latest"
    echo ""
    echo "Additional Commands:"
    echo "  $0 dev list                    # List available images"
    echo "  $0 dev recent                  # Show recent deployments"
}

# Main script
main() {
    local environment="$1"
    local rollback_type="$2"
    local value="$3"
    local repository_name="plutus-server"
    
    # Check if help is requested
    if [[ "$1" == "-h" || "$1" == "--help" ]]; then
        usage
        exit 0
    fi
    
    # Validate environment
    if [[ -z "$environment" ]]; then
        print_error "Environment is required"
        usage
        exit 1
    fi
    
    validate_environment "$environment"
    
    # Get AWS information
    local region=$(get_aws_region)
    
    print_status "Starting rollback for environment: $environment"
    print_status "AWS Region: $region"
    
    # Check AWS CLI
    check_aws_config
    
    # Handle special commands
    if [[ "$rollback_type" == "list" ]]; then
        list_ecr_images "$repository_name" "$region"
        exit 0
    fi
    
    if [[ "$rollback_type" == "recent" ]]; then
        get_recent_deployments "$repository_name" "$region"
        exit 0
    fi
    
    # Validate rollback type
    if [[ -z "$rollback_type" ]]; then
        print_error "Rollback type is required"
        usage
        exit 1
    fi
    
    # Perform rollback based on type
    case $rollback_type in
        version)
            if [[ -z "$value" ]]; then
                print_error "Version value is required"
                usage
                exit 1
            fi
            rollback_by_version "$environment" "$value" "$repository_name" "$region"
            ;;
        commit)
            if [[ -z "$value" ]]; then
                print_error "Commit value is required"
                usage
                exit 1
            fi
            rollback_by_commit "$environment" "$value" "$repository_name" "$region"
            ;;
        build)
            if [[ -z "$value" ]]; then
                print_error "Build number value is required"
                usage
                exit 1
            fi
            rollback_by_build "$environment" "$value" "$repository_name" "$region"
            ;;
        timestamp)
            if [[ -z "$value" ]]; then
                print_error "Timestamp value is required"
                usage
                exit 1
            fi
            rollback_by_timestamp "$environment" "$value" "$repository_name" "$region"
            ;;
        latest)
            rollback_to_latest "$environment" "$repository_name" "$region"
            ;;
        *)
            print_error "Invalid rollback type: $rollback_type"
            usage
            exit 1
            ;;
    esac
    
    print_success "Rollback completed successfully!"
    print_status "Monitor the rollback with:"
    print_status "aws ecs describe-services --cluster plutus-cluster-$environment --services plutus-service-$environment --region $region"
}

# Run main function
main "$@" 