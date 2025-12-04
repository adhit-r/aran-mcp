# Aran MCP Sentinel

Enterprise-grade security and management platform for Model Context Protocol (MCP) deployments. Discover, monitor, secure, and manage MCP servers with comprehensive tooling and real-time threat detection.

## Overview

Aran MCP Sentinel provides comprehensive security, monitoring, and management capabilities for MCP server deployments. The platform enables organizations to discover, document, test, and secure MCP implementations with enterprise-grade tooling and real-time threat detection.

## Key Features

### Server Discovery and Catalog
- Automated discovery of MCP endpoints and services
- Comprehensive catalog of available MCP servers and tools
- Version tracking and compatibility management
- Service health monitoring and status reporting

### Interactive Documentation
- Swagger-like API documentation for MCP endpoints
- Tool and endpoint specifications with usage examples
- Versioned documentation history
- Code snippets and integration guides

### Security Testing and Analysis
- Comprehensive test suite for MCP implementations
- Automated security scanning and vulnerability assessment
- OWASP MCP Top 10 compliance checking
- Real-time threat detection and risk scoring
- Integration with CI/CD pipelines

### Health Monitoring
- Continuous uptime and performance monitoring
- Response time tracking and alerting
- Service availability metrics
- Historical trend analysis

### Enterprise Deployment
- Secure configuration templates
- Deployment best practices and guidelines
- Environment validation
- Rollback and recovery procedures

## Technology Stack

### Backend
- Language: Go 1.22+
- Web Framework: Gin
- Database: PostgreSQL (via Supabase)
- Authentication: JWT, Authelia, Clerk, Neon Auth
- Logging: Zap
- Configuration: YAML-based configuration
- Testing: Go Test
- Containerization: Docker

### Frontend
- Framework: Next.js 14 (App Router)
- Language: TypeScript 5.0+
- UI Library: React 18
- Styling: Tailwind CSS
- State Management: React Query
- Form Handling: React Hook Form with Zod validation
- UI Components: Radix UI with custom components
- Charts: Recharts
- Icons: Lucide React

### Infrastructure
- Database: Supabase (PostgreSQL)
- Deployment: Docker, Docker Compose, Kubernetes
- CI/CD: GitHub Actions
- Monitoring: Prometheus, Grafana

## Quick Start

### Prerequisites
- Go 1.22 or later
- Node.js 18 or later
- Docker (optional, for containerized deployment)
- PostgreSQL database (Supabase recommended)

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/adhit-r/aran-mcp.git
cd aran-mcp
```

2. Navigate to the backend directory:
```bash
cd backend
```

3. Copy the example configuration:
```bash
cp configs/config.example.yaml configs/config.yaml
```

4. Update `configs/config.yaml` with your database credentials and settings.

5. Install Go dependencies:
```bash
go mod download
```

6. Run database migrations:
```bash
# Migrations are located in backend/migrations/
# Apply them to your PostgreSQL database
```

7. Start the backend server:
```bash
go run cmd/server/main.go
```

The API will be available at `http://localhost:8080`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file with your configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Docker Setup

1. Build and start all services:
```bash
docker-compose up --build
```

2. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

## Repository Organization

The repository is organized following industry best practices for clarity and maintainability. See [ORGANIZATION.md](ORGANIZATION.md) and [docs/STRUCTURE.md](docs/STRUCTURE.md) for detailed structure documentation.

## Project Structure

```
aran-mcp/
├── backend/                 # Go backend application
│   ├── cmd/server/         # Main application entry point
│   ├── internal/           # Internal packages
│   │   ├── auth/          # Authentication handlers
│   │   ├── config/        # Configuration management
│   │   ├── database/      # Database models and connection
│   │   ├── discovery/     # MCP server discovery
│   │   ├── mcp/           # MCP protocol implementation
│   │   ├── monitoring/    # Health monitoring
│   │   └── security/      # Security testing
│   ├── configs/           # Configuration files
│   ├── migrations/        # Database migrations
│   └── go.mod            # Go module definition
├── frontend/              # Next.js frontend application
│   ├── src/
│   │   ├── app/          # Next.js app router pages
│   │   ├── components/  # React components
│   │   ├── lib/         # Utility libraries
│   │   └── types/       # TypeScript type definitions
│   └── package.json
├── mcp-server/           # Reference MCP server implementation
├── docs/                 # Documentation
│   ├── architecture/    # System architecture docs
│   ├── security/        # Security documentation
│   └── specs/          # Technical specifications
├── scripts/             # Utility scripts
├── monitoring/          # Prometheus and Grafana configs
└── docker-compose.yml   # Docker Compose configuration
```

## API Documentation

### Core Endpoints

#### MCP Servers
- `GET /api/v1/mcp/servers` - List all MCP servers
- `GET /api/v1/mcp/servers/:id` - Get server details
- `POST /api/v1/mcp/servers` - Register a new MCP server
- `PUT /api/v1/mcp/servers/:id` - Update server configuration
- `DELETE /api/v1/mcp/servers/:id` - Remove a server
- `GET /api/v1/mcp/servers/:id/status` - Get server health status

#### Server Discovery
- `POST /api/v1/discovery/scan` - Scan for MCP servers
- `GET /api/v1/discovery/endpoints` - List discovered endpoints
- `POST /api/v1/discovery/endpoints/:id/scan` - Scan specific endpoint

#### Security Testing
- `POST /api/v1/security/test` - Run security tests
- `GET /api/v1/security/tests/:id` - Get test results
- `GET /api/v1/security/owasp` - OWASP MCP Top 10 compliance

#### Monitoring
- `GET /api/v1/monitoring/health/:server_id` - Check server health
- `POST /api/v1/monitoring/health/check-all` - Check all servers
- `GET /api/v1/monitoring/servers` - List monitored servers
- `GET /api/v1/monitoring/alerts` - Get monitoring alerts

#### Health Check
- `GET /health` - Service health status

For comprehensive API documentation, see [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md).

## Configuration

### Backend Configuration

The backend uses YAML configuration files located in `backend/configs/`. Copy `config.example.yaml` to `config.yaml` and update with your settings:

```yaml
server:
  port: 8080
  host: "0.0.0.0"

database:
  host: "localhost"
  port: 5432
  user: "postgres"
  password: "password"
  name: "aran_mcp"
  ssl_mode: "disable"

auth:
  jwt_secret: "your-secret-key"
  token_expiry: "24h"
```

### Frontend Configuration

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

## Security

### Security Best Practices

Aran MCP Sentinel implements comprehensive security measures:

1. **Prompt Injection Detection**: Real-time detection of malicious prompt manipulation attempts
2. **Tool Poisoning Prevention**: Validation of tool metadata and capabilities
3. **Privilege Abuse Monitoring**: Tracking and alerting on excessive permissions
4. **Authentication**: Multiple authentication providers (JWT, Authelia, Clerk, Neon Auth)
5. **Input Validation**: Comprehensive input sanitization and validation
6. **Secure Communication**: TLS/SSL for all communications
7. **Credential Management**: Secure storage and rotation of API keys

### OWASP MCP Top 10

The platform addresses the OWASP MCP Top 10 security risks:

1. Prompt Injection
2. Tool Poisoning
3. Privilege Abuse
4. Tool Shadowing
5. Indirect Prompt Injection
6. Sensitive Data Exposure
7. Command/SQL Injection
8. Rug Pull Attacks
9. Denial of Wallet/Service
10. Authentication Bypass

For detailed security documentation, see [docs/security/SECURITY_ARCHITECTURE.md](docs/security/SECURITY_ARCHITECTURE.md).

## Development

### Building the Backend

```bash
cd backend
go build -o bin/server cmd/server/main.go
```

### Building the Frontend

```bash
cd frontend
npm run build
```

### Running Tests

Backend tests:
```bash
cd backend
go test ./...
```

Frontend tests:
```bash
cd frontend
npm test
```

### Code Quality

Backend linting:
```bash
cd backend
golangci-lint run
```

Frontend linting:
```bash
cd frontend
npm run lint
```

## Contributing

We welcome contributions from the community. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes following our coding standards
4. Write tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- [API Documentation](docs/API_DOCUMENTATION.md) - Complete API reference
- [System Architecture](docs/architecture/SYSTEM_ARCHITECTURE.md) - Architecture overview
- [Security Architecture](docs/security/SECURITY_ARCHITECTURE.md) - Security design
- [Roadmap](docs/ROADMAP.md) - Development roadmap
- [Testing Guide](docs/TESTING_GUIDE.md) - Testing documentation

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/adhit-r/aran-mcp/issues
- Documentation: See the `docs/` directory

## Acknowledgments

Built on the Model Context Protocol specification. Special thanks to the open source community and contributors.
