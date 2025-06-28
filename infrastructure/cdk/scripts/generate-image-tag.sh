#!/bin/bash

# Docker Image Tag Generator for Plutus Voice Agent
# Generates tags for CI/CD pipeline with rollback capabilities

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Function to get version from package.json
get_package_version() {
    local package_json_path="$1"
    if [[ -f "$package_json_path" ]]; then
        node -e "console.log(require('$package_json_path').version)"
    else
        print_error "Package.json not found at $package_json_path"
        exit 1
    fi
}

# Function to get git commit hash
get_git_commit() {
    git rev-parse --short HEAD 2>/dev/null || echo "unknown"
}

# Function to get git commit hash (full)
get_git_commit_full() {
    git rev-parse HEAD 2>/dev/null || echo "unknown"
}

# Function to get build number from environment or generate one
get_build_number() {
    if [[ -n "$BUILD_NUMBER" ]]; then
        echo "$BUILD_NUMBER"
    elif [[ -n "$GITHUB_RUN_NUMBER" ]]; then
        echo "$GITHUB_RUN_NUMBER"
    elif [[ -n "$CIRCLE_BUILD_NUM" ]]; then
        echo "$CIRCLE_BUILD_NUM"
    else
        # Generate a timestamp-based build number
        date +%s
    fi
}

# Function to get branch name
get_branch_name() {
    git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown"
}

# Function to check if we're on a clean git state
check_git_clean() {
    if [[ -n "$(git status --porcelain)" ]]; then
        print_warning "Git working directory is not clean"
        return 1
    else
        print_status "Git working directory is clean"
        return 0
    fi
}

# Function to generate image tags
generate_image_tags() {
    local package_json_path="$1"
    local environment="$2"
    
    # Get version information
    local version=$(get_package_version "$package_json_path")
    local git_commit=$(get_git_commit)
    local git_commit_full=$(get_git_commit_full)
    local build_number=$(get_build_number)
    local branch=$(get_branch_name)
    local timestamp=$(date -u +%Y%m%d-%H%M%S)
    
    print_status "Generating image tags for environment: $environment"
    print_status "Version: $version"
    print_status "Git commit: $git_commit"
    print_status "Build number: $build_number"
    print_status "Branch: $branch"
    print_status "Timestamp: $timestamp"
    
    # Generate different tag formats for different purposes
    
    # 1. Primary tag for deployment (version-commit-build)
    local primary_tag="${version}-${git_commit}-${build_number}"
    
    # 2. Latest tag for the environment
    local latest_tag="latest-${environment}"
    
    # 3. Version tag for semantic versioning
    local version_tag="v${version}"
    
    # 4. Commit tag for git-based rollback
    local commit_tag="commit-${git_commit}"
    
    # 5. Build tag for build-based rollback
    local build_tag="build-${build_number}"
    
    # 6. Timestamp tag for time-based rollback
    local timestamp_tag="timestamp-${timestamp}"
    
    # 7. Branch tag for branch-based deployment
    local branch_tag="branch-${branch}"
    
    # Create tags array
    local tags=(
        "$primary_tag"
        "$latest_tag"
        "$version_tag"
        "$commit_tag"
        "$build_tag"
        "$timestamp_tag"
        "$branch_tag"
    )
    
    # For production, also add 'latest' tag
    if [[ "$environment" == "prod" ]]; then
        tags+=("latest")
    fi
    
    # Output tags to file
    local tags_file=".image-tags"
    printf "%s\n" "${tags[@]}" > "$tags_file"
    
    # Output primary tag to .image-tag (for backward compatibility)
    echo "$primary_tag" > ".image-tag"
    
    print_success "Generated image tags:"
    for tag in "${tags[@]}"; do
        echo "  - $tag"
    done
    
    print_success "Primary tag for deployment: $primary_tag"
    print_success "Tags saved to: $tags_file"
    print_success "Primary tag saved to: .image-tag"
    
    # Export primary tag for use in other scripts
    export IMAGE_TAG="$primary_tag"
    export IMAGE_TAGS_FILE="$tags_file"
    
    # Return the primary tag (clean output without colors)
    printf "%s" "$primary_tag"
}

# Function to validate environment
validate_environment() {
    local env="$1"
    case $env in
        dev|staging|prod)
            return 0
            ;;
        *)
            print_error "Invalid environment: $env. Must be one of: dev, staging, prod"
            exit 1
            ;;
    esac
}

# Function to show usage
usage() {
    echo "Usage: $0 [environment] [package.json_path]"
    echo ""
    echo "Arguments:"
    echo "  environment      Deployment environment (dev|staging|prod)"
    echo "  package.json_path Path to package.json file (default: ../../plutus/package.json)"
    echo ""
    echo "Environment Variables:"
    echo "  BUILD_NUMBER     Build number from CI/CD system"
    echo "  GITHUB_RUN_NUMBER GitHub Actions run number"
    echo "  CIRCLE_BUILD_NUM  CircleCI build number"
    echo ""
    echo "Examples:"
    echo "  $0 dev"
    echo "  $0 staging ../../plutus/package.json"
    echo "  $0 prod"
}

# Main script
main() {
    local environment=${1:-"dev"}
    local package_json_path=${2:-"../../plutus/package.json"}
    
    print_status "Starting Docker image tag generation..."
    
    # Validate environment
    validate_environment "$environment"
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi
    
    # Check git status (warn if not clean)
    check_git_clean || print_warning "Proceeding with unclean git state"
    
    # Generate image tags
    local primary_tag=$(generate_image_tags "$package_json_path" "$environment")
    
    print_success "Image tag generation completed successfully!"
    print_success "Primary tag: $primary_tag"
    
    # Output for CI/CD systems (clean output without colors)
    echo "$primary_tag"
    
    # Exit with success
    exit 0
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function
main "$@" 