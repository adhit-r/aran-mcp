#!/bin/bash

# Aran MCP Sentinel - Quick Start Script
# This script gets you up and running quickly for development

set -e

echo "🚀 Aran MCP Sentinel - Quick Start"
echo "=================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Docker is running"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_warning "Creating .env file from example..."
    cp .env.example .env
    
    # Generate a random JWT secret
    JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    sed -i.bak "s/your-super-secret-jwt-key-minimum-32-characters/$JWT_SECRET/" .env
    rm .env.bak 2>/dev/null || true
    
    print_status ".env file created with secure JWT secret"
    print_warning "Please update other values in .env file as needed"
fi

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose down > /dev/null 2>&1 || true

# Build and start services
echo "Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Check service health
check_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    echo "Checking $service_name..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            print_status "$service_name is ready"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start"
    return 1
}

# Check all services
echo "Performing health checks..."

check_service "Backend API" "http://localhost:8080/health"
check_service "Frontend" "http://localhost:3000"
check_service "MCP Server" "http://localhost:3001"

echo ""
print_status "All services are running!"

echo ""
echo "🌐 Access your application:"
echo "   Frontend:    http://localhost:3000"
echo "   Backend API: http://localhost:8080"
echo "   API Health:  http://localhost:8080/health"
echo "   MCP Server:  http://localhost:3001"
echo ""
echo "📚 Next steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Sign up for a new account or sign in"
echo "   3. Start adding MCP servers to monitor"
echo ""
echo "🛠 Development commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart:       docker-compose restart"
echo ""
print_status "Setup complete! Happy monitoring! 🎉"