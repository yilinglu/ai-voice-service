#!/bin/bash

# Application Infrastructure Deployment Script
# This script deploys the Plutus application infrastructure (ECS, ALB, etc.)
# It imports domain resources from the domain infrastructure stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "AWS CLI is configured"
    
    # Check CDK
    if ! command -v cdk &> /dev/null; then
        print_error "AWS CDK is not installed. Please install it first: npm install -g aws-cdk"
        exit 1
    fi
    
    print_success "AWS CDK is installed"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    print_success "Docker is running"
}

# Check domain infrastructure
check_domain_infrastructure() {
    local domain_name=$1
    local subdomain=$2
    
    if [[ -z "$subdomain" ]]; then
        print_status "No subdomain specified (dev environment), skipping domain check"
        return 0
    fi
    
    print_status "Checking domain infrastructure for $domain_name ($subdomain)..."
    
    # Check if domain infrastructure stack exists
    local stack_name="PlutusDomainInfrastructure"
    if ! aws cloudformation describe-stacks --stack-name "$stack_name" &> /dev/null; then
        print_error "Domain infrastructure stack not found. Please run './scripts/deploy-domain.sh' first."
        exit 1
    fi
    
    print_success "Domain infrastructure stack found"
    
    # Get hosted zone ID for the subdomain
    local export_name="plutus-hosted-zone-id-$subdomain"
    local hosted_zone_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query "Stacks[0].Outputs[?ExportName=='$export_name'].OutputValue" \
        --output text)
    
    if [[ -z "$hosted_zone_id" || "$hosted_zone_id" == "None" ]]; then
        print_error "Could not retrieve hosted zone ID for $subdomain from domain infrastructure stack."
        exit 1
    fi
    
    print_success "Hosted zone ID for $subdomain: $hosted_zone_id"
}

# Build and push Docker image
build_and_push_image() {
    local environment=$1
    
    print_status "Building and pushing Docker image..."
    ./scripts/build-and-push-image.sh "$environment"
    
    # Check if image tag was generated
    if [[ ! -f ".image-tag" ]]; then
        print_error "Failed to generate image tag. Please check the build script output."
        exit 1
    fi
    
    local image_tag=$(cat ".image-tag")
    print_success "Docker image built and pushed with tag: $image_tag"
}

# Deploy application infrastructure
deploy_application_infrastructure() {
    local environment=$1
    local domain_name=$2
    local subdomain=$3
    
    print_status "Deploying application infrastructure..."
    print_status "Environment: $environment"
    print_status "Domain: $domain_name"
    print_status "Subdomain: $subdomain"
    
    # Deploy application infrastructure
    print_status "Running CDK deploy for application infrastructure..."
    
    npx cdk deploy PlutusInfrastructureStack-${environment} \
        --context environment="$environment" \
        --context domainName="$domain_name" \
        --context subdomain="$subdomain" \
        --require-approval never
    
    print_success "Application infrastructure deployed successfully!"
}

# Main script
main() {
    local environment=${1:-"staging"}
    local domain_name=${2:-"dragon0.com"}
    
    # Validate environment
    if [[ ! "$environment" =~ ^(dev|staging|prod)$ ]]; then
        print_error "Environment must be 'dev', 'staging', or 'prod'"
        exit 1
    fi
    
    # Set subdomain based on environment
    local subdomain
    case $environment in
        staging)
            subdomain="staging"
            ;;
        prod)
            subdomain="api"
            ;;
        dev)
            subdomain=""
            ;;
    esac
    
    print_status "Starting application infrastructure deployment..."
    print_status "Environment: $environment"
    print_status "Domain: $domain_name"
    if [[ -n "$subdomain" ]]; then
        print_status "Subdomain: $subdomain"
        print_status "Full domain: $subdomain.$domain_name"
    else
        print_status "No subdomain (dev environment)"
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Check domain infrastructure (for staging/prod)
    check_domain_infrastructure "$domain_name" "$subdomain"
    
    # Build and push Docker image
    build_and_push_image "$environment"
    
    # Deploy application infrastructure
    deploy_application_infrastructure "$environment" "$domain_name" "$subdomain"
    
    # Clean up image tag file
    rm -f ".image-tag"
    
    print_success "Application infrastructure deployment completed!"
    if [[ -n "$subdomain" ]]; then
        print_status "Your application is now available at: https://$subdomain.$domain_name"
    else
        print_status "Your application is now available at the load balancer URL (see CDK outputs above)"
    fi
}

# Script usage
usage() {
    echo "Usage: $0 [environment] [domain_name]"
    echo ""
    echo "Arguments:"
    echo "  environment   Deployment environment (dev|staging|prod) [default: staging]"
    echo "  domain_name   Domain name [default: dragon0.com]"
    echo ""
    echo "Examples:"
    echo "  $0 dev                       # Deploy dev environment"
    echo "  $0 staging                   # Deploy staging environment"
    echo "  $0 prod                      # Deploy production environment"
    echo "  $0 staging mydomain.com      # Deploy staging with custom domain"
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function with arguments
main "$@" 