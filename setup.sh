#!/bin/bash

# Aran MCP Sentinel - Setup Script
echo "🚀 Setting up Aran MCP Sentinel..."

# Check if required tools are installed
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    else
        echo "✅ $1 is installed"
    fi
}

echo "📋 Checking required tools..."
check_tool "go"
check_tool "bun"
check_tool "docker"
check_tool "docker-compose"

# Create environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please update the values as needed."
else
    echo "✅ .env file already exists"
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
go mod tidy
echo "✅ Backend dependencies installed"

# Install MCP server dependencies
echo "📦 Installing MCP server dependencies..."
cd ../mcp-server
bun install
echo "✅ MCP server dependencies installed"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
bun install
echo "✅ Frontend dependencies installed"

# Start database
echo "🗄️ Starting PostgreSQL database..."
cd ..
docker-compose up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose exec postgres psql -U postgres -d aran_mcp -f /docker-entrypoint-initdb.d/001_initial_schema.sql

echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Start the services: docker-compose up"
echo "3. Access the application at http://localhost:3000"
echo "4. API documentation at http://localhost:8080/health"
echo ""
echo "🔐 Default credentials:"
echo "Email: admin@aran-mcp.com"
echo "Password: admin123"
