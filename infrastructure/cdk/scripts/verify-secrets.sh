#!/bin/bash

# Secret Verification Script for Plutus Infrastructure
# Verifies that all required secrets exist in AWS Secrets Manager before deployment

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

# Function to verify a secret exists
verify_secret() {
    local secret_name=$1
    local description=$2
    
    print_status "Verifying secret: $secret_name"
    
    if aws secretsmanager describe-secret --secret-id "$secret_name" >/dev/null 2>&1; then
        print_success "Secret '$secret_name' exists"
        return 0
    else
        print_error "Secret '$secret_name' does not exist!"
        print_error "Description: $description"
        return 1
    fi
}

# Function to create a secret if it doesn't exist
create_secret_if_missing() {
    local secret_name=$1
    local description=$2
    local secret_value=$3
    
    if ! aws secretsmanager describe-secret --secret-id "$secret_name" >/dev/null 2>&1; then
        print_warning "Secret '$secret_name' does not exist. Creating it..."
        
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --description "$description" \
            --secret-string "$secret_value" \
            --tags Key=Environment,Value=staging Key=Service,Value=plutus-voice-agent
        
        if [[ $? -eq 0 ]]; then
            print_success "Secret '$secret_name' created successfully"
        else
            print_error "Failed to create secret '$secret_name'"
            return 1
        fi
    else
        print_success "Secret '$secret_name' already exists"
    fi
}

# Function to verify all required secrets
verify_all_secrets() {
    local environment=$1
    
    print_status "Verifying secrets for environment: $environment"
    
    # List of required secrets - store as direct values, not nested JSON
    local secrets=(
        "layercode/api-key:Layercode API Key for Plutus Voice Agent:your-layercode-api-key-here"
        "layercode/webhook-secret:Layercode Webhook Secret for Plutus Voice Agent:your-layercode-webhook-secret-here"
        "google/generative-ai-key:Google Generative AI API Key for Plutus Voice Agent:your-google-ai-api-key-here"
    )
    
    local missing_secrets=()
    
    # Check each secret
    for secret_info in "${secrets[@]}"; do
        IFS=':' read -r secret_name description secret_value <<< "$secret_info"
        
        if ! verify_secret "$secret_name" "$description"; then
            missing_secrets+=("$secret_name")
        fi
    done
    
    # If any secrets are missing, offer to create them
    if [[ ${#missing_secrets[@]} -gt 0 ]]; then
        print_warning "Found ${#missing_secrets[@]} missing secret(s):"
        for secret in "${missing_secrets[@]}"; do
            echo "  - $secret"
        done
        
        echo ""
        read -p "Would you like to create the missing secrets with placeholder values? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Creating missing secrets..."
            
            for secret_info in "${secrets[@]}"; do
                IFS=':' read -r secret_name description secret_value <<< "$secret_info"
                
                if [[ " ${missing_secrets[@]} " =~ " ${secret_name} " ]]; then
                    create_secret_if_missing "$secret_name" "$description" "$secret_value"
                fi
            done
            
            print_success "All missing secrets have been created with placeholder values"
            print_warning "IMPORTANT: Update the secret values with real API keys before using the service"
        else
            print_error "Secrets verification failed. Please create the missing secrets manually."
            exit 1
        fi
    else
        print_success "All required secrets are present!"
    fi
}

# Function to show secret management instructions
show_secret_instructions() {
    print_status "Secret Management Instructions:"
    echo ""
    echo "To update secret values with real API keys:"
    echo ""
    echo "1. Layercode API Key:"
    echo "   aws secretsmanager update-secret --secret-id layercode/api-key --secret-string 'your-real-layercode-api-key'"
    echo ""
    echo "2. Layercode Webhook Secret:"
    echo "   aws secretsmanager update-secret --secret-id layercode/webhook-secret --secret-string 'your-real-layercode-webhook-secret'"
    echo ""
    echo "3. Google Generative AI API Key:"
    echo "   aws secretsmanager update-secret --secret-id google/generative-ai-key --secret-string 'your-real-google-ai-api-key'"
    echo ""
    echo "Or use the AWS Console:"
    echo "   https://console.aws.amazon.com/secretsmanager/home?region=us-east-1"
    echo ""
}

# Main script
main() {
    local environment=${1:-"staging"}
    
    print_status "Starting secret verification for Plutus infrastructure..."
    print_status "Environment: $environment"
    
    # Check prerequisites
    check_aws_config
    
    # Verify all secrets
    verify_all_secrets "$environment"
    
    # Show instructions
    show_secret_instructions
    
    print_success "Secret verification completed!"
}

# Script usage
usage() {
    echo "Usage: $0 [environment]"
    echo ""
    echo "Arguments:"
    echo "  environment   Environment to verify secrets for [default: staging]"
    echo ""
    echo "Examples:"
    echo "  $0 staging     # Verify secrets for staging environment"
    echo "  $0 prod        # Verify secrets for production environment"
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function with arguments
main "$@" 