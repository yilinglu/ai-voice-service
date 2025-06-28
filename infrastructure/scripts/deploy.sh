#!/bin/bash

# Plutus Voice Agent AWS CDK Deployment Script
# This script deploys the complete infrastructure using AWS CDK

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Set default AWS region
export AWS_DEFAULT_REGION=us-east-1

# Save current directory
ORIGINAL_DIR=$(pwd)

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

# Check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Check AWS credentials
check_aws_credentials() {
    print_status "Checking AWS credentials..."
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "AWS credentials are configured"
}

# Bootstrap CDK if needed
bootstrap_cdk() {
    print_status "Checking CDK bootstrap status..."
    
    if ! aws cloudformation describe-stacks --stack-name CDKToolkit &> /dev/null; then
        print_warning "CDK not bootstrapped. Bootstrapping now..."
        npx cdk bootstrap
        print_success "CDK bootstrapped successfully"
    else
        print_success "CDK already bootstrapped"
    fi
}

# Install CDK dependencies
install_dependencies() {
    print_status "Installing CDK dependencies..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the cdk directory."
        exit 1
    fi
    
    npm install
    print_success "Dependencies installed"
}

# Deploy infrastructure
deploy_infrastructure() {
    local environment=$1
    
    print_status "Deploying infrastructure for environment: $environment"
    
    # Synthesize the CloudFormation template
    print_status "Synthesizing CloudFormation template..."
    npx cdk synth -c environment=$environment
    
    # Deploy the stack
    print_status "Deploying CDK stack..."
    npx cdk deploy PlutusInfrastructureStack-$environment --require-approval never -c environment=$environment
    
    print_success "Infrastructure deployed successfully"
}

# Store secrets in AWS Secrets Manager
store_secrets() {
    local environment=$1
    
    print_status "Managing secrets using dedicated secret management script..."
    
    # Use the dedicated secret management script
    if [ -f "./scripts/manage-secrets.sh" ]; then
        "./scripts/manage-secrets.sh" validate
        if [ $? -ne 0 ]; then
            print_warning "Some secrets are missing. Creating them now..."
            "./scripts/manage-secrets.sh" create
        fi
        print_success "Secrets validated and ready"
    else
        print_error "Secret management script not found. Please ensure manage-secrets.sh exists."
        exit 1
    fi
}

# Test the deployment
test_deployment() {
    local environment=$1
    
    print_status "Testing deployment..."
    
    # Get the load balancer DNS name from CloudFormation outputs
    STACK_NAME="PlutusInfrastructureStack-$environment"
    ALB_DNS_NAME=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNSName`].OutputValue' \
        --output text)
    
    if [ -z "$ALB_DNS_NAME" ] || [ "$ALB_DNS_NAME" == "None" ]; then
        print_error "Could not retrieve load balancer DNS name"
        return 1
    fi
    
    print_status "Testing health endpoint at http://$ALB_DNS_NAME/api/health..."
    
    # Wait for the service to be ready
    print_status "Waiting for service to be ready..."
    sleep 30
    
    # Test health endpoint
    if curl -f "http://$ALB_DNS_NAME/api/health" > /dev/null 2>&1; then
        print_success "Health check passed"
    else
        print_warning "Health check failed - service may still be starting up"
        print_status "You can check the service status with:"
        echo "aws ecs describe-services --cluster plutus-cluster-$environment --services plutus-service-$environment"
    fi
    
    print_success "Deployment test completed"
}

# Display deployment information
show_deployment_info() {
    local environment=$1
    
    print_status "Deployment Information:"
    
    STACK_NAME="PlutusInfrastructureStack-$environment"
    
    # Get outputs from CloudFormation
    ALB_DNS_NAME=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNSName`].OutputValue' \
        --output text)
    
    ECR_REPO_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURL`].OutputValue' \
        --output text)
    
    DASHBOARD_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudWatchDashboardURL`].OutputValue' \
        --output text)
    
    echo ""
    echo "Environment: $environment"
    echo "Application Load Balancer: http://$ALB_DNS_NAME"
    echo "ECR Repository: $ECR_REPO_URL"
    echo "CloudWatch Dashboard: $DASHBOARD_URL"
    echo ""
    echo "API Endpoints:"
    echo "  Health Check: http://$ALB_DNS_NAME/api/health"
    echo "  Agent Webhook: http://$ALB_DNS_NAME/api/agent"
    echo "  Authorize: http://$ALB_DNS_NAME/api/authorize"
    echo ""
    echo "Next Steps:"
    echo "1. Update your Layercode pipeline webhook URL to: http://$ALB_DNS_NAME/api/agent"
    echo "2. Update your frontend authorize endpoint to: http://$ALB_DNS_NAME/api/authorize"
    echo "3. Configure secrets in AWS Secrets Manager:"
    echo "   - layercode/api-key"
    echo "   - layercode/webhook-secret"
    echo "   - google/generative-ai-key"
    echo "4. Monitor your deployment in CloudWatch: $DASHBOARD_URL"
    echo ""
}

# Show usage
show_usage() {
    echo "Usage: $0 <environment>"
    echo ""
    echo "Environments:"
    echo "  dev     - Development environment (1 instance, minimal resources)"
    echo "  staging - Staging environment (2 instances, production-like)"
    echo "  prod    - Production environment (2+ instances, full resources)"
    echo ""
    echo "Examples:"
    echo "  $0 dev"
    echo "  $0 prod"
    echo ""
    echo "Environment Variables (optional):"
    echo "  GOOGLE_GENERATIVE_AI_API_KEY - Your Google AI API key"
    echo "  LAYERCODE_API_KEY           - Your Layercode API key"
    echo "  LAYERCODE_WEBHOOK_SECRET    - Your Layercode webhook secret"
}

# Main deployment function
main() {
    local environment=$1

    # Run orphaned resource check before anything else (from original directory)
    print_status "Checking for orphaned AWS resources before deployment..."
    "$(dirname "$0")/orphaned-resource-check.sh"
    if [ $? -ne 0 ]; then
        print_error "Orphaned resource check failed or orphaned resources remain. Aborting deployment."
        exit 1
    fi

    # Validate secrets before any deployment (from original directory)
    print_status "Validating AWS Secrets Manager and environment before deployment..."
    node "$(dirname "$0")/../cdk/scripts/pre-deployment-validation.js"
    if [ $? -ne 0 ]; then
        print_error "Pre-deployment validation failed. Aborting deployment."
        exit 1
    fi

    # Move to CDK directory for all deployment steps
    cd "$(dirname "$0")/../cdk"

    check_prerequisites
    check_aws_credentials
    bootstrap_cdk
    install_dependencies
    
    # Manage secrets BEFORE infrastructure deployment
    store_secrets "$environment"
    
    deploy_infrastructure "$environment"
    test_deployment "$environment"
    show_deployment_info "$environment"

    print_success "Deployment completed successfully!"
}

# Run main function with all arguments
main "$@" 