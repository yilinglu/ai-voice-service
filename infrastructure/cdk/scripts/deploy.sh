#!/bin/bash

# Plutus Infrastructure Deployment Script
# This script deploys the Plutus voice agent infrastructure using AWS CDK

set -e  # Exit on any error

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

# Function to check Node.js and npm
check_node_requirements() {
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install it first."
        exit 1
    fi

    if ! command_exists npm; then
        print_error "npm is not installed. Please install it first."
        exit 1
    fi

    print_success "Node.js and npm are available"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing CDK dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Function to bootstrap CDK (if needed)
bootstrap_cdk() {
    print_status "Checking if CDK is bootstrapped..."
    if ! aws cloudformation describe-stacks --stack-name CDKToolkit >/dev/null 2>&1; then
        print_warning "CDK is not bootstrapped. Bootstrapping now..."
        npx cdk bootstrap
        print_success "CDK bootstrapped successfully"
    else
        print_success "CDK is already bootstrapped"
    fi
}

# Function to deploy infrastructure
deploy_infrastructure() {
    local environment=$1
    
    print_status "Deploying infrastructure for environment: $environment"
    
    # Set environment variable for CDK
    export ENVIRONMENT=$environment
    
    # Synthesize the CloudFormation template
    print_status "Synthesizing CloudFormation template..."
    npx cdk synth
    
    # Deploy the stack
    print_status "Deploying CDK stack..."
    npx cdk deploy --all --require-approval never
    
    print_success "Infrastructure deployed successfully!"
}

# Function to show deployment outputs
show_outputs() {
    print_status "Retrieving deployment outputs..."
    npx cdk list
    print_success "Deployment completed. Check the outputs above for service URLs and other information."
}

# Function to update secrets
update_secrets() {
    local environment=$1
    
    print_status "Updating secrets for environment: $environment"
    
    # Get the secret name from the stack output
    local secret_name=$(aws cloudformation describe-stacks \
        --stack-name "PlutusInfrastructureStack-$environment" \
        --query 'Stacks[0].Outputs[?OutputKey==`SecretsName`].OutputValue' \
        --output text 2>/dev/null || echo "plutus-app-secrets-$environment")
    
    print_warning "Please update the secrets in AWS Secrets Manager: $secret_name"
    print_warning "Required secrets:"
    print_warning "  - LAYERCODE_API_KEY"
    print_warning "  - LAYERCODE_WEBHOOK_SECRET"
    print_warning "  - GOOGLE_GENERATIVE_AI_API_KEY"
    
    # Open Secrets Manager in browser if possible
    if command_exists open; then
        open "https://console.aws.amazon.com/secretsmanager/secret?name=$secret_name"
    fi
}

# Main deployment function
main() {
    local environment=${1:-dev}
    
    print_status "Starting Plutus infrastructure deployment..."
    print_status "Environment: $environment"
    
    # Validate environment
    if [[ ! "$environment" =~ ^(dev|staging|prod)$ ]]; then
        print_error "Invalid environment. Must be one of: dev, staging, prod"
        exit 1
    fi
    
    # Check prerequisites
    check_aws_config
    check_node_requirements
    
    # Install dependencies
    install_dependencies
    
    # Bootstrap CDK if needed
    bootstrap_cdk
    
    # Deploy infrastructure
    deploy_infrastructure "$environment"
    
    # Show outputs
    show_outputs
    
    # Update secrets
    update_secrets "$environment"
    
    print_success "Deployment completed successfully!"
    print_status "Next steps:"
    print_status "1. Update the secrets in AWS Secrets Manager"
    print_status "2. Configure your Layercode pipeline webhook URL"
    print_status "3. Test the voice agent"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [environment]"
    echo ""
    echo "Environments:"
    echo "  dev      - Development environment (default)"
    echo "  staging  - Staging environment"
    echo "  prod     - Production environment"
    echo ""
    echo "Examples:"
    echo "  $0        # Deploy to dev environment"
    echo "  $0 prod   # Deploy to production environment"
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_usage
        exit 0
        ;;
    dev|staging|prod)
        main "$1"
        ;;
    "")
        main "dev"
        ;;
    *)
        print_error "Invalid argument: $1"
        show_usage
        exit 1
        ;;
esac 