# Getting Started with Aran MCP Sentinel

This guide will help you get Aran MCP Sentinel up and running quickly.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Go 1.22 or later** - [Download Go](https://golang.org/dl/)
- **Node.js 18 or later** - [Download Node.js](https://nodejs.org/)
- **PostgreSQL 14 or later** - [Download PostgreSQL](https://www.postgresql.org/download/)
- **Docker** (optional) - [Download Docker](https://www.docker.com/get-started)
- **Git** - [Download Git](https://git-scm.com/downloads)

## Quick Installation

### Option 1: Docker Compose (Recommended for Quick Start)

1. Clone the repository:
```bash
git clone https://github.com/adhit-r/aran-mcp.git
cd aran-mcp
```

2. Copy environment file:
```bash
cp env.example .env
```

3. Edit `.env` with your configuration

4. Start all services:
```bash
docker-compose up -d
```

5. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

### Option 2: Manual Installation

#### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
go mod download
```

3. Copy configuration:
```bash
cp configs/config.example.yaml configs/config.yaml
```

4. Edit `configs/config.yaml` with your database credentials

5. Run database migrations:
```bash
# Connect to your PostgreSQL database and run:
psql -U postgres -d aran_mcp < migrations/001_initial_schema.sql
psql -U postgres -d aran_mcp < migrations/002_mcp_tools_tables.sql
psql -U postgres -d aran_mcp < migrations/003_add_tool_attestation.sql
psql -U postgres -d aran_mcp < migrations/004_add_tool_invocations.sql
psql -U postgres -d aran_mcp < migrations/005_add_alerts.sql
```

6. Start the backend server:
```bash
go run cmd/server/main.go
```

#### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

4. Start the development server:
```bash
npm run dev
```

## Initial Configuration

### Database Configuration

Edit `backend/configs/config.yaml`:

```yaml
database:
  host: localhost
  port: 5432
  user: postgres
  password: your_password
  name: aran_mcp
  ssl_mode: disable
```

### Authentication Configuration

Configure your preferred authentication method:

- **JWT**: Set `auth.jwt_secret` in config
- **Clerk**: Set Clerk credentials
- **Authelia**: Configure Authelia integration
- **Neon Auth**: Set Neon Auth credentials

## Verify Installation

1. Check backend health:
```bash
curl http://localhost:8080/health
```

2. Open frontend:
Navigate to http://localhost:3000

3. Create your first organization:
- Follow the onboarding flow
- Set up your organization
- Add your first MCP server

## Next Steps

- Read the [User Guide](User-Guide) to learn how to use the platform
- Check the [API Reference](API-Reference) for API documentation
- Review [Security Best Practices](Security-Best-Practices) for production setup

## Troubleshooting

If you encounter issues:

1. Check the [Troubleshooting Guide](Troubleshooting)
2. Review logs in backend and frontend
3. Verify database connection
4. Check firewall and port availability

## Support

For additional help:
- Check the [FAQ](FAQ)
- Open an issue on [GitHub](https://github.com/adhit-r/aran-mcp/issues)
- Review the [Documentation](README.md)

