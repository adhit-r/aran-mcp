# Repository Organization

This document describes the clean, professional organization of the Aran MCP Sentinel repository.

## Directory Structure

```
aran-mcp/
├── .github/              # GitHub configuration
│   ├── workflows/        # CI/CD workflows
│   ├── ISSUE_TEMPLATE/   # Issue templates
│   ├── CODE_OF_CONDUCT.md
│   └── copilot-instructions.md
├── backend/              # Go backend service
│   ├── cmd/server/       # Application entry point
│   ├── internal/         # Private application code
│   ├── configs/          # Configuration (example only)
│   ├── migrations/       # Database migrations
│   └── Dockerfile
├── frontend/             # Next.js frontend
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   ├── tests/            # E2E tests
│   └── Dockerfile
├── website/              # Astro marketing site
│   ├── src/              # Astro source
│   └── public/           # Static assets
├── mcp-server/           # Reference MCP server
├── docs/                 # Documentation
│   ├── architecture/     # Architecture docs
│   ├── security/         # Security docs
│   ├── requirements/     # Requirements
│   ├── specs/           # Technical specs
│   └── wiki/            # Wiki pages
├── scripts/              # Utility scripts
├── monitoring/           # Monitoring configs
├── nginx/                # Reverse proxy configs
├── archive/              # Archived files (gitignored)
├── docker-compose.yml    # Development environment
└── README.md            # Main documentation
```

## Key Principles

1. **Clear Separation**: Each major component has its own directory
2. **No Build Artifacts**: All compiled code is gitignored
3. **No Secrets**: Configuration files with secrets are gitignored
4. **Documentation First**: Comprehensive docs in organized structure
5. **Professional Standards**: Follows industry best practices

## File Organization Rules

### Always Committed
- Source code
- Documentation
- Configuration examples
- Migration files
- Scripts
- Dockerfiles

### Never Committed
- Compiled binaries
- Build artifacts
- Local configuration files
- Test results
- Node modules
- OS-specific files

## Documentation Structure

Documentation is organized by topic:
- **Architecture**: System design and structure
- **Security**: Security architecture and practices
- **Requirements**: Feature specifications
- **Specs**: Technical specifications
- **Wiki**: User-facing documentation

## Cleanup Checklist

- [x] Removed compiled binaries
- [x] Removed build artifacts
- [x] Removed local config files
- [x] Removed test results
- [x] Removed OS files
- [x] Organized documentation
- [x] Updated .gitignore
- [x] Created structure documentation

## Maintenance

Run `scripts/cleanup-repo.sh` periodically to maintain cleanliness.

