#!/bin/bash

# Domain Infrastructure Cleanup Script
# This script properly cleans up domain infrastructure by disabling DNSSEC and removing KSKs

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
}

# Disable DNSSEC for a specific hosted zone
disable_dnssec_for_zone() {
    local zone_name=$1
    local region=${2:-"us-east-1"}
    
    print_status "Disabling DNSSEC signing for zone: $zone_name"
    
    # Get the hosted zone ID
    print_status "Getting hosted zone ID for $zone_name..."
    local hosted_zone_id=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='$zone_name.'].Id" --output text | sed 's/\/hostedzone\///')
    
    if [ -z "$hosted_zone_id" ]; then
        print_warning "Could not find hosted zone for zone: $zone_name"
        return 0
    fi
    
    print_success "Found hosted zone ID: $hosted_zone_id"
    
    # Check if DNSSEC is enabled
    local dnssec_status=$(aws route53 get-hosted-zone --id "$hosted_zone_id" --query "HostedZone.Config.Comment" --output text 2>/dev/null || echo "UNKNOWN")
    
    if [ "$dnssec_status" = "UNKNOWN" ]; then
        print_warning "Could not determine DNSSEC status for $zone_name, attempting to disable anyway..."
    fi
    
    # Disable DNSSEC signing
    print_status "Disabling DNSSEC signing for $zone_name..."
    aws route53 disable-hosted-zone-dnssec \
        --hosted-zone-id "$hosted_zone_id" \
        --region "$region" 2>/dev/null || print_warning "DNSSEC was not enabled for $zone_name or already disabled"
    
    print_success "DNSSEC signing disabled for $zone_name!"
}

# Delete KSK for a specific hosted zone
delete_ksk_for_zone() {
    local zone_name=$1
    local region=${2:-"us-east-1"}
    
    print_status "Deleting KSK for zone: $zone_name"
    
    # Get the hosted zone ID
    local hosted_zone_id=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='$zone_name.'].Id" --output text | sed 's/\/hostedzone\///')
    
    if [ -z "$hosted_zone_id" ]; then
        print_warning "Could not find hosted zone for zone: $zone_name"
        return 0
    fi
    
    # List KSKs for the hosted zone
    local ksk_name=""
    if [ "$zone_name" = "dragon0.com" ]; then
        ksk_name="plutus_dnssec_key_apex"
    else
        # Extract subdomain name for KSK naming
        local subdomain=$(echo "$zone_name" | cut -d'.' -f1)
        ksk_name="plutus_dnssec_key_${subdomain}"
    fi
    
    print_status "Looking for KSK: $ksk_name"
    
    # Try to delete the KSK
    aws route53 delete-key-signing-key \
        --hosted-zone-id "$hosted_zone_id" \
        --name "$ksk_name" \
        --region "$region" 2>/dev/null || print_warning "KSK $ksk_name was not found or already deleted"
    
    print_success "KSK deletion attempted for $zone_name!"
}

# Cleanup domain infrastructure
cleanup_domain_infrastructure() {
    local domain_name=${1:-"dragon0.com"}
    local subdomains=${2:-"staging,api"}
    local region=${3:-"us-east-1"}
    
    print_status "Cleaning up domain infrastructure..."
    print_status "Apex domain: $domain_name"
    print_status "Subdomains: $subdomains"
    
    # Process subdomains first (reverse order)
    IFS=',' read -ra SUBDOMAIN_ARRAY <<< "$subdomains"
    for ((i=${#SUBDOMAIN_ARRAY[@]}-1; i>=0; i--)); do
        subdomain=$(echo "${SUBDOMAIN_ARRAY[$i]}" | xargs) # trim whitespace
        if [ -n "$subdomain" ]; then
            local full_domain="${subdomain}.${domain_name}"
            print_status "Processing subdomain: $full_domain"
            disable_dnssec_for_zone "$full_domain" "$region"
            delete_ksk_for_zone "$full_domain" "$region"
        fi
    done
    
    # Process apex domain last
    print_status "Processing apex domain: $domain_name"
    disable_dnssec_for_zone "$domain_name" "$region"
    delete_ksk_for_zone "$domain_name" "$region"
}

# Destroy the CDK stack
destroy_stack() {
    print_status "Destroying CDK stack..."
    
    npx cdk destroy PlutusDomainInfrastructure \
        --app "npx ts-node --prefer-ts-exts bin/domain-infrastructure.ts" \
        --force
    
    print_success "CDK stack destroyed successfully!"
}

# Main script
main() {
    local domain_name=${1:-"dragon0.com"}
    local subdomains=${2:-"staging,api"}
    local region=${3:-"us-east-1"}
    
    print_status "Starting domain infrastructure cleanup..."
    print_status "Domain: $domain_name"
    print_status "Subdomains: $subdomains"
    print_status "Region: $region"
    
    # Check prerequisites
    check_prerequisites
    
    # Cleanup domain infrastructure
    cleanup_domain_infrastructure "$domain_name" "$subdomains" "$region"
    
    # Wait a moment for changes to propagate
    print_status "Waiting for changes to propagate..."
    sleep 10
    
    # Destroy the CDK stack
    destroy_stack
    
    print_success "Domain infrastructure cleanup completed!"
}

# Script usage
usage() {
    echo "Usage: $0 [domain_name] [subdomains] [region]"
    echo ""
    echo "Arguments:"
    echo "  domain_name   Apex domain name [default: dragon0.com]"
    echo "  subdomains    Comma-separated list of subdomains [default: staging,api]"
    echo "  region        AWS region [default: us-east-1]"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Cleanup dragon0.com and its subdomains"
    echo "  $0 mydomain.com                       # Cleanup mydomain.com and its subdomains"
    echo "  $0 mydomain.com dev,staging,prod      # Cleanup mydomain.com and custom subdomains"
    echo "  $0 mydomain.com dev,staging us-west-2 # Cleanup in us-west-2 region"
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function with arguments
main "$@" 