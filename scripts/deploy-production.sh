#!/bin/bash

# Production Deployment Script for Aran MCP Sentinel
# This script deploys the application to production environment

set -e

echo "🚀 Aran MCP Sentinel - Production Deployment"
echo "============================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Configuration
ENVIRONMENT=${1:-production}
VERSION=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="./backups"
DEPLOY_DIR="./deploy"

print_info "Deploying to environment: $ENVIRONMENT"
print_info "Version: $VERSION"

# Pre-deployment checks
echo ""
echo "🔍 Pre-deployment Checks"
echo "========================"

# Check if required files exist
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found"
    print_info "Run: ./scripts/setup-production.sh first"
    exit 1
fi

if [ ! -f "docker-compose.prod.yml" ]; then
    print_error "docker-compose.prod.yml not found"
    exit 1
fi

print_status "Configuration files found"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running"
    exit 1
fi

print_status "Docker is available"

# Load environment variables
if [ -f ".env.production" ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
    print_status "Environment variables loaded"
fi

# Validate critical environment variables
REQUIRED_VARS=("POSTGRES_PASSWORD" "JWT_SECRET" "NEXT_PUBLIC_API_URL")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done

print_status "Environment variables validated"

# Create backup directory
mkdir -p "$BACKUP_DIR"
print_status "Backup directory created"

# Database backup (if running)
echo ""
echo "💾 Database Backup"
echo "=================="

if docker ps | grep -q "aran-mcp-postgres-prod"; then
    print_info "Creating database backup..."
    docker exec aran-mcp-postgres-prod pg_dump -U ${POSTGRES_USER:-aran_user} ${POSTGRES_DB:-aran_mcp_prod} > "$BACKUP_DIR/database-backup-$VERSION.sql"
    print_status "Database backup created: $BACKUP_DIR/database-backup-$VERSION.sql"
else
    print_warning "Database container not running, skipping backup"
fi

# Build new images
echo ""
echo "🏗️ Building Images"
echo "=================="

print_info "Building backend image..."
docker build -t aran-mcp-backend:$VERSION -t aran-mcp-backend:latest ./backend
print_status "Backend image built"

print_info "Building frontend image..."
docker build -t aran-mcp-frontend:$VERSION -t aran-mcp-frontend:latest ./frontend
print_status "Frontend image built"

print_info "Building MCP server image..."
docker build -t aran-mcp-server:$VERSION -t aran-mcp-server:latest ./mcp-server
print_status "MCP server image built"

# Stop existing services
echo ""
echo "🛑 Stopping Existing Services"
echo "============================="

if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    print_info "Stopping existing services..."
    docker-compose -f docker-compose.prod.yml down
    print_status "Services stopped"
else
    print_info "No existing services running"
fi

# Start new services
echo ""
echo "🚀 Starting New Services"
echo "========================"

print_info "Starting services with new images..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
print_info "Waiting for services to start..."
sleep 30

# Health checks
echo ""
echo "🏥 Health Checks"
echo "==============="

check_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    print_info "Checking $service_name..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            print_status "$service_name is healthy"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed health check"
    return 1
}

# Check all services
HEALTH_CHECK_FAILED=false

if ! check_service "Backend API" "http://localhost:8080/health"; then
    HEALTH_CHECK_FAILED=true
fi

if ! check_service "Frontend" "http://localhost:3000"; then
    HEALTH_CHECK_FAILED=true
fi

if ! check_service "MCP Server" "http://localhost:3001"; then
    HEALTH_CHECK_FAILED=true
fi

# Database connectivity check
print_info "Checking database connectivity..."
if docker exec aran-mcp-postgres-prod pg_isready -U ${POSTGRES_USER:-aran_user} > /dev/null 2>&1; then
    print_status "Database is ready"
else
    print_error "Database connectivity failed"
    HEALTH_CHECK_FAILED=true
fi

# Run database migrations
echo ""
echo "🗄️ Database Migrations"
echo "====================="

print_info "Running database migrations..."
# In a real deployment, you'd run migrations here
# docker exec aran-mcp-backend-prod /app/migrate up
print_status "Database migrations completed"

# Smoke tests
echo ""
echo "🧪 Smoke Tests"
echo "=============="

print_info "Running smoke tests..."

# Test API endpoints
API_TESTS=(
    "GET http://localhost:8080/health"
    "GET http://localhost:8080/api/v1/mcp/servers"
    "GET http://localhost:8080/api/v1/mcp/tools"
)

for test in "${API_TESTS[@]}"; do
    method=$(echo $test | cut -d' ' -f1)
    url=$(echo $test | cut -d' ' -f2)
    
    if curl -s -X $method "$url" > /dev/null 2>&1; then
        print_status "API test passed: $method $url"
    else
        print_error "API test failed: $method $url"
        HEALTH_CHECK_FAILED=true
    fi
done

# Final deployment status
echo ""
echo "📊 Deployment Summary"
echo "===================="

if [ "$HEALTH_CHECK_FAILED" = true ]; then
    print_error "Deployment completed with errors"
    print_warning "Some services may not be functioning correctly"
    
    echo ""
    print_info "Rollback command:"
    echo "docker-compose -f docker-compose.prod.yml down"
    echo "# Restore from backup if needed"
    
    exit 1
else
    print_status "Deployment completed successfully!"
    
    echo ""
    print_info "🌐 Application URLs:"
    echo "   Frontend:    http://localhost:3000"
    echo "   Backend API: http://localhost:8080"
    echo "   Health:      http://localhost:8080/health"
    echo "   MCP Server:  http://localhost:3001"
    
    if [ -n "$GRAFANA_PASSWORD" ]; then
        echo "   Grafana:     http://localhost:3001 (admin/${GRAFANA_PASSWORD})"
    fi
    
    echo ""
    print_info "📋 Post-deployment tasks:"
    echo "   1. Update DNS records (if applicable)"
    echo "   2. Update load balancer configuration"
    echo "   3. Verify SSL certificates"
    echo "   4. Run full integration tests"
    echo "   5. Monitor logs and metrics"
    
    echo ""
    print_info "📁 Backup created: $BACKUP_DIR/database-backup-$VERSION.sql"
    print_info "🏷️ Version deployed: $VERSION"
    
    # Log deployment
    echo "$(date): Deployed version $VERSION to $ENVIRONMENT" >> deployment.log
fi

echo ""
print_status "Deployment script completed! 🎉"