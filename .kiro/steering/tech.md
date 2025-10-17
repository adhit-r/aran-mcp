# Technology Stack & Build System

## Backend (Go)
- **Language**: Go 1.24+ (uses latest Go features)
- **Framework**: Gin web framework for HTTP routing
- **Database**: PostgreSQL via Supabase with sqlx for queries
- **Authentication**: Authelia integration (JWT removed in favor of Authelia)
- **Configuration**: Viper with YAML config files
- **Logging**: Zap structured logging
- **Containerization**: Docker with multi-stage builds

### Backend Dependencies
- `github.com/gin-gonic/gin` - HTTP web framework
- `github.com/jmoiron/sqlx` - SQL extensions
- `github.com/lib/pq` - PostgreSQL driver
- `github.com/spf13/viper` - Configuration management
- `go.uber.org/zap` - Structured logging
- `github.com/supabase-community/supabase-go` - Supabase client

## Frontend (Next.js)
- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript 5+
- **UI Framework**: React 19
- **Styling**: Tailwind CSS 4 with custom design system
- **Components**: Radix UI primitives + custom components
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Authentication**: Clerk integration
- **Charts**: Recharts for data visualization

### Frontend Dependencies
- `next` - React framework with App Router
- `@clerk/nextjs` - Authentication provider
- `@tanstack/react-query` - Server state management
- `@radix-ui/*` - Headless UI components
- `tailwindcss` - Utility-first CSS framework
- `react-hook-form` + `zod` - Form handling and validation

## Infrastructure
- **Database**: Supabase (managed PostgreSQL)
- **Reverse Proxy**: Nginx with Authelia integration
- **Containerization**: Docker Compose for development
- **Cache**: Redis for session management

## Common Commands

### Backend Development
```bash
# Navigate to backend
cd backend

# Install dependencies
go mod download

# Run development server
go run cmd/server/main.go

# Build binary
go build -o bin/mcp-sentinel cmd/server/main.go

# Run tests
go test ./...

# Format code
go fmt ./...
```

### Frontend Development
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run development server (with Turbopack)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Docker Development
```bash
# Start all services
docker-compose up --build

# Start specific service
docker-compose up backend
docker-compose up frontend

# View logs
docker-compose logs -f backend
```

## Configuration Patterns
- Backend uses YAML configuration with environment variable substitution
- Frontend uses Next.js environment variables (NEXT_PUBLIC_ prefix for client-side)
- Docker Compose handles service orchestration and networking
- Authelia handles authentication via Nginx proxy (no JWT tokens in application code)