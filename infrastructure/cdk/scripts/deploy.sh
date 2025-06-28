#!/bin/bash

# Plutus Infrastructure Deployment Script
# Supports staging and production environments with custom domains

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

# Function to validate environment
validate_environment() {
    local env=$1
    case $env in
        staging|prod)
            return 0
            ;;
        *)
            print_error "Invalid environment: $env. Must be one of: staging, prod"
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

# Function to verify secrets before deployment
verify_secrets() {
    local env=$1
    
    print_status "Verifying secrets before deployment..."
    
    # Run the secret verification script
    if ! ./scripts/verify-secrets.sh "$env"; then
        print_error "Secret verification failed. Please fix the secrets before deploying."
        exit 1
    fi
    
    print_success "Secrets verification completed"
}

# Function to deploy infrastructure
deploy_infrastructure() {
    local env=$1
    local domain_name=${2:-"dragon0.com"}
    
    print_status "Deploying to $env environment..."
    
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
    
    # Deploy the stack with context parameters and environment variable
    print_status "Deploying infrastructure stack..."
    print_status "Environment: $env"
    print_status "Domain: $domain_name"
    
    # Use both context and environment variable for maximum reliability
    ENVIRONMENT=$env cdk deploy --require-approval never -c environment=$env -c domainName=$domain_name
    
    if [[ $? -eq 0 ]]; then
        print_success "Infrastructure deployed successfully!"
    else
        print_error "Infrastructure deployment failed!"
        exit 1
    fi
}

# Function to show deployment info
show_deployment_info() {
    local env=$1
    local domain_name=${2:-"dragon0.com"}
    
    print_status "Deployment Information:"
    echo "Environment: $env"
    
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
}

# Main script
main() {
    local env=${1:-"dev"}
    local domain_name=${2:-"dragon0.com"}
    
    print_status "Starting Plutus infrastructure deployment..."
    print_status "Environment: $env"
    print_status "Domain: $domain_name"
    
    # Validate inputs
    validate_environment "$env"
    
    # Check prerequisites
    check_aws_config
    check_cdk
    
    # Check domain setup for staging/prod
    check_domain_setup "$env" "$domain_name"
    
    # Verify secrets before deployment
    verify_secrets "$env"
    
    # Deploy infrastructure
    deploy_infrastructure "$env" "$domain_name"
    
    # Show deployment info
    show_deployment_info "$env" "$domain_name"
}

# Script usage
usage() {
    echo "Usage: $0 [environment] [domain_name]"
    echo ""
    echo "Arguments:"
    echo "  environment   Deployment environment (dev|staging|prod) [default: dev]"
    echo "  domain_name   Domain name for custom domains [default: dragon0.com]"
    echo ""
    echo "Examples:"
    echo "  $0 dev                    # Deploy to dev environment"
    echo "  $0 staging                # Deploy to staging with staging.dragon0.com"
    echo "  $0 prod                   # Deploy to production with api.dragon0.com"
    echo "  $0 staging mydomain.com   # Deploy to staging with staging.mydomain.com"
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function with arguments
main "$@" 