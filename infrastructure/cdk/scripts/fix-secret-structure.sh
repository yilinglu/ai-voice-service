#!/bin/bash

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

# Function to fix a secret structure
fix_secret_structure() {
    local secret_name=$1
    local description=$2
    
    print_status "Fixing secret structure for: $secret_name"
    
    # Get current secret value
    local current_value
    current_value=$(aws secretsmanager get-secret-value --secret-id "$secret_name" --query 'SecretString' --output text 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        print_error "Failed to get secret value for $secret_name"
        return 1
    fi
    
    # Check if it's already in the correct format (not JSON)
    if [[ "$current_value" == "{"* ]]; then
        print_warning "Secret $secret_name contains JSON structure, extracting value..."
        
        # Extract the actual value from JSON
        local extracted_value
        if [[ "$secret_name" == "layercode/api-key" ]]; then
            extracted_value=$(echo "$current_value" | jq -r '.api_key // empty')
        elif [[ "$secret_name" == "layercode/webhook-secret" ]]; then
            extracted_value=$(echo "$current_value" | jq -r '.webhook_secret // empty')
        elif [[ "$secret_name" == "google/generative-ai-key" ]]; then
            extracted_value=$(echo "$current_value" | jq -r '.api_key // empty')
        else
            print_error "Unknown secret name: $secret_name"
            return 1
        fi
        
        if [ -n "$extracted_value" ] && [ "$extracted_value" != "null" ]; then
            # Update the secret with the extracted value
            aws secretsmanager update-secret \
                --secret-id "$secret_name" \
                --secret-string "$extracted_value"
            
            if [ $? -eq 0 ]; then
                print_success "Secret $secret_name updated to direct value format"
            else
                print_error "Failed to update secret $secret_name"
                return 1
            fi
        else
            print_warning "No valid value found in JSON for $secret_name"
        fi
    else
        print_success "Secret $secret_name is already in correct format"
    fi
}

# Main function
main() {
    print_status "Starting secret structure fix..."
    
    # Check prerequisites
    check_aws_config
    
    # List of secrets to fix
    local secrets=(
        "layercode/api-key:Layercode API Key"
        "layercode/webhook-secret:Layercode Webhook Secret"
        "google/generative-ai-key:Google Generative AI API Key"
    )
    
    local failed_secrets=()
    
    # Fix each secret
    for secret_info in "${secrets[@]}"; do
        IFS=':' read -r secret_name description <<< "$secret_info"
        
        if ! fix_secret_structure "$secret_name" "$description"; then
            failed_secrets+=("$secret_name")
        fi
    done
    
    # Report results
    if [[ ${#failed_secrets[@]} -eq 0 ]]; then
        print_success "All secrets have been fixed successfully!"
        echo ""
        print_status "Secret structure is now correct:"
        echo "  - Values are stored directly (not in JSON objects)"
        echo "  - Application can access them as environment variables"
        echo "  - No more 'null' or placeholder values"
    else
        print_error "Failed to fix ${#failed_secrets[@]} secret(s):"
        for secret in "${failed_secrets[@]}"; do
            echo "  - $secret"
        done
        exit 1
    fi
}

# Script usage
usage() {
    echo "Usage: $0"
    echo ""
    echo "This script fixes the structure of existing secrets in AWS Secrets Manager"
    echo "to store values directly instead of nested JSON objects."
    echo ""
    echo "The script will:"
    echo "  1. Check each secret for JSON structure"
    echo "  2. Extract the actual value from JSON"
    echo "  3. Update the secret to store the value directly"
    echo "  4. Verify the fix was successful"
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function
main "$@" 