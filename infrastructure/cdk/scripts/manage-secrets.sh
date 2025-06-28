#!/bin/bash

# Secret Management Script for Plutus Voice Service
# This script manages secrets independently of CDK deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if secret exists
secret_exists() {
    local secret_name=$1
    aws secretsmanager describe-secret --secret-id "$secret_name" >/dev/null 2>&1
}

# Function to create secret
create_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    if secret_exists "$secret_name"; then
        print_warning "Secret '$secret_name' already exists. Skipping creation."
        return 0
    fi
    
    print_status "Creating secret: $secret_name"
    aws secretsmanager create-secret \
        --name "$secret_name" \
        --description "$description" \
        --secret-string "$secret_value" \
        --region us-east-1
    
    print_status "Secret '$secret_name' created successfully"
}

# Function to update secret
update_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if ! secret_exists "$secret_name"; then
        print_error "Secret '$secret_name' does not exist. Cannot update."
        return 1
    fi
    
    print_status "Updating secret: $secret_name"
    aws secretsmanager update-secret \
        --secret-id "$secret_name" \
        --secret-string "$secret_value" \
        --region us-east-1
    
    print_status "Secret '$secret_name' updated successfully"
}

# Function to list secrets
list_secrets() {
    print_status "Listing Plutus-related secrets:"
    aws secretsmanager list-secrets --region us-east-1 | \
        jq -r '.SecretList[] | select(.Name | contains("layercode") or contains("google")) | "  - \(.Name) (Last modified: \(.LastModifiedDate))"'
}

# Function to show secret metadata
show_secret_info() {
    local secret_name=$1
    
    if ! secret_exists "$secret_name"; then
        print_error "Secret '$secret_name' does not exist."
        return 1
    fi
    
    print_status "Secret info for: $secret_name"
    aws secretsmanager describe-secret --secret-id "$secret_name" --region us-east-1 | \
        jq -r '. | "  Name: \(.Name)\n  Description: \(.Description)\n  Last Modified: \(.LastModifiedDate)\n  Version Count: \(.VersionIdsToStages | length)"'
}

# Main script logic
case "${1:-help}" in
    "create")
        print_status "Creating all required secrets..."
        
        # Read secret values from files or environment variables
        LAYERCODE_API_KEY=${LAYERCODE_API_KEY:-$(cat ../../../layercode_api_key.txt 2>/dev/null || echo "ary12vfqqn2cmono5jpq5794")}
        LAYERCODE_WEBHOOK_SECRET=${LAYERCODE_WEBHOOK_SECRET:-$(cat ../../../layercode_api_key.txt 2>/dev/null | grep -o '[a-z0-9]\{26\}' || echo "c7jqo1qzf5op4oohzk6ee9u5")}
        GOOGLE_API_KEY=${GOOGLE_API_KEY:-$(cat ../../../google_api_key.txt 2>/dev/null || echo "AIzaSyCcHTcECKGoQyuWfY-bfS2wYxpVB0PZlig")}
        
        create_secret "layercode/api-key" "$LAYERCODE_API_KEY" "Layercode API Key for Plutus Voice Agent"
        create_secret "layercode/webhook-secret" "$LAYERCODE_WEBHOOK_SECRET" "Layercode Webhook Secret for Plutus Voice Agent"
        create_secret "google/generative-ai-key" "$GOOGLE_API_KEY" "Google Generative AI API Key for Plutus Voice Agent"
        
        print_status "All secrets created successfully!"
        ;;
    
    "update")
        if [ -z "$2" ]; then
            print_error "Usage: $0 update <secret-name> [new-value]"
            exit 1
        fi
        
        secret_name=$2
        new_value=${3:-}
        
        if [ -z "$new_value" ]; then
            print_error "Please provide a new value for the secret"
            exit 1
        fi
        
        update_secret "$secret_name" "$new_value"
        ;;
    
    "list")
        list_secrets
        ;;
    
    "info")
        if [ -z "$2" ]; then
            print_error "Usage: $0 info <secret-name>"
            exit 1
        fi
        
        show_secret_info "$2"
        ;;
    
    "validate")
        print_status "Validating all required secrets..."
        
        required_secrets=("layercode/api-key" "layercode/webhook-secret" "google/generative-ai-key")
        all_valid=true
        
        for secret in "${required_secrets[@]}"; do
            if secret_exists "$secret"; then
                print_status "✅ $secret exists"
            else
                print_error "❌ $secret missing"
                all_valid=false
            fi
        done
        
        if [ "$all_valid" = true ]; then
            print_status "All secrets are valid and ready for deployment!"
        else
            print_error "Some secrets are missing. Run '$0 create' to create them."
            exit 1
        fi
        ;;
    
    "help"|*)
        echo "Plutus Secret Management Script"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  create                    Create all required secrets"
        echo "  update <name> <value>     Update a specific secret"
        echo "  list                      List all Plutus-related secrets"
        echo "  info <name>               Show information about a specific secret"
        echo "  validate                  Validate all required secrets exist"
        echo "  help                      Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 create"
        echo "  $0 update layercode/api-key new-api-key-value"
        echo "  $0 list"
        echo "  $0 info layercode/api-key"
        echo "  $0 validate"
        ;;
esac 