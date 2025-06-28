#!/bin/bash

# Enable DNSSEC Signing Script
# This script enables DNSSEC signing for all hosted zones (apex domain and subdomains)

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

# Enable DNSSEC signing for a specific hosted zone
enable_dnssec_for_zone() {
    local zone_name=$1
    local region=${2:-"us-east-1"}
    
    print_status "Enabling DNSSEC signing for zone: $zone_name"
    
    # Get the hosted zone ID
    print_status "Getting hosted zone ID for $zone_name..."
    local hosted_zone_id=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='$zone_name.'].Id" --output text | sed 's/\/hostedzone\///')
    
    if [ -z "$hosted_zone_id" ]; then
        print_error "Could not find hosted zone for zone: $zone_name"
        return 1
    fi
    
    print_success "Found hosted zone ID: $hosted_zone_id"
    
    # Enable DNSSEC signing
    print_status "Enabling DNSSEC signing for $zone_name..."
    aws route53 enable-hosted-zone-dnssec \
        --hosted-zone-id "$hosted_zone_id" \
        --region "$region"
    
    print_success "DNSSEC signing enabled successfully for $zone_name!"
    
    # Wait a moment and check the status
    print_status "Checking DNSSEC signing status for $zone_name..."
    sleep 5
    
    local signing_status=$(aws route53 get-dnssec-record \
        --hosted-zone-id "$hosted_zone_id" \
        --record-name "$zone_name" \
        --record-type "SOA" \
        --query "Status" \
        --output text 2>/dev/null || echo "CHECKING")
    
    print_status "DNSSEC signing status for $zone_name: $signing_status"
    
    if [ "$signing_status" = "SIGNING" ]; then
        print_success "DNSSEC signing is now active for $zone_name!"
    else
        print_warning "DNSSEC signing for $zone_name may still be propagating. Check AWS console for final status."
    fi
}

# Enable DNSSEC signing for all zones
enable_dnssec_signing() {
    local domain_name=${1:-"dragon0.com"}
    local subdomains=${2:-"staging,api"}
    local region=${3:-"us-east-1"}
    
    print_status "Enabling DNSSEC signing for all zones..."
    print_status "Apex domain: $domain_name"
    print_status "Subdomains: $subdomains"
    
    # Enable DNSSEC for apex domain
    print_status "Processing apex domain..."
    enable_dnssec_for_zone "$domain_name" "$region"
    
    # Enable DNSSEC for each subdomain
    IFS=',' read -ra SUBDOMAIN_ARRAY <<< "$subdomains"
    for subdomain in "${SUBDOMAIN_ARRAY[@]}"; do
        subdomain=$(echo "$subdomain" | xargs) # trim whitespace
        if [ -n "$subdomain" ]; then
            local full_domain="${subdomain}.${domain_name}"
            print_status "Processing subdomain: $full_domain"
            enable_dnssec_for_zone "$full_domain" "$region"
        fi
    done
}

# Main script
main() {
    local domain_name=${1:-"dragon0.com"}
    local subdomains=${2:-"staging,api"}
    local region=${3:-"us-east-1"}
    
    print_status "Starting DNSSEC signing enablement for all zones..."
    print_status "Domain: $domain_name"
    print_status "Subdomains: $subdomains"
    print_status "Region: $region"
    
    # Check prerequisites
    check_prerequisites
    
    # Enable DNSSEC signing for all zones
    enable_dnssec_signing "$domain_name" "$subdomains" "$region"
    
    print_success "DNSSEC signing enablement completed for all zones!"
    print_status "You can verify the status in the AWS Route53 console."
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
    echo "  $0                                    # Enable DNSSEC for dragon0.com, staging.dragon0.com, api.dragon0.com"
    echo "  $0 mydomain.com                       # Enable DNSSEC for mydomain.com and its subdomains"
    echo "  $0 mydomain.com dev,staging,prod      # Enable DNSSEC for mydomain.com and custom subdomains"
    echo "  $0 mydomain.com dev,staging us-west-2 # Enable DNSSEC in us-west-2 region"
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function with arguments
main "$@" 