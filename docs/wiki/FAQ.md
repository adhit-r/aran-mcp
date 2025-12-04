# Frequently Asked Questions

## General Questions

### What is Aran MCP Sentinel?

Aran MCP Sentinel is an enterprise-grade security and management platform for Model Context Protocol (MCP) deployments. It provides discovery, monitoring, security testing, and management capabilities.

### What is MCP?

MCP (Model Context Protocol) is a protocol for connecting AI applications to external data sources and tools. Aran MCP Sentinel helps secure and manage MCP server deployments.

### Who is this for?

- DevOps teams managing MCP infrastructure
- Security engineers conducting MCP assessments
- Enterprise architects implementing MCP solutions
- Development teams integrating with MCP services

## Installation Questions

### What are the system requirements?

- Go 1.22+ for backend
- Node.js 18+ for frontend
- PostgreSQL 14+ for database
- 2GB RAM minimum
- Docker (optional)

### Can I deploy without Docker?

Yes, you can run the backend and frontend separately. See the [Getting Started Guide](Getting-Started) for manual installation.

### Do I need a separate database?

Yes, PostgreSQL is required. You can use Supabase, a managed PostgreSQL service, or self-hosted PostgreSQL.

## Feature Questions

### What authentication methods are supported?

- JWT tokens
- Clerk
- Authelia
- Neon Auth
- API keys

### Can I use multiple authentication methods?

Yes, you can configure multiple authentication providers. The system will try each method in order.

### How does server discovery work?

The discovery system scans network ranges and ports to find MCP servers. It can be configured to scan specific IP ranges and port ranges.

### What security tests are available?

- OWASP MCP Top 10 compliance
- Prompt injection detection
- Tool poisoning detection
- Authorization testing
- Injection attack testing

## Technical Questions

### How do I add a custom MCP server?

Use the API or UI to register a server:
- POST /api/v1/mcp/servers
- Or use the "Add Server" button in the UI

### Can I integrate with CI/CD?

Yes, the API can be integrated into CI/CD pipelines. See the [API Reference](API-Reference) for details.

### How do I scale the application?

- Deploy multiple backend instances
- Use a load balancer
- Configure database connection pooling
- Add Redis caching

### Is multi-tenancy supported?

Multi-tenancy is planned for Phase 4. Currently, the system supports single organization deployments.

## Support Questions

### Where can I get help?

- GitHub Issues: https://github.com/adhit-r/aran-mcp/issues
- Documentation: See wiki pages
- Troubleshooting: See [Troubleshooting Guide](Troubleshooting)

### How do I report a bug?

Open an issue on GitHub with:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details

### How do I request a feature?

Open a feature request issue with:
- Feature description
- Use case
- Proposed solution
- Alternatives considered

## License Questions

### What license is this under?

MIT License - see LICENSE file for details.

### Can I use this commercially?

Yes, the MIT license allows commercial use.

