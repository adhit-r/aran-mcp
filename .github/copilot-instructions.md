# Copilot Instructions for Aran MCP Sentinel

This guide enables AI coding agents to be immediately productive in the Aran MCP Sentinel codebase. It summarizes architecture, workflows, conventions, and integration points unique to this project.

## Big Picture Architecture
- **Monorepo**: Contains backend (Go), frontend (Next.js/React), docs, monitoring, and deployment scripts.
- **Backend** (`backend/`): Go 1.21+, Gin framework, provides MCP server discovery, documentation, security testing APIs. Key entry: `cmd/server/main.go`. Internal logic in `internal/` (auth, config, mcp, models, etc.).
- **Frontend** (`frontend/`): Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS. Main app in `src/app/`, shared components in `src/components/`, design system in `aran_design_system.json`.
- **Docs** (`docs/`): Architecture, requirements, API reference, roadmap, and security documentation.
- **Monitoring** (`monitoring/`): Prometheus, Grafana configs for observability.
- **Deployment**: Docker Compose, Kubernetes, Helm charts, and Nginx configs for local and production setups.

## Developer Workflows
- **Backend**:
  - Dev: `go run cmd/server/main.go` or `make run` (if Makefile exists)
  - Build: `go build -o bin/mcp-sentinel cmd/server/main.go` or `make build`
  - Test: `go test ./...` or `make test`
  - Lint: `golangci-lint run` or `make lint`
  - Config: Copy `configs/config.example.yaml` to `configs/config.yaml` and edit as needed
- **Frontend**:
  - Dev: `npm run dev` (Next.js)
  - Build: `npm run build`
  - Lint: `npm run lint`
  - Test: `npm test`
  - Config: Use `.env.local` for environment variables
- **Docker**:
  - Start all services: `docker-compose up --build`
  - Compose files: `docker-compose.yml`, `docker-compose.prod.yml`, etc.
- **Monitoring**:
  - Prometheus config: `monitoring/prometheus.yml`
  - Grafana dashboards: `monitoring/grafana/dashboards/`

## Project-Specific Conventions
- **Backend**:
  - Internal packages are in `internal/` (not importable outside repo)
  - API endpoints follow `/api/v1/...` pattern
  - Configuration via YAML files in `backend/configs/`
  - Auth planned via JWT (see `internal/auth/`)
- **Frontend**:
  - Uses App Router (`src/app/`), not Pages Router
  - Design system defined in `aran_design_system.json`
  - State managed with React Query, forms with React Hook Form + Zod
  - Custom UI components in `src/components/`
- **Docs**:
  - API reference: `docs/API_DOCUMENTATION.md`
  - Architecture: `docs/architecture/SYSTEM_ARCHITECTURE.md`
  - Security: `docs/security/SECURITY_ARCHITECTURE.md`

## Integration Points & External Dependencies
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT (planned), NextAuth for frontend
- **Monitoring**: Prometheus, Grafana
- **Containerization**: Docker, Kubernetes, Helm
- **CI/CD**: GitHub Actions

## Examples of Key Patterns
- **Backend API Handler**: See `internal/mcp/handler.go` for endpoint logic
- **Frontend Component**: See `src/components/` for reusable UI
- **Config Loading**: See `internal/config/loader.go`
- **Security Middleware**: See `internal/middleware/security.go`

## References
- [docs/API_DOCUMENTATION.md](../docs/API_DOCUMENTATION.md)
- [docs/architecture/SYSTEM_ARCHITECTURE.md](../docs/architecture/SYSTEM_ARCHITECTURE.md)
- [docs/security/SECURITY_ARCHITECTURE.md](../docs/security/SECURITY_ARCHITECTURE.md)

---

**For unclear or missing sections, please provide feedback to improve these instructions.**
