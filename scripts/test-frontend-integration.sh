#!/bin/bash

# Test script for frontend integration
# This script tests the new frontend components

set -e

echo "🎨 Testing Frontend Integration"
echo "=============================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_test() {
    echo -e "${YELLOW}Testing:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if services are running
print_test "Checking if services are running"

if curl -s -f "http://localhost:3000" > /dev/null; then
    print_success "Frontend is running"
else
    print_error "Frontend is not running. Please start with: npm run dev"
    exit 1
fi

if curl -s -f "http://localhost:8080/health" > /dev/null; then
    print_success "Backend is running"
else
    print_error "Backend is not running. Please start with: go run cmd/server/main.go"
    exit 1
fi

# Test API endpoints that frontend uses
print_test "Testing API endpoints"

# Test server list
if curl -s -f "http://localhost:8080/api/v1/mcp/servers" > /dev/null; then
    print_success "Server list endpoint working"
else
    print_error "Server list endpoint failed"
fi

# Test discovery endpoint
DISCOVERY_TEST=$(curl -s -X POST "http://localhost:8080/api/v1/mcp/discovery/scan" \
    -H "Content-Type: application/json" \
    -d '{"known_ports": [3001], "timeout_seconds": 2, "max_concurrent": 5}' || echo "failed")

if [[ "$DISCOVERY_TEST" != "failed" ]]; then
    print_success "Discovery endpoint working"
else
    print_error "Discovery endpoint failed"
fi

# Test tools endpoint
if curl -s -f "http://localhost:8080/api/v1/mcp/tools" > /dev/null; then
    print_success "Tools endpoint working"
else
    print_error "Tools endpoint failed"
fi

# Test monitoring endpoint
if curl -s -f "http://localhost:8080/api/v1/mcp/monitoring/status" > /dev/null; then
    print_success "Monitoring endpoint working"
else
    print_error "Monitoring endpoint failed"
fi

echo ""
echo "🎉 Frontend Integration Test Complete!"
echo ""
echo "📱 Access your enhanced dashboards:"
echo "   Main Dashboard:     http://localhost:3000/dashboard"
echo "   Enhanced Dashboard: http://localhost:3000/dashboard/enhanced"
echo "   Real Dashboard:     http://localhost:3000/dashboard/real"
echo ""
echo "🔧 Features to test:"
echo "   1. Server Discovery - Click 'Discover Servers'"
echo "   2. Server Management - Add/edit/monitor servers"
echo "   3. Tool Explorer - View and execute tools"
echo "   4. Real-time Monitoring - Live server status"
echo "   5. Auto-refresh - Toggle on/off in monitoring"
echo ""
echo "🚀 Your frontend is now connected to real MCP APIs!"