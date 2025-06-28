#!/bin/bash

# Domain Preparation Script for Plutus Infrastructure
# Checks and prepares Route53 setup for dragon0.com

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

# Function to check domain registration
check_domain_registration() {
    local domain_name=$1
    
    print_status "Checking domain registration for $domain_name..."
    
    # Check if domain is registered in Route53
    local domain_info=$(aws route53domains get-domain-detail --domain-name "$domain_name" 2>/dev/null || echo "")
    
    if [[ -z "$domain_info" ]]; then
        print_warning "Domain $domain_name is not registered in Route53 Domains"
        print_warning "If you registered it elsewhere, you'll need to create a hosted zone manually"
        return 1
    else
        print_success "Domain $domain_name is registered in Route53 Domains"
        return 0
    fi
}

# Function to check hosted zone
check_hosted_zone() {
    local domain_name=$1
    
    print_status "Checking hosted zone for $domain_name..."
    
    # Check if hosted zone exists
    local hosted_zones=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='$domain_name.']" --output json)
    local zone_count=$(echo "$hosted_zones" | jq 'length')
    
    if [[ "$zone_count" -eq 0 ]]; then
        print_warning "No hosted zone found for $domain_name"
        return 1
    else
        local zone_id=$(echo "$hosted_zones" | jq -r '.[0].Id' | sed 's/\/hostedzone\///')
        print_success "Hosted zone found: $zone_id"
        echo "$zone_id"
        return 0
    fi
}

# Function to create hosted zone
create_hosted_zone() {
    local domain_name=$1
    
    print_status "Creating hosted zone for $domain_name..."
    
    # Create the hosted zone
    local result=$(aws route53 create-hosted-zone \
        --name "$domain_name" \
        --caller-reference "$(date +%s)" \
        --output json)
    
    local zone_id=$(echo "$result" | jq -r '.HostedZone.Id' | sed 's/\/hostedzone\///')
    local name_servers=$(echo "$result" | jq -r '.DelegationSet.NameServers[]')
    
    print_success "Hosted zone created: $zone_id"
    print_status "Name servers for $domain_name:"
    echo "$name_servers" | while read -r ns; do
        echo "  $ns"
    done
    
    print_warning "IMPORTANT: Update your domain's name servers at your registrar to point to the servers above"
    
    echo "$zone_id"
}

# Function to check existing DNS records
check_dns_records() {
    local domain_name=$1
    local zone_id=$2
    
    print_status "Checking existing DNS records for $domain_name..."
    
    local records=$(aws route53 list-resource-record-sets \
        --hosted-zone-id "$zone_id" \
        --output json)
    
    local record_count=$(echo "$records" | jq '.ResourceRecordSets | length')
    
    if [[ "$record_count" -eq 0 ]]; then
        print_status "No DNS records found (this is normal for a new domain)"
    else
        print_status "Found $record_count DNS record(s):"
        echo "$records" | jq -r '.ResourceRecordSets[] | "  \(.Name) (\(.Type))"'
    fi
}

# Function to check DNSSEC status
check_dnssec_status() {
    local zone_id=$1
    local domain_name=$2
    
    print_status "Checking DNSSEC status for apex domain ($domain_name)..."
    
    # Check if DNSSEC is enabled
    local dnssec_status=$(aws route53 get-dnssec-status --hosted-zone-id "$zone_id" --output json 2>/dev/null || echo "")
    
    if [[ -z "$dnssec_status" ]]; then
        print_warning "DNSSEC status could not be determined"
        print_warning "DNSSEC will be enabled for apex domain and all subdomains during deployment"
        return 1
    else
        local status=$(echo "$dnssec_status" | jq -r '.Status')
        if [[ "$status" == "ENABLED" ]]; then
            print_success "DNSSEC is already enabled for apex domain ($domain_name)"
            
            # Check for key signing keys
            local ksk_count=$(echo "$dnssec_status" | jq -r '.KeySigningKeys | length')
            if [[ "$ksk_count" -gt 0 ]]; then
                print_success "Found $ksk_count active key signing key(s)"
            else
                print_warning "No active key signing keys found"
            fi
            return 0
        else
            print_warning "DNSSEC is not enabled for apex domain (status: $status)"
            print_warning "DNSSEC will be enabled for apex domain and all subdomains during deployment"
            return 1
        fi
    fi
}

# Function to show domain setup summary
show_domain_summary() {
    local domain_name=$1
    local zone_id=$2
    
    print_success "Domain setup summary:"
    echo "Domain: $domain_name"
    echo "Hosted Zone ID: $zone_id"
    echo ""
    print_status "Subdomains that will be created:"
    echo "  staging.$domain_name  → Staging environment"
    echo "  api.$domain_name      → Production environment"
    echo ""
    print_status "SSL certificates will be automatically created for:"
    echo "  staging.$domain_name"
    echo "  api.$domain_name"
    echo ""
    print_status "DNSSEC will be enabled for:"
    echo "  $domain_name (apex domain)"
    echo "  All subdomains (staging.$domain_name, api.$domain_name)"
    echo ""
    print_warning "Remember to update your domain's name servers if you just created the hosted zone"
}

# Main script
main() {
    local domain_name=${1:-"dragon0.com"}
    
    print_status "Preparing domain setup for $domain_name..."
    
    # Check prerequisites
    check_aws_config
    
    # Check domain registration
    if ! check_domain_registration "$domain_name"; then
        print_warning "Domain registration check failed, but continuing..."
    fi
    
    # Check or create hosted zone
    local zone_id
    if zone_id=$(check_hosted_zone "$domain_name"); then
        print_success "Hosted zone already exists"
    else
        print_status "Creating hosted zone..."
        zone_id=$(create_hosted_zone "$domain_name")
    fi
    
    # Check existing DNS records
    check_dns_records "$domain_name" "$zone_id"
    
    # Check DNSSEC status
    check_dnssec_status "$zone_id" "$domain_name"
    
    # Show summary
    show_domain_summary "$domain_name" "$zone_id"
    
    print_success "Domain preparation completed!"
    print_status "You can now run: ./scripts/deploy.sh staging"
    print_status "Or: ./scripts/deploy.sh prod"
}

# Script usage
usage() {
    echo "Usage: $0 [domain_name]"
    echo ""
    echo "Arguments:"
    echo "  domain_name   Domain name to prepare [default: dragon0.com]"
    echo ""
    echo "Examples:"
    echo "  $0                    # Prepare dragon0.com"
    echo "  $0 mydomain.com       # Prepare mydomain.com"
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function with arguments
main "$@" 