#!/bin/bash

# CI/CD Pipeline Deployment Script
# This script deploys the CI/CD pipeline that handles staging → production deployments

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

# Deploy CI/CD pipeline
deploy_cicd_pipeline() {
    local domain_name=${1:-"dragon0.com"}
    local staging_subdomain=${2:-"staging"}
    local production_subdomain=${3:-"api"}
    local github_owner=${4:-"your-github-username"}
    local github_repo=${5:-"ai-voice-service"}
    local github_branch=${6:-"main"}
    local github_token_secret_name=${7:-"github/oauth-token"}
    
    print_status "Deploying CI/CD pipeline..."
    print_status "Domain: $domain_name"
    print_status "Staging: $staging_subdomain.$domain_name"
    print_status "Production: $production_subdomain.$domain_name"
    print_status "GitHub: $github_owner/$github_repo ($github_branch)"
    
    # Deploy CI/CD pipeline
    print_status "Running CDK deploy for CI/CD pipeline..."
    
    npx cdk deploy PlutusCICDPipeline \
        --app "npx ts-node --prefer-ts-exts bin/cicd-pipeline.ts" \
        --context domainName="$domain_name" \
        --context stagingSubdomain="$staging_subdomain" \
        --context productionSubdomain="$production_subdomain" \
        --context githubOwner="$github_owner" \
        --context githubRepo="$github_repo" \
        --context githubBranch="$github_branch" \
        --context githubTokenSecretName="$github_token_secret_name" \
        --require-approval never
    
    print_success "CI/CD pipeline deployed successfully!"
}

# Main script
main() {
    local domain_name=${1:-"dragon0.com"}
    local staging_subdomain=${2:-"staging"}
    local production_subdomain=${3:-"api"}
    local github_owner=${4:-"your-github-username"}
    local github_repo=${5:-"ai-voice-service"}
    local github_branch=${6:-"main"}
    local github_token_secret_name=${7:-"github/oauth-token"}
    
    print_status "Starting CI/CD pipeline deployment..."
    print_status "Domain: $domain_name"
    print_status "Staging: $staging_subdomain.$domain_name"
    print_status "Production: $production_subdomain.$domain_name"
    print_status "GitHub: $github_owner/$github_repo ($github_branch)"
    
    # Check prerequisites
    check_prerequisites
    
    # Deploy CI/CD pipeline
    deploy_cicd_pipeline "$domain_name" "$staging_subdomain" "$production_subdomain" "$github_owner" "$github_repo" "$github_branch" "$github_token_secret_name"
    
    print_success "CI/CD pipeline deployment completed!"
    print_status ""
    print_status "Next steps:"
    print_status "1. Create a GitHub OAuth token and store it in AWS Secrets Manager as '$github_token_secret_name'"
    print_status "2. Deploy staging infrastructure: ./scripts/deploy-app.sh staging"
    print_status "3. Deploy production infrastructure: ./scripts/deploy-app.sh prod"
    print_status "4. Push code to GitHub to trigger the pipeline"
    print_status ""
    print_status "Pipeline flow:"
    print_status "  Code Push → Build → Deploy to Staging → Manual Approval → Deploy to Production"
}

# Script usage
usage() {
    echo "Usage: $0 [domain_name] [staging_subdomain] [production_subdomain] [github_owner] [github_repo] [github_branch] [github_token_secret_name]"
    echo ""
    echo "Arguments:"
    echo "  domain_name              Domain name [default: dragon0.com]"
    echo "  staging_subdomain        Staging subdomain [default: staging]"
    echo "  production_subdomain     Production subdomain [default: api]"
    echo "  github_owner             GitHub username/organization [default: your-github-username]"
    echo "  github_repo              GitHub repository name [default: ai-voice-service]"
    echo "  github_branch            GitHub branch to monitor [default: main]"
    echo "  github_token_secret_name AWS Secrets Manager secret name for GitHub token [default: github/oauth-token]"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Deploy with defaults"
    echo "  $0 mydomain.com                       # Deploy with custom domain"
    echo "  $0 mydomain.com dev prod myuser myrepo main github/token"
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function with arguments
main "$@" 