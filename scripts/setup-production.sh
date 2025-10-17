#!/bin/bash

# Aran MCP Sentinel - Production Setup Script
# This script prepares the application for production deployment

set -e

echo "🚀 Setting up Aran MCP Sentinel for Production..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    echo "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if ! command -v go &> /dev/null; then
        print_error "Go is not installed. Please install Go 1.21+ first."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    print_status "All dependencies are installed"
}

# Generate secure secrets
generate_secrets() {
    echo "Generating secure secrets..."
    
    # Generate JWT secret (32 characters)
    JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    
    # Generate database password (16 characters)
    DB_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
    
    print_status "Secrets generated"
}

# Create production environment file
create_env_file() {
    echo "Creating production environment file..."
    
    if [ -f .env ]; then
        print_warning ".env file already exists. Creating .env.production instead."
        ENV_FILE=".env.production"
    else
        ENV_FILE=".env"
    fi
    
    cat > $ENV_FILE << EOF
# Production Environment Configuration
# Generated on $(date)

# Database Configuration
POSTGRES_DB=aran_mcp_prod
POSTGRES_USER=aran_user
POSTGRES_PASSWORD=$DB_PASSWORD

# JWT Configuration
JWT_SECRET=$JWT_SECRET

# API Configuration
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1

# Clerk Authentication (Replace with your keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_key_here
CLERK_SECRET_KEY=sk_live_your_key_here

# Supabase (Optional - for legacy support)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# Environment
NODE_ENV=production
GO_ENV=production

# Security
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
RATE_LIMIT_REQUESTS_PER_MINUTE=60

# Monitoring
LOG_LEVEL=warn
ENABLE_METRICS=true

# SSL/TLS (for production)
ENABLE_HTTPS=true
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
SSL_KEY_PATH=/etc/ssl/private/key.pem
EOF
    
    print_status "Environment file created: $ENV_FILE"
    print_warning "Please update the placeholder values in $ENV_FILE"
}

# Build production images
build_images() {
    echo "Building production Docker images..."
    
    # Build backend
    print_status "Building backend image..."
    docker build -t aran-mcp-backend:latest ./backend
    
    # Build frontend
    print_status "Building frontend image..."
    docker build -t aran-mcp-frontend:latest ./frontend
    
    # Build MCP server
    print_status "Building MCP server image..."
    docker build -t aran-mcp-server:latest ./mcp-server
    
    print_status "All images built successfully"
}

# Create production docker-compose file
create_production_compose() {
    echo "Creating production docker-compose file..."
    
    cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: aran-mcp-postgres-prod
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: aran-mcp-redis-prod
    ports:
      - "6379:6379"
    volumes:
      - redis_data_prod:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Backend API
  backend:
    image: aran-mcp-backend:latest
    container_name: aran-mcp-backend-prod
    environment:
      - ENV=production
      - SERVER_PORT=8080
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=${POSTGRES_USER}
      - DB_PASSWORD=${POSTGRES_PASSWORD}
      - DB_NAME=${POSTGRES_DB}
      - DB_SSL_MODE=disable
      - JWT_SECRET=${JWT_SECRET}
      - JWT_ACCESS_EXPIRY=15
      - JWT_REFRESH_EXPIRY=168
      - LOG_LEVEL=${LOG_LEVEL:-warn}
      - CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS}
      - RATE_LIMIT_REQUESTS_PER_MINUTE=${RATE_LIMIT_REQUESTS_PER_MINUTE:-60}
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  # Frontend
  frontend:
    image: aran-mcp-frontend:latest
    container_name: aran-mcp-frontend-prod
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
      - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped

  # MCP Server
  mcp-server:
    image: aran-mcp-server:latest
    container_name: aran-mcp-server-prod
    ports:
      - "3001:3001"
    restart: unless-stopped

  # Nginx Reverse Proxy (Optional)
  nginx:
    image: nginx:alpine
    container_name: aran-mcp-nginx-prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data_prod:
  redis_data_prod:
EOF
    
    print_status "Production docker-compose file created"
}

# Create nginx configuration
create_nginx_config() {
    echo "Creating Nginx configuration..."
    
    mkdir -p nginx
    
    cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }
    
    upstream backend {
        server backend:8080;
    }
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=frontend:10m rate=30r/s;
    
    server {
        listen 80;
        server_name _;
        
        # Redirect HTTP to HTTPS in production
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name _;
        
        # SSL Configuration (update paths for your certificates)
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        
        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Frontend routes
        location / {
            limit_req zone=frontend burst=50 nodelay;
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF
    
    print_status "Nginx configuration created"
}

# Create health check script
create_health_check() {
    echo "Creating health check script..."
    
    cat > scripts/health-check.sh << 'EOF'
#!/bin/bash

# Health check script for Aran MCP Sentinel

check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo "Checking $service_name..."
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        echo "✓ $service_name is healthy (HTTP $response)"
        return 0
    else
        echo "✗ $service_name is unhealthy (HTTP $response)"
        return 1
    fi
}

echo "🏥 Running health checks..."

# Check backend
check_service "Backend API" "http://localhost:8080/health"

# Check frontend
check_service "Frontend" "http://localhost:3000"

# Check MCP server
check_service "MCP Server" "http://localhost:3001"

echo "Health check completed."
EOF
    
    chmod +x scripts/health-check.sh
    print_status "Health check script created"
}

# Create deployment script
create_deployment_script() {
    echo "Creating deployment script..."
    
    cat > scripts/deploy.sh << 'EOF'
#!/bin/bash

# Deployment script for Aran MCP Sentinel

set -e

echo "🚀 Deploying Aran MCP Sentinel..."

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
elif [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ No environment file found. Please run setup-production.sh first."
    exit 1
fi

# Build and deploy
echo "Building images..."
docker-compose -f docker-compose.prod.yml build

echo "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

echo "Waiting for services to start..."
sleep 30

echo "Running health checks..."
./scripts/health-check.sh

echo "✅ Deployment completed successfully!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8080"
echo "📊 Health: http://localhost:8080/health"
EOF
    
    chmod +x scripts/deploy.sh
    print_status "Deployment script created"
}

# Main execution
main() {
    echo "🚀 Aran MCP Sentinel Production Setup"
    echo "======================================"
    
    check_dependencies
    generate_secrets
    create_env_file
    create_production_compose
    create_nginx_config
    create_health_check
    create_deployment_script
    
    echo ""
    echo "✅ Production setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Update the environment variables in .env or .env.production"
    echo "2. Add your SSL certificates to nginx/ssl/ directory"
    echo "3. Run: ./scripts/deploy.sh"
    echo ""
    print_warning "Important: Review all configuration files before deploying to production!"
}

# Create scripts directory if it doesn't exist
mkdir -p scripts

# Run main function
main