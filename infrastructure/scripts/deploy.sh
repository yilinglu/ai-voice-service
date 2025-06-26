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
    npx cdk synth
    
    # Deploy the stack
    print_status "Deploying CDK stack..."
    npx cdk deploy PlutusInfrastructureStack-$environment --require-approval never
    
    print_success "Infrastructure deployed successfully"
}

# Store secrets in AWS Secrets Manager
store_secrets() {
    local environment=$1
    
    print_status "Storing secrets in AWS Secrets Manager..."
    
    SECRET_NAME="plutus-app-secrets-$environment"
    
    # Check if secret exists
    if ! aws secretsmanager describe-secret --secret-id "$SECRET_NAME" &> /dev/null; then
        print_error "Secret $SECRET_NAME not found. Please ensure the infrastructure is deployed first."
        return 1
    fi
    
    # Prepare secret values
    SECRET_VALUES="{}"
    
    # Add Google API Key if provided
    if [ -n "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
        SECRET_VALUES=$(echo "$SECRET_VALUES" | jq --arg key "$GOOGLE_GENERATIVE_AI_API_KEY" '.GOOGLE_GENERATIVE_AI_API_KEY = $key')
        print_success "Google API key will be stored"
    else
        print_warning "GOOGLE_GENERATIVE_AI_API_KEY not set. Please set it manually in AWS Secrets Manager."
    fi
    
    # Add Layercode API Key if provided
    if [ -n "$LAYERCODE_API_KEY" ]; then
        SECRET_VALUES=$(echo "$SECRET_VALUES" | jq --arg key "$LAYERCODE_API_KEY" '.LAYERCODE_API_KEY = $key')
        print_success "Layercode API key will be stored"
    else
        print_warning "LAYERCODE_API_KEY not set. Please set it manually in AWS Secrets Manager."
    fi
    
    # Add Layercode Webhook Secret if provided
    if [ -n "$LAYERCODE_WEBHOOK_SECRET" ]; then
        SECRET_VALUES=$(echo "$SECRET_VALUES" | jq --arg key "$LAYERCODE_WEBHOOK_SECRET" '.LAYERCODE_WEBHOOK_SECRET = $key')
        print_success "Layercode webhook secret will be stored"
    else
        print_warning "LAYERCODE_WEBHOOK_SECRET not set. Please set it manually in AWS Secrets Manager."
    fi
    
    # Update the secret
    if [ "$SECRET_VALUES" != "{}" ]; then
        aws secretsmanager put-secret-value \
            --secret-id "$SECRET_NAME" \
            --secret-string "$SECRET_VALUES"
        print_success "Secrets stored successfully"
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
    echo "3. Configure secrets in AWS Secrets Manager (secret name: plutus-app-secrets-$environment)"
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
    
    # Check if environment is provided
    if [ -z "$environment" ]; then
        print_error "Environment not specified"
        show_usage
        exit 1
    fi
    
    # Validate environment
    if [[ ! "$environment" =~ ^(dev|staging|prod)$ ]]; then
        print_error "Invalid environment: $environment"
        show_usage
        exit 1
    fi
    
    echo "=========================================="
    echo "Plutus Voice Agent AWS CDK Deployment"
    echo "Environment: $environment"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    check_aws_credentials
    bootstrap_cdk
    install_dependencies
    deploy_infrastructure "$environment"
    store_secrets "$environment"
    test_deployment "$environment"
    show_deployment_info "$environment"
    
    print_success "Deployment completed successfully!"
}

# Run main function with all arguments
main "$@" 