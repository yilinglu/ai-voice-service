#!/bin/bash

# Enhanced Docker Build and Push Script for Plutus Voice Agent
# Uses proper versioning for CI/CD rollback capabilities

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

# Function to check Docker
check_docker() {
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi

    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    print_success "Docker is available"
}

# Function to get AWS account ID
get_aws_account_id() {
    aws sts get-caller-identity --query Account --output text
}

# Function to get AWS region
get_aws_region() {
    aws configure get region || echo "us-east-1"
}

# Function to login to ECR
login_to_ecr() {
    local region="$1"
    print_status "Logging in to ECR in region: $region"
    
    aws ecr get-login-password --region "$region" | docker login --username AWS --password-stdin "$(get_aws_account_id).dkr.ecr.$region.amazonaws.com"
    
    print_success "Successfully logged in to ECR"
}

# Function to ensure ECR repository exists
ensure_ecr_repository() {
    local repository_name="$1"
    local region="$2"
    
    print_status "Ensuring ECR repository exists: $repository_name"
    
    if ! aws ecr describe-repositories --repository-names "$repository_name" --region "$region" >/dev/null 2>&1; then
        print_status "Creating ECR repository: $repository_name"
        aws ecr create-repository --repository-name "$repository_name" --region "$region"
        print_success "Created ECR repository: $repository_name"
    else
        print_status "ECR repository already exists: $repository_name"
    fi
}

# Function to build Docker image
build_docker_image() {
    local context_path="$1"
    local image_name="$2"
    local primary_tag="$3"
    local tags_file="$4"
    
    print_status "Building Docker image: $image_name"
    print_status "Context path: $context_path"
    print_status "Primary tag: $primary_tag"
    
    # Read all tags from the tags file
    local tags=()
    while IFS= read -r tag; do
        [[ -n "$tag" ]] && tags+=("$tag")
    done < "$tags_file"
    
    # Build the image with the primary tag first (specify platform for ECS Fargate compatibility)
    print_status "Building with primary tag: $primary_tag"
    print_status "Building for platform: linux/amd64 (ECS Fargate compatibility)"
    docker build --platform linux/amd64 -t "$image_name:$primary_tag" "$context_path"
    
    # Tag with additional tags
    for tag in "${tags[@]}"; do
        if [[ "$tag" != "$primary_tag" ]]; then
            print_status "Adding tag: $tag"
            docker tag "$image_name:$primary_tag" "$image_name:$tag"
        fi
    done
    
    print_success "Docker image built successfully with tags:"
    for tag in "${tags[@]}"; do
        echo "  - $image_name:$tag"
    done
}

# Function to push Docker images
push_docker_images() {
    local image_name="$1"
    local tags_file="$2"
    
    print_status "Pushing Docker images to ECR"
    
    # Read all tags from the tags file
    local tags=()
    while IFS= read -r tag; do
        [[ -n "$tag" ]] && tags+=("$tag")
    done < "$tags_file"
    
    # Push all tags
    for tag in "${tags[@]}"; do
        print_status "Pushing tag: $tag"
        docker push "$image_name:$tag"
        print_success "Pushed: $image_name:$tag"
    done
    
    print_success "All Docker images pushed successfully"
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

# Function to show build information
show_build_info() {
    local image_name="$1"
    local primary_tag="$2"
    local tags_file="$3"
    
    print_status "Build Information:"
    echo "  Image: $image_name"
    echo "  Primary Tag: $primary_tag"
    echo "  All Tags:"
    
    while IFS= read -r tag; do
        [[ -n "$tag" ]] && echo "    - $tag"
    done < "$tags_file"
    
    echo ""
    print_status "Rollback Information:"
    echo "  Version-based rollback: $image_name:v1.0.0"
    echo "  Commit-based rollback: $image_name:commit-d9b6f36"
    echo "  Build-based rollback: $image_name:build-1750995995"
    echo "  Timestamp-based rollback: $image_name:timestamp-20250627-034635"
}

# Function to show usage
usage() {
    echo "Usage: $0 [environment] [options]"
    echo ""
    echo "Arguments:"
    echo "  environment      Deployment environment (dev|staging|prod)"
    echo ""
    echo "Options:"
    echo "  --skip-build     Skip Docker build (only push existing images)"
    echo "  --skip-push      Skip Docker push (only build images)"
    echo "  --context-path   Docker build context path (default: ../../plutus)"
    echo "  --repository     ECR repository name (default: plutus-server)"
    echo ""
    echo "Examples:"
    echo "  $0 dev"
    echo "  $0 staging --skip-push"
    echo "  $0 prod --context-path ../../plutus"
}

# Main script
main() {
    local environment=""
    local skip_build=false
    local skip_push=false
    local context_path="../../plutus"
    local repository_name="plutus-server"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            dev|staging|prod)
                environment="$1"
                shift
                ;;
            --skip-build)
                skip_build=true
                shift
                ;;
            --skip-push)
                skip_push=true
                shift
                ;;
            --context-path)
                context_path="$2"
                shift 2
                ;;
            --repository)
                repository_name="$2"
                shift 2
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Validate environment
    if [[ -z "$environment" ]]; then
        print_error "Environment is required"
        usage
        exit 1
    fi
    
    validate_environment "$environment"
    
    print_status "Starting Docker build and push for environment: $environment"
    
    # Check prerequisites
    check_aws_config
    check_docker
    
    # Get AWS information
    local account_id=$(get_aws_account_id)
    local region=$(get_aws_region)
    
    print_status "AWS Account ID: $account_id"
    print_status "AWS Region: $region"
    
    # Generate image tags
    print_status "Generating image tags..."
    local primary_tag=$(./scripts/generate-image-tag.sh "$environment" | tail -n 1)
    local tags_file=".image-tags"
    
    # Construct full image name
    local image_name="$account_id.dkr.ecr.$region.amazonaws.com/$repository_name"
    
    print_status "Full image name: $image_name"
    
    # Ensure ECR repository exists
    ensure_ecr_repository "$repository_name" "$region"
    
    # Login to ECR
    login_to_ecr "$region"
    
    # Build Docker image (if not skipped)
    if [[ "$skip_build" == false ]]; then
        build_docker_image "$context_path" "$image_name" "$primary_tag" "$tags_file"
    else
        print_warning "Skipping Docker build"
    fi
    
    # Push Docker images (if not skipped)
    if [[ "$skip_push" == false ]]; then
        push_docker_images "$image_name" "$tags_file"
    else
        print_warning "Skipping Docker push"
    fi
    
    # Show build information
    show_build_info "$image_name" "$primary_tag" "$tags_file"
    
    print_success "Docker build and push completed successfully!"
    print_success "Primary image: $image_name:$primary_tag"
    
    # Output for CI/CD systems
    echo "::set-output name=image_name::$image_name"
    echo "::set-output name=primary_tag::$primary_tag"
    echo "::set-output name=tags_file::$tags_file"
    
    exit 0
}

# Run main function
main "$@" 