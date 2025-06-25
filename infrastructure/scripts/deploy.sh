#!/bin/bash

# Plutus Voice Agent AWS Deployment Script
# This script sets up the complete CI/CD pipeline on AWS

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
    
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed. Please install it first."
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

# Initialize Terraform
init_terraform() {
    print_status "Initializing Terraform..."
    
    cd terraform
    
    if [ ! -f "terraform.tfvars" ]; then
        print_warning "terraform.tfvars not found. Please copy terraform.tfvars.example and update the values."
        exit 1
    fi
    
    terraform init
    print_success "Terraform initialized"
}

# Deploy infrastructure
deploy_infrastructure() {
    print_status "Deploying infrastructure..."
    
    terraform plan -out=tfplan
    terraform apply tfplan
    
    print_success "Infrastructure deployed successfully"
}

# Store secrets in AWS Secrets Manager
store_secrets() {
    print_status "Storing secrets in AWS Secrets Manager..."
    
    # Get the secret ARNs from Terraform output
    GOOGLE_API_SECRET_ARN=$(terraform output -raw google_api_secret_arn 2>/dev/null || echo "")
    LAYERCODE_API_SECRET_ARN=$(terraform output -raw layercode_api_secret_arn 2>/dev/null || echo "")
    LAYERCODE_WEBHOOK_SECRET_ARN=$(terraform output -raw layercode_webhook_secret_arn 2>/dev/null || echo "")
    
    # Store Google API Key
    if [ -n "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
        aws secretsmanager put-secret-value \
            --secret-id "$GOOGLE_API_SECRET_ARN" \
            --secret-string "{\"GOOGLE_GENERATIVE_AI_API_KEY\":\"$GOOGLE_GENERATIVE_AI_API_KEY\"}"
        print_success "Google API key stored"
    else
        print_warning "GOOGLE_GENERATIVE_AI_API_KEY not set. Please set it manually in AWS Secrets Manager."
    fi
    
    # Store Layercode API Key
    if [ -n "$LAYERCODE_API_KEY" ]; then
        aws secretsmanager put-secret-value \
            --secret-id "$LAYERCODE_API_SECRET_ARN" \
            --secret-string "{\"LAYERCODE_API_KEY\":\"$LAYERCODE_API_KEY\"}"
        print_success "Layercode API key stored"
    else
        print_warning "LAYERCODE_API_KEY not set. Please set it manually in AWS Secrets Manager."
    fi
    
    # Store Layercode Webhook Secret
    if [ -n "$LAYERCODE_WEBHOOK_SECRET" ]; then
        aws secretsmanager put-secret-value \
            --secret-id "$LAYERCODE_WEBHOOK_SECRET_ARN" \
            --secret-string "{\"LAYERCODE_WEBHOOK_SECRET\":\"$LAYERCODE_WEBHOOK_SECRET\"}"
        print_success "Layercode webhook secret stored"
    else
        print_warning "LAYERCODE_WEBHOOK_SECRET not set. Please set it manually in AWS Secrets Manager."
    fi
}

# Setup GitHub connection
setup_github_connection() {
    print_status "Setting up GitHub connection..."
    
    GITHUB_CONNECTION_ARN=$(terraform output -raw github_connection_arn)
    
    print_warning "Please complete the GitHub connection setup:"
    echo "1. Go to AWS CodePipeline console"
    echo "2. Find the connection with ARN: $GITHUB_CONNECTION_ARN"
    echo "3. Click 'Pending' and complete the authorization"
    echo "4. Run this script again after completing the connection"
    
    read -p "Press Enter after completing the GitHub connection setup..."
}

# Test the deployment
test_deployment() {
    print_status "Testing deployment..."
    
    ALB_DNS_NAME=$(terraform output -raw alb_dns_name)
    
    print_status "Testing health endpoint..."
    if curl -f "http://$ALB_DNS_NAME/api/health" > /dev/null 2>&1; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        return 1
    fi
    
    print_success "Deployment test completed"
}

# Display deployment information
show_deployment_info() {
    print_status "Deployment Information:"
    
    ALB_DNS_NAME=$(terraform output -raw alb_dns_name)
    ECR_REPO_URL=$(terraform output -raw ecr_repository_url)
    
    echo ""
    echo "Application Load Balancer: http://$ALB_DNS_NAME"
    echo "ECR Repository: $ECR_REPO_URL"
    echo ""
    echo "API Endpoints:"
    echo "  Health Check: http://$ALB_DNS_NAME/api/health"
    echo "  Agent Webhook: http://$ALB_DNS_NAME/api/agent"
    echo "  Authorize: http://$ALB_DNS_NAME/api/authorize"
    echo ""
    echo "Next Steps:"
    echo "1. Update your Layercode pipeline webhook URL to: http://$ALB_DNS_NAME/api/agent"
    echo "2. Update your frontend authorize endpoint to: http://$ALB_DNS_NAME/api/authorize"
    echo "3. Push code to your GitHub repository to trigger the CI/CD pipeline"
    echo ""
}

# Main deployment function
main() {
    echo "=========================================="
    echo "Plutus Voice Agent AWS Deployment Script"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    check_aws_credentials
    
    # Check if we're in the right directory
    if [ ! -f "terraform/main.tf" ]; then
        print_error "Please run this script from the infrastructure directory"
        exit 1
    fi
    
    # Initialize and deploy infrastructure
    init_terraform
    deploy_infrastructure
    
    # Store secrets
    store_secrets
    
    # Setup GitHub connection
    setup_github_connection
    
    # Test deployment
    test_deployment
    
    # Show deployment information
    show_deployment_info
    
    print_success "Deployment completed successfully!"
}

# Run main function
main "$@" 