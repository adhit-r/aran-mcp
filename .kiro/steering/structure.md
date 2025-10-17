# Project Structure & Organization

## Root Level Organization
```
aran-mcp-sentinel/
├── backend/           # Go API server
├── frontend/          # Next.js web application
├── mcp-server/        # Node.js MCP server implementation
├── nginx/             # Reverse proxy configuration
├── docs/              # Project documentation
├── scripts/           # Deployment and setup scripts
└── docker-compose.yml # Development orchestration
```

## Backend Structure (Go)
```
backend/
├── cmd/server/        # Application entry points
│   ├── main.go        # Primary server entry
│   └── main-simple.go # Simplified server variant
├── internal/          # Private application code
│   ├── auth/          # Authentication (Authelia integration)
│   ├── config/        # Configuration management
│   ├── database/      # Database connection and models
│   ├── discovery/     # MCP server discovery
│   ├── mcp/           # MCP-specific handlers
│   ├── middleware/    # HTTP middleware
│   ├── models/        # Data models
│   ├── monitoring/    # Health monitoring
│   ├── registry/      # Server registry
│   ├── repository/    # Data access layer
│   ├── security/      # Security analysis
│   └── supabase/      # Supabase client
├── configs/           # Configuration files
├── migrations/        # Database migrations
├── go.mod            # Go module definition
└── Dockerfile        # Container build
```

## Frontend Structure (Next.js)
```
frontend/
├── src/
│   ├── app/           # App Router pages and layouts
│   │   ├── api/       # API routes
│   │   ├── dashboard/ # Dashboard pages
│   │   ├── login/     # Authentication pages
│   │   └── layout.tsx # Root layout
│   ├── components/    # Reusable UI components
│   │   ├── ui/        # Base UI components (Radix)
│   │   ├── auth/      # Authentication components
│   │   ├── charts/    # Data visualization
│   │   ├── dashboard/ # Dashboard-specific components
│   │   ├── security/  # Security analysis components
│   │   └── servers/   # Server management components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utility functions and API client
│   ├── types/         # TypeScript type definitions
│   └── contexts/      # React contexts
├── public/            # Static assets
├── package.json       # Node.js dependencies
└── Dockerfile         # Container build
```

## Architecture Patterns

### Backend Patterns
- **Clean Architecture**: Separation of concerns with internal packages
- **Repository Pattern**: Data access abstraction in `repository/` and `database/`
- **Handler Pattern**: HTTP handlers organized by domain (mcp, auth, monitoring)
- **Middleware Chain**: Security, logging, and validation middleware
- **Configuration**: Centralized config with environment variable support

### Frontend Patterns
- **App Router**: Next.js 13+ file-based routing in `src/app/`
- **Component Composition**: Radix UI primitives with custom styling
- **Server State**: TanStack Query for API data management
- **Type Safety**: Comprehensive TypeScript coverage
- **Design System**: Consistent UI components in `components/ui/`

### File Naming Conventions
- **Backend**: Snake_case for files, PascalCase for types
- **Frontend**: kebab-case for files, PascalCase for components
- **Components**: One component per file, named exports preferred
- **API Routes**: RESTful naming in `app/api/` directory

### Import Organization
- **Backend**: Standard library → Third party → Internal packages
- **Frontend**: React/Next → Third party → Internal components → Types

### Configuration Management
- **Backend**: YAML files in `configs/` with environment variable substitution
- **Frontend**: Environment variables with `NEXT_PUBLIC_` prefix for client-side
- **Docker**: Environment-specific compose files and .env files

### Security Considerations
- All authentication handled via Authelia (no JWT in application code)
- Input validation at API boundaries
- CORS configuration for allowed origins
- Rate limiting and security headers via middleware
- Sensitive data excluded from client-side bundles