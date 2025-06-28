#!/bin/bash

# Domain Infrastructure Deployment Script
# This script deploys only the domain infrastructure (Route53, DNSSEC, SSL certificates)
# This is typically run once or infrequently when domain configuration changes

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
}

# Deploy domain infrastructure
deploy_domain_infrastructure() {
    local domain_name=${1:-"dragon0.com"}
    local subdomains=${2:-"staging,api"}
    
    print_status "Deploying domain infrastructure..."
    print_status "Domain: $domain_name"
    print_status "Subdomains: $subdomains"
    
    # Convert comma-separated subdomains to array format for CDK
    local subdomains_array=$(echo "[$subdomains]" | sed 's/,/","/g' | sed 's/\[/["/' | sed 's/\]/"]/')
    
    # Deploy domain infrastructure using the domain app directly
    print_status "Running CDK deploy for domain infrastructure..."
    
    npx cdk deploy PlutusDomainInfrastructure \
        --app "npx ts-node --prefer-ts-exts bin/domain-infrastructure.ts" \
        --context domainName="$domain_name" \
        --context subdomains="$subdomains_array" \
        --require-approval never
    
    print_success "Domain infrastructure deployed successfully!"
}

# Main script
main() {
    local domain_name=${1:-"dragon0.com"}
    local subdomains=${2:-"staging,api"}
    
    print_status "Starting domain infrastructure deployment..."
    print_status "Domain: $domain_name"
    print_status "Subdomains: $subdomains"
    
    # Check prerequisites
    check_prerequisites
    
    # Deploy domain infrastructure
    deploy_domain_infrastructure "$domain_name" "$subdomains"
    
    print_success "Domain infrastructure deployment completed!"
    print_status "You can now deploy your application with: ./scripts/deploy-app.sh staging"
    print_status "Or: ./scripts/deploy-app.sh prod"
}

# Script usage
usage() {
    echo "Usage: $0 [domain_name] [subdomains]"
    echo ""
    echo "Arguments:"
    echo "  domain_name   Domain name to configure [default: dragon0.com]"
    echo "  subdomains    Comma-separated list of subdomains [default: staging,api]"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Deploy dragon0.com with staging,api"
    echo "  $0 mydomain.com                       # Deploy mydomain.com with staging,api"
    echo "  $0 mydomain.com dev,staging,prod      # Deploy mydomain.com with custom subdomains"
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function with arguments
main "$@" 