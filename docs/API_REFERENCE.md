# aran-mcp API Reference

This document provides a comprehensive reference for the aran-mcp REST API.

## OpenAPI Specification

The full API specification is available in OpenAPI 3.0 format:
- **File**: [openapi.yaml](./openapi.yaml)

### Viewing Documentation

**Option 1: Swagger UI (Online)**
Visit [editor.swagger.io](https://editor.swagger.io) and import `openapi.yaml`

**Option 2: Local Swagger UI**
```bash
docker run -p 8081:8080 -e SWAGGER_JSON=/docs/openapi.yaml -v $(pwd)/docs:/docs swaggerapi/swagger-ui
```

**Option 3: ReDoc**
```bash
npx @redocly/cli preview-docs docs/openapi.yaml
```

## Quick Start

### Authentication

```bash
# Using API Key
curl -H "X-API-Key: mcp_your_api_key" https://api.example.com/api/v1/mcp/servers

# Using Bearer Token
curl -H "Authorization: Bearer <jwt_token>" https://api.example.com/api/v1/mcp/servers
```

### Common Operations

**List Servers**
```bash
curl -X GET "http://localhost:8080/api/v1/mcp/servers" \
  -H "X-API-Key: your_key"
```

**Create Server**
```bash
curl -X POST "http://localhost:8080/api/v1/mcp/servers" \
  -H "X-API-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Server", "url": "https://mcp.example.com", "type": "api"}'
```

**Search Servers**
```bash
curl -X GET "http://localhost:8080/api/v1/servers/search?q=myserver&status=online" \
  -H "X-API-Key: your_key"
```

**Create API Key**
```bash
curl -X POST "http://localhost:8080/api/v1/api-keys" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Production Key", "permissions": ["read", "write"]}'
```

## Rate Limiting

Headers in responses:
- `X-RateLimit-Limit`: Max requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp of limit reset

| Level | Limit | Window |
|-------|-------|--------|
| Global | 1000 req | /minute |
| Per IP | 100 req | /minute |
| Per User | 200 req | /minute |

## Generating Client SDKs

```bash
# Go client
openapi-generator-cli generate -i docs/openapi.yaml -g go -o ./sdk/go

# TypeScript client
openapi-generator-cli generate -i docs/openapi.yaml -g typescript-fetch -o ./sdk/typescript

# Python client
openapi-generator-cli generate -i docs/openapi.yaml -g python -o ./sdk/python
```

## See Also

- [openapi.yaml](./openapi.yaml) - Full OpenAPI 3.0 specification
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Detailed API documentation
- [security/](./security/) - Security documentation
