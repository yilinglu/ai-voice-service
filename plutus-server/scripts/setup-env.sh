#!/bin/bash

# Plutus Server Environment Setup Script
# This script helps set up the environment configuration to fix startup errors

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo "=========================================="
echo "🔧 Plutus Server Environment Setup"
echo "=========================================="
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    print_warning ".env.local already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Keeping existing .env.local file"
        exit 0
    fi
fi

# Check if env.example exists
if [ ! -f "env.example" ]; then
    print_error "env.example file not found!"
    print_status "Please make sure you're in the plutus-server directory"
    exit 1
fi

print_status "Creating .env.local from env.example..."
cp env.example .env.local

print_success ".env.local file created!"
echo ""

print_status "🔑 Now you need to update .env.local with your actual API keys:"
echo ""
echo "1. Layercode API Key:"
echo "   - Go to: https://dash.layercode.com"
echo "   - Navigate to Settings"
echo "   - Copy your API Key"
echo ""
echo "2. Layercode Webhook Secret:"
echo "   - Go to: https://dash.layercode.com/pipelines/"
echo "   - Click on your pipeline"  
echo "   - In Webhook Settings, copy the Webhook Secret"
echo ""
echo "3. Google AI API Key:"
echo "   - Go to: https://makersuite.google.com/app/apikey"
echo "   - Create a new API key"
echo "   - Copy the generated key"
echo ""

read -p "Do you want to open .env.local for editing now? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    # Try different editors
    if command -v code &> /dev/null; then
        print_status "Opening .env.local in VS Code..."
        code .env.local
    elif command -v nano &> /dev/null; then
        print_status "Opening .env.local in nano..."
        nano .env.local
    elif command -v vi &> /dev/null; then
        print_status "Opening .env.local in vi..."
        vi .env.local
    else
        print_warning "No suitable editor found"
        print_status "Please manually edit .env.local with your API keys"
    fi
fi

echo ""
print_status "📋 Next steps:"
echo "1. Update .env.local with your actual API keys"
echo "2. Run: npm run validate"
echo "3. Run: npm run dev"
echo ""

print_status "💡 For testing, you can use placeholder values (server will start but API calls will fail):"
echo ""
echo "LAYERCODE_API_KEY=test-layercode-api-key-placeholder"
echo "LAYERCODE_WEBHOOK_SECRET=test-layercode-webhook-secret-placeholder"  
echo "GOOGLE_GENERATIVE_AI_API_KEY=test-google-ai-api-key-placeholder"
echo ""

print_success "Environment setup completed!"
print_status "Documentation available in: ENVIRONMENT_SETUP.md" 