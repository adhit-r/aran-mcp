# Repository Structure

This document describes the organization and structure of the Aran MCP Sentinel repository.

## Overview

Aran MCP Sentinel is organized as a monorepo following industry best practices for clarity, maintainability, and scalability.

## Root Directory

```
aran-mcp/
├── backend/          # Go backend service
├── frontend/         # Next.js frontend application
├── website/          # Astro marketing website
├── mcp-server/       # Reference MCP server implementation
├── docs/             # Documentation
├── scripts/          # Utility and deployment scripts
├── monitoring/       # Monitoring and observability configs
├── nginx/            # Reverse proxy configurations
├── archive/           # Archived files (gitignored)
├── .github/          # GitHub workflows and templates
├── docker-compose.yml # Development environment
└── README.md         # Main project documentation
```

## Backend (`backend/`)

Go-based API server providing MCP management, security testing, and monitoring capabilities.

```
backend/
├── cmd/
│   └── server/       # Application entry point
├── internal/         # Private application code
│   ├── auth/        # Authentication handlers
│   ├── config/      # Configuration management
│   ├── database/    # Database models and connection
│   ├── discovery/   # MCP server discovery
│   ├── mcp/         # MCP protocol implementation
│   ├── monitoring/  # Health monitoring
│   ├── security/    # Security testing
│   └── ...
├── configs/          # Configuration files (example only)
├── migrations/      # Database migrations
├── go.mod           # Go module definition
└── Dockerfile       # Container build
```

## Frontend (`frontend/`)

Next.js 14 application with App Router, TypeScript, and Tailwind CSS.

```
frontend/
├── src/
│   ├── app/         # Next.js App Router pages
│   ├── components/  # React components
│   ├── lib/         # Utility libraries
│   └── types/       # TypeScript types
├── public/          # Static assets
├── tests/           # E2E tests (Playwright)
└── package.json
```

## Website (`website/`)

Astro-based marketing website deployed to GitHub Pages.

```
website/
├── src/
│   ├── pages/       # Astro pages
│   ├── layouts/     # Layout components
│   └── components/  # Reusable components
├── public/          # Static assets
└── package.json
```

## Documentation (`docs/`)

Comprehensive documentation organized by topic.

```
docs/
├── architecture/    # System architecture docs
├── security/        # Security documentation
├── requirements/    # Requirements specifications
├── specs/          # Technical specifications
├── wiki/           # Wiki pages (for GitHub Wiki)
├── API_DOCUMENTATION.md
├── ROADMAP.md
├── TODO.md
└── STRUCTURE.md    # This file
```

## Scripts (`scripts/`)

Utility scripts for development, deployment, and maintenance.

```
scripts/
├── cleanup-repo.sh      # Repository cleanup
├── create_issues.sh      # GitHub issue creation
├── deploy-production.sh  # Production deployment
├── setup-production.sh   # Production setup
└── ...
```

## Configuration Files

### Root Level
- `.env.example` - Environment variable template
- `.gitignore` - Git ignore rules
- `docker-compose.yml` - Development environment
- `docker-compose.prod.yml` - Production environment

### Backend
- `backend/configs/config.example.yaml` - Configuration template
- `backend/go.mod` - Go dependencies

### Frontend
- `frontend/package.json` - Node dependencies
- `frontend/.env.local.example` - Frontend env template

## Archive (`archive/`)

Directory for old, deprecated, or unused files. This directory is gitignored.

## Best Practices

1. **Never commit:**
   - Compiled binaries
   - Local configuration files
   - Build artifacts
   - Test results
   - OS-specific files (.DS_Store, etc.)

2. **Always commit:**
   - Example configuration files
   - Documentation
   - Source code
   - Migration files

3. **Organization:**
   - Keep related files together
   - Use clear, descriptive names
   - Follow language-specific conventions
   - Document structure changes

## Adding New Components

When adding new components:

1. Place in appropriate directory
2. Follow existing naming conventions
3. Update this document if structure changes
4. Add to `.gitignore` if needed

