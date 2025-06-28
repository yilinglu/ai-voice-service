#!/bin/bash

# Comprehensive Plutus Deployment Script
# Builds Docker image with proper versioning and deploys infrastructure

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

# Function to check CDK installation
check_cdk() {
    if ! command_exists cdk; then
        print_error "AWS CDK is not installed. Please install it first: npm install -g aws-cdk-cli"
        exit 1
    fi

    print_success "AWS CDK is installed"
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

# Function to validate environment
validate_environment() {
    local env=$1
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

# Function to check domain setup
check_domain_setup() {
    local env=$1
    local domain_name=${2:-"dragon0.com"}
    
    if [[ "$env" == "staging" || "$env" == "prod" ]]; then
        print_status "Checking domain setup for $env environment..."
        
        # Check if hosted zone exists
        if ! aws route53 list-hosted-zones --query "HostedZones[?Name=='$domain_name.']" --output text | grep -q "$domain_name"; then
            print_warning "Hosted zone for $domain_name not found in Route53"
            print_warning "Please ensure your domain is properly configured in Route53"
            print_warning "You can create a hosted zone manually in the AWS Console"
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        else
            print_success "Hosted zone for $domain_name found"
        fi
    fi
}

# Function to build and push Docker image
build_and_push_image() {
    local env=$1
    
    print_status "Building and pushing Docker image for $env environment..."
    
    # Run the build and push script
    ./scripts/build-and-push-image.sh "$env"
    
    print_success "Docker image built and pushed successfully"
}

# Function to deploy infrastructure
deploy_infrastructure() {
    local env=$1
    local domain_name=${2:-"dragon0.com"}
    
    print_status "Deploying infrastructure to $env environment..."
    
    # Set environment variables
    export ENVIRONMENT=$env
    export DOMAIN_NAME=$domain_name
    
    # Navigate to CDK directory
    cd "$(dirname "$0")/.."
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        print_status "Installing CDK dependencies..."
        npm install
    fi
    
    # Bootstrap CDK if needed
    print_status "Checking CDK bootstrap..."
    if ! cdk list >/dev/null 2>&1; then
        print_status "Bootstrapping CDK..."
        cdk bootstrap
    fi
    
    # Deploy the stack
    print_status "Deploying infrastructure stack..."
    cdk deploy --require-approval never
    
    print_success "Infrastructure deployed successfully!"
}

# Function to show deployment info
show_deployment_info() {
    local env=$1
    local domain_name=${2:-"dragon0.com"}
    local image_tag=""
    
    # Read the image tag if available
    if [[ -f ".image-tag" ]]; then
        image_tag=$(cat .image-tag)
    fi
    
    print_status "Deployment Information:"
    echo "Environment: $env"
    
    if [[ -n "$image_tag" ]]; then
        echo "Image Tag: $image_tag"
    fi
    
    if [[ "$env" == "staging" ]]; then
        echo "URL: https://staging.$domain_name"
    elif [[ "$env" == "prod" ]]; then
        echo "URL: https://api.$domain_name"
    else
        echo "URL: http://<load-balancer-dns> (check CDK outputs)"
    fi
    
    echo ""
    print_status "Next steps:"
    echo "1. Update secrets in AWS Secrets Manager"
    echo "2. Configure your Layercode pipeline webhook URL"
    echo "3. Test the deployment"
    
    if [[ -n "$image_tag" ]]; then
        echo ""
        print_status "Rollback Information:"
        echo "To rollback to this deployment:"
        echo "  ./scripts/rollback.sh $env commit $(echo $image_tag | cut -d'-' -f2)"
        echo ""
        echo "To see available rollback options:"
        echo "  ./scripts/rollback.sh $env list"
    fi
}

# Function to show usage
usage() {
    echo "Usage: $0 [environment] [options] [domain_name]"
    echo ""
    echo "Arguments:"
    echo "  environment      Deployment environment (dev|staging|prod) [default: dev]"
    echo "  domain_name      Domain name for custom domains [default: dragon0.com]"
    echo ""
    echo "Options:"
    echo "  --skip-build     Skip Docker build and push (deploy existing image)"
    echo "  --skip-deploy    Skip infrastructure deployment (only build image)"
    echo "  --build-only     Only build and push Docker image"
    echo ""
    echo "Examples:"
    echo "  $0 dev                           # Full deployment to dev"
    echo "  $0 staging                       # Full deployment to staging"
    echo "  $0 prod                          # Full deployment to production"
    echo "  $0 dev --skip-build              # Deploy without rebuilding image"
    echo "  $0 staging --build-only          # Only build and push image"
    echo "  $0 prod mydomain.com             # Deploy to custom domain"
}

# Main script
main() {
    local env="dev"
    local domain_name="dragon0.com"
    local skip_build=false
    local skip_deploy=false
    local build_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            dev|staging|prod)
                env="$1"
                shift
                ;;
            --skip-build)
                skip_build=true
                shift
                ;;
            --skip-deploy)
                skip_deploy=true
                shift
                ;;
            --build-only)
                build_only=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *.com|*.org|*.net|*.io|*.co|*.dev)
                domain_name="$1"
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    print_status "Starting comprehensive Plutus deployment..."
    print_status "Environment: $env"
    print_status "Domain: $domain_name"
    print_status "Skip build: $skip_build"
    print_status "Skip deploy: $skip_deploy"
    print_status "Build only: $build_only"
    
    # Validate inputs
    validate_environment "$env"
    
    # Check prerequisites
    check_aws_config
    check_cdk
    check_docker
    
    # Check domain setup for staging/prod
    if [[ "$build_only" == false ]]; then
        check_domain_setup "$env" "$domain_name"
    fi
    
    # Build and push Docker image (if not skipped)
    if [[ "$skip_build" == false ]]; then
        build_and_push_image "$env"
    else
        print_warning "Skipping Docker build and push"
    fi
    
    # Deploy infrastructure (if not skipped and not build-only)
    if [[ "$skip_deploy" == false && "$build_only" == false ]]; then
        deploy_infrastructure "$env" "$domain_name"
    elif [[ "$build_only" == true ]]; then
        print_status "Build-only mode - skipping infrastructure deployment"
    else
        print_warning "Skipping infrastructure deployment"
    fi
    
    # Show deployment info
    if [[ "$build_only" == false ]]; then
        show_deployment_info "$env" "$domain_name"
    fi
    
    print_success "Deployment completed successfully!"
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function
main "$@" 