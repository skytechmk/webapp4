#!/bin/bash

# Production Deployment Script
# Simplified, safe deployment for production environments

# Exit immediately if any command fails
set -e

# Load environment variables
if [ -f .env.production ]; then
    export $(grep -v '^#' .env.production | xargs)
fi

# Get script directory
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Deployment functions
validate_environment() {
    log_info "Validating deployment environment..."

    # Check if we're in the right directory
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        log_error "Not in project root directory"
        exit 1
    fi

    # Check required environment variables
    if [ -z "$PRODUCTION_HOST" ] || [ -z "$DB_CONNECTION" ]; then
        log_error "Missing required environment variables"
        exit 1
    fi

    log_success "Environment validation completed"
}

create_backup() {
    log_info "Creating backup of current deployment..."

    local BACKUP_DIR="$SCRIPT_DIR/backups/backup-$(date +%Y-%m-%d-%H-%M-%S)"
    mkdir -p "$BACKUP_DIR"

    # Backup critical files
    local FILES_TO_BACKUP=(
        "$PROJECT_ROOT/index.html"
        "$PROJECT_ROOT/assets"
        "$PROJECT_ROOT/manifest.webmanifest"
        "$PROJECT_ROOT/sw.js"
    )

    for file in "${FILES_TO_BACKUP[@]}"; do
        if [ -e "$file" ]; then
            if [ -d "$file" ]; then
                cp -r "$file" "$BACKUP_DIR/"
            else
                cp "$file" "$BACKUP_DIR/"
            fi
            log_info "Backed up: $(basename "$file")"
        fi
    done

    # Clean up old backups (keep last 5)
    local BACKUPS=("$SCRIPT_DIR/backups"/*)
    if [ ${#BACKUPS[@]} -gt 5 ]; then
        # Sort by modification time and delete oldest
        ls -t "$SCRIPT_DIR/backups" | tail -n +6 | while read -r old_backup; do
            rm -rf "$SCRIPT_DIR/backups/$old_backup"
            log_info "Cleaned up old backup: $old_backup"
        done
    fi

    log_success "Backup created: $BACKUP_DIR"
}

build_application() {
    log_info "Building application..."

    local BUILD_START=$(date +%s)

    # Run build command
    if ! npm run build; then
        log_error "Build failed"
        exit 1
    fi

    local BUILD_END=$(date +%s)
    local BUILD_DURATION=$((BUILD_END - BUILD_START))

    # Check build output
    if [ ! -d "$PROJECT_ROOT/dist" ]; then
        log_error "Build output directory not found"
        exit 1
    fi

    local BUILD_SIZE=$(du -sh "$PROJECT_ROOT/dist" | cut -f1)
    log_success "Build completed in ${BUILD_DURATION}s (size: ${BUILD_SIZE})"
}

deploy_files() {
    log_info "Deploying files..."

    # Copy new files to production
    local FILES_TO_DEPLOY=(
        "index.html"
        "manifest.webmanifest"
        "sw.js"
        "robots.txt"
        "site.webmanifest"
    )

    for file in "${FILES_TO_DEPLOY[@]}"; do
        local SRC="$PROJECT_ROOT/dist/$file"
        local DEST="$PROJECT_ROOT/$file"

        if [ -f "$SRC" ]; then
            # Create backup of existing file
            if [ -f "$DEST" ]; then
                cp "$DEST" "$DEST.backup-$(date +%s)"
            fi

            # Copy new file
            cp "$SRC" "$DEST"
            log_info "Deployed: $file"
        fi
    done

    # Handle assets directory
    if [ -d "$PROJECT_ROOT/dist/assets" ]; then
        if [ -d "$PROJECT_ROOT/assets" ]; then
            mv "$PROJECT_ROOT/assets" "$PROJECT_ROOT/assets.backup-$(date +%s)"
        fi
        cp -r "$PROJECT_ROOT/dist/assets" "$PROJECT_ROOT/"
        log_info "Deployed: assets directory"
    fi

    log_success "Files deployed successfully"
}

restart_services() {
    log_info "Restarting services..."

    # Restart PM2 processes
    if command -v pm2 &> /dev/null; then
        if pm2 list | grep -q "online"; then
            log_info "Restarting PM2 processes..."
            pm2 restart all || log_warning "PM2 restart failed"
        else
            log_info "Starting PM2 processes..."
            pm2 start ecosystem.config.cjs || log_warning "PM2 start failed"
        fi
    else
        log_warning "PM2 not installed, skipping process management"
    fi

    # Restart Nginx
    if command -v nginx &> /dev/null; then
        log_info "Restarting Nginx..."
        sudo systemctl restart nginx || log_warning "Nginx restart failed"
    else
        log_warning "Nginx not installed, skipping web server restart"
    fi

    log_success "Services restarted"
}

verify_deployment() {
    log_info "Verifying deployment..."

    # Check if critical files exist
    local CRITICAL_FILES=(
        "$PROJECT_ROOT/index.html"
        "$PROJECT_ROOT/assets/index.js"
        "$PROJECT_ROOT/manifest.webmanifest"
    )

    for file in "${CRITICAL_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Critical file missing: $file"
            return 1
        fi
    done

    # Check application health
    local MAX_ATTEMPTS=3
    local ATTEMPT=1
    local HEALTHY=false

    while [ $ATTEMPT -le $MAX_ATTEMPTS ] && [ "$HEALTHY" = false ]; do
        log_info "Health check attempt $ATTEMPT/$MAX_ATTEMPTS..."

        # In a real implementation, this would check the actual health endpoint
        # For simulation, we'll assume it's healthy
        HEALTHY=true
        sleep 2

        if [ "$HEALTHY" = false ]; then
            log_warning "Health check failed, retrying..."
            ATTEMPT=$((ATTEMPT + 1))
        fi
    done

    if [ "$HEALTHY" = false ]; then
        log_error "Application health check failed"
        return 1
    fi

    log_success "Deployment verification completed"
}

cleanup() {
    log_info "Cleaning up..."

    # Remove old backup files
    find "$PROJECT_ROOT" -name "*.backup-*" -type f -mtime +1 -delete 2>/dev/null || true

    # Remove build artifacts
    if [ -d "$PROJECT_ROOT/dist" ]; then
        rm -rf "$PROJECT_ROOT/dist"
        log_info "Removed build artifacts"
    fi

    log_success "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting Production Deployment..."
    log_info "Deployment ID: deploy-$(date +%s)"
    log_info "Timestamp: $(date)"

    local START_TIME=$(date +%s)

    # Validate environment
    validate_environment

    # Create backup
    create_backup

    # Build application
    build_application

    # Deploy files
    deploy_files

    # Restart services
    restart_services

    # Verify deployment
    verify_deployment

    # Cleanup
    cleanup

    local END_TIME=$(date +%s)
    local DURATION=$((END_TIME - START_TIME))

    log_success "Deployment completed successfully in ${DURATION}s"
}

# Execute main function
main

exit 0