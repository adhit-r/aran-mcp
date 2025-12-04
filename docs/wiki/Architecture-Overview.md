# Architecture Overview

This document provides a high-level overview of the Aran MCP Sentinel architecture.

## System Architecture

Aran MCP Sentinel follows a microservices-oriented architecture with clear separation between frontend, backend, and data layers.

### High-Level Components

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│  Next.js 14 (React, TypeScript, Tailwind CSS)           │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/REST API
                          │
┌─────────────────────────────────────────────────────────┐
│                    Backend Layer                         │
│  Go 1.22+ (Gin Framework)                              │
│  ├── Authentication & Authorization                     │
│  ├── MCP Server Management                             │
│  ├── Discovery & Monitoring                            │
│  ├── Security Testing                                  │
│  └── API Gateway                                       │
└─────────────────────────────────────────────────────────┘
                          │
                          │ SQL
                          │
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│  PostgreSQL (via Supabase)                             │
│  ├── Organizations & Users                              │
│  ├── MCP Servers & Tools                               │
│  ├── Security Tests & Results                          │
│  └── Monitoring & Alerts                                │
└─────────────────────────────────────────────────────────┘
```

## Backend Architecture

### Package Structure

```
backend/
├── cmd/server/          # Application entry point
├── internal/
│   ├── auth/           # Authentication handlers
│   ├── config/         # Configuration management
│   ├── database/       # Database models and connection
│   ├── discovery/      # MCP server discovery
│   ├── mcp/            # MCP protocol implementation
│   ├── monitoring/     # Health monitoring
│   ├── security/       # Security testing
│   └── middleware/     # HTTP middleware
├── configs/            # Configuration files
└── migrations/         # Database migrations
```

### Key Components

#### Authentication Layer
- Multiple authentication providers (JWT, Clerk, Authelia, Neon Auth)
- Role-based access control (RBAC)
- API key management
- Session management

#### MCP Management
- Server CRUD operations
- Server discovery and registration
- Tool and resource management
- Capability analysis

#### Security Testing
- OWASP MCP Top 10 compliance
- Prompt injection detection
- Tool poisoning detection
- Vulnerability assessment

#### Monitoring
- Health checks
- Performance monitoring
- Alert management
- Event tracking

## Frontend Architecture

### Technology Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5.0+
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **State Management**: React Query
- **Forms**: React Hook Form with Zod

### Component Structure

```
frontend/src/
├── app/                # Next.js app router pages
├── components/         # React components
│   ├── ui/           # Base UI components
│   ├── servers/       # Server management
│   ├── security/      # Security features
│   └── monitoring/    # Monitoring dashboards
├── lib/               # Utility libraries
└── types/             # TypeScript types
```

## Data Model

### Core Entities

- **Organizations**: Top-level tenant entity
- **Users**: User accounts with roles
- **MCP Servers**: Registered MCP server instances
- **Tools**: MCP tools exposed by servers
- **Resources**: MCP resources
- **Security Tests**: Test executions and results
- **Alerts**: Monitoring alerts and notifications

### Relationships

- Organizations have many Users
- Organizations have many MCP Servers
- MCP Servers have many Tools, Resources, Prompts
- Security Tests belong to Servers
- Alerts belong to Organizations and Servers

## Security Architecture

### Authentication Flow

1. User authenticates via chosen provider
2. Token is validated
3. User context is set in request
4. Authorization checks are performed
5. Request is processed

### Authorization Model

- Role-based access control (RBAC)
- Permission-based checks
- Resource-level authorization
- Audit logging for all actions

## Deployment Architecture

### Development
- Single instance deployment
- Local database
- Development mode

### Production
- Containerized deployment (Docker)
- Load balanced instances
- Managed PostgreSQL
- CDN for static assets
- Monitoring and logging

## Scalability Considerations

### Horizontal Scaling
- Stateless backend services
- Database connection pooling
- Caching layer (Redis)
- Load balancing

### Performance Optimization
- Database query optimization
- Response caching
- CDN for static assets
- Image optimization

## Monitoring and Observability

### Metrics
- Application metrics (Prometheus)
- Business metrics
- Performance metrics

### Logging
- Structured logging (Zap)
- Centralized log aggregation
- Log retention policies

### Tracing
- Distributed tracing
- Request correlation
- Performance analysis

## For More Information

- [System Architecture Details](../architecture/SYSTEM_ARCHITECTURE.md)
- [Security Architecture](../security/SECURITY_ARCHITECTURE.md)
- [API Documentation](API-Reference)
- [Database Schema](Database-Schema)

