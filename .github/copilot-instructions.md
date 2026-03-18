# Aran MCP Sentinel - Copilot Instructions

## 🏗️ Architecture & Boundaries
- **Monorepo Structure**: Backend (`backend/`), Frontend (`frontend/`), Logs/Monitoring (`monitoring/`).
- **Backend**: Go (1.22+), Gin framework, Supabase (PostgreSQL). Internal packages are scoped to `backend/internal/` (e.g., `mcp`, `discovery`, `supabase`). Entry point is `backend/cmd/server/main.go`.
- **Frontend**: Next.js 14 App Router (`frontend/src/app`), React 18, TypeScript, Tailwind CSS. Forms managed with React Hook Form + Zod, UI via Radix UI components. Design system defined in `frontend/aran_design_system.json`.

## 🛠️ Developer Workflows
- **Backend (`cd backend`)**: Start with `go run cmd/server/main.go`. Test with `go test ./...`. Configs are loaded from `configs/config.yaml` using `backend/internal/config/loader.go`.
- **Frontend (`cd frontend`)**: Start with `npm run dev`. Configs loaded from `.env.local`. E2E testing configured via Playwright (`npx playwright test`).
- **Docker & Infrastructure**: `docker-compose up --build` from the repo root to spin up all services. Health monitoring via Prometheus/Grafana inside `monitoring/`.

## 📐 Key Patterns & Conventions
- **Backend API Endpoints**: Follow `/api/v1/...`. Example routing and logic are implemented in `backend/internal/mcp/handler.go` and `backend/internal/mcp/enhanced_handler.go`.
- **Security (SAFE-MCP)**: The project strictly enforces OWASP MCP Top 10 threat modeling (prompt injection, tool poisoning). See `backend/internal/middleware/security.go`.
- **Database Access**: Uses Supabase Postgres. Data models and integrations correspond to `backend/internal/database/` and `backend/internal/supabase/`.
- **Frontend Components**: Built modularly inside `frontend/src/components/`, strictly adhering to the design tokens in the JSON specification.

## 🔗 Integration Points
- **Discovery & Orchestration**: Scans and registers MCP servers (`backend/internal/discovery/`), storing server data and generating test results via `backend/internal/security/`.
- **Documentation**: Extensive API, Threat Modeling, and Architecture docs are kept current in `docs/`.
