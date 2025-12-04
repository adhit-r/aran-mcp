# API Reference

Complete API reference for Aran MCP Sentinel REST API.

## Base URL

- Development: `http://localhost:8080`
- Production: `https://api.aran-mcp-sentinel.com`

## Authentication

All API requests require authentication via one of the following methods:

- **JWT Token**: `Authorization: Bearer <token>`
- **API Key**: `X-API-Key: <api-key>`

## API Versioning

The API is versioned. Current version: `v1`

Base path: `/api/v1`

## Endpoints

### Health Check

#### GET /health
Check service health status.

**Response:**
```json
{
  "status": "ok",
  "message": "Service is healthy"
}
```

### MCP Servers

#### GET /api/v1/mcp/servers
List all MCP servers for the organization.

**Query Parameters:**
- `limit` (integer): Number of results (default: 50)
- `offset` (integer): Pagination offset (default: 0)
- `status` (string): Filter by status
- `type` (string): Filter by server type

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Server Name",
      "url": "http://example.com",
      "status": "online",
      "type": "http"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "count": 10
  }
}
```

#### GET /api/v1/mcp/servers/:id
Get details of a specific MCP server.

#### POST /api/v1/mcp/servers
Create a new MCP server.

**Request Body:**
```json
{
  "name": "Server Name",
  "url": "http://example.com",
  "description": "Server description",
  "type": "http"
}
```

#### PUT /api/v1/mcp/servers/:id
Update an MCP server.

#### DELETE /api/v1/mcp/servers/:id
Delete an MCP server (soft delete).

### Server Discovery

#### POST /api/v1/discovery/scan
Scan for MCP servers on the network.

**Request Body:**
```json
{
  "port_ranges": [{"start": 3000, "end": 3100}],
  "network_ranges": ["192.168.1.0/24"]
}
```

#### GET /api/v1/discovery/endpoints
List discovered endpoints.

### Security Testing

#### POST /api/v1/security/test
Run security tests against an MCP server.

**Request Body:**
```json
{
  "server_id": "uuid",
  "test_types": ["owasp", "injection"]
}
```

#### GET /api/v1/security/tests/:id
Get security test results.

#### GET /api/v1/security/owasp
Get OWASP MCP Top 10 compliance status.

### Monitoring

#### GET /api/v1/monitoring/health/:server_id
Check health of a specific server.

#### POST /api/v1/monitoring/health/check-all
Check health of all servers.

#### GET /api/v1/monitoring/servers
List all monitored servers.

#### GET /api/v1/monitoring/alerts
Get monitoring alerts.

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API requests are rate limited:
- Per user: 100 requests/minute
- Per organization: 1000 requests/minute

Rate limit headers:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time

## Pagination

List endpoints support pagination:
- `limit`: Results per page (max 100)
- `offset`: Number of results to skip

## For More Information

- [OpenAPI Specification](../API_DOCUMENTATION.md)
- [Authentication Guide](Authentication)
- [Error Handling](Error-Handling)

