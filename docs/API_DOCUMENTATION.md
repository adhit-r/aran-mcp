# Aran MCP Sentinel - API Documentation

## Table of Contents
- [Overview](#overview)
- [Backend APIs](#backend-apis)
- [Frontend Components](#frontend-components)
- [Utility Functions](#utility-functions)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)

## Overview

Aran MCP Sentinel is an enterprise-grade MCP (Model Context Protocol) Security and Management Platform that provides comprehensive security monitoring, threat detection, and management capabilities for MCP servers.

### Base URLs
- **Development**: `http://localhost:8080`
- **Production**: `https://api.aran-mcp-sentinel.com`

### API Versioning
All APIs are versioned using the `/api/v1/` prefix.

## Backend APIs

### Health Check

#### GET /health
Check the health status of the service.

**Response:**
```json
{
  "status": "ok",
  "message": "Service is healthy"
}
```

**Error Response:**
```json
{
  "status": "unhealthy",
  "message": "Database connection failed"
}
```

### MCP Server Management

#### GET /api/v1/mcp/servers
Retrieve a list of all active MCP servers.

**Query Parameters:**
- `limit` (optional): Number of servers to return (default: 50)
- `offset` (optional): Number of servers to skip (default: 0)
- `status` (optional): Filter by status (`active`, `inactive`, `monitoring`)

**Response:**
```json
{
  "servers": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Example MCP Server",
      "url": "https://mcp.example.com",
      "version": "1.0.0",
      "is_active": true,
      "last_checked": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### GET /api/v1/mcp/servers/:id
Retrieve details of a specific MCP server.

**Path Parameters:**
- `id`: UUID of the MCP server

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Example MCP Server",
  "url": "https://mcp.example.com",
  "version": "1.0.0",
  "is_active": true,
  "last_checked": "2024-01-15T10:30:00Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### POST /api/v1/mcp/servers
Create a new MCP server.

**Request Body:**
```json
{
  "name": "New MCP Server",
  "url": "https://new-mcp.example.com",
  "version": "1.0.0"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "New MCP Server",
  "url": "https://new-mcp.example.com",
  "version": "1.0.0",
  "is_active": true,
  "last_checked": "2024-01-15T10:30:00Z",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### GET /api/v1/mcp/servers/:id/status
Get the current status of an MCP server.

**Path Parameters:**
- `id`: UUID of the MCP server

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "server_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_online": true,
  "response_time": 150,
  "last_checked": "2024-01-15T10:30:00Z"
}
```

### MCP Testing

#### POST /api/v1/mcp/tests
Run a security test against an MCP server.

**Request Body:**
```json
{
  "server_id": "550e8400-e29b-41d4-a716-446655440000",
  "test_type": "tool-poisoning",
  "parameters": {
    "target_tool": "file_system",
    "test_payload": "malicious_payload"
  }
}
```

**Response:**
```json
{
  "test_id": "test-12345",
  "status": "running",
  "estimated_completion": "2024-01-15T10:35:00Z"
}
```

#### GET /api/v1/mcp/tests/:id
Get the results of a security test.

**Path Parameters:**
- `id`: Test ID

**Response:**
```json
{
  "test_id": "test-12345",
  "server_id": "550e8400-e29b-41d4-a716-446655440000",
  "test_type": "tool-poisoning",
  "status": "completed",
  "passed": false,
  "results": {
    "vulnerabilities_found": 2,
    "risk_score": 8.5,
    "recommendations": [
      "Implement input validation",
      "Add rate limiting"
    ]
  },
  "completed_at": "2024-01-15T10:35:00Z"
}
```

## Frontend Components

### Dashboard Components

#### DashboardPage
Main dashboard component for MCP traffic analysis.

**Props:**
```typescript
interface DashboardPageProps {
  initialTimeRange?: TimeRange;
  autoRefresh?: boolean;
}
```

**Usage:**
```tsx
import DashboardPage from '@/app/dashboard/page';

export default function App() {
  return <DashboardPage initialTimeRange="15m" autoRefresh={true} />;
}
```

**Features:**
- Real-time traffic monitoring
- Auto-refresh capabilities
- Time range selection
- Error handling with retry functionality

#### TrafficStats Component
Displays traffic statistics in card format.

**Props:**
```typescript
interface TrafficStatsProps {
  stats: {
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    activeConnections: number;
  };
  timeRange: TimeRange;
}
```

**Usage:**
```tsx
import { TrafficStats } from '@/components/dashboard/TrafficStats';

<TrafficStats 
  stats={dashboardData.stats} 
  timeRange={timeRange} 
/>
```

### UI Components

#### Card Component
Reusable card component with header and content areas.

**Props:**
```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}
```

**Usage:**
```tsx
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>MCP Server Status</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Server is online and responding</p>
  </CardContent>
</Card>
```

#### Button Component
Configurable button component with multiple variants.

**Props:**
```typescript
interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
```

**Usage:**
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default" size="lg" onClick={handleClick}>
  Refresh Data
</Button>
```

## Utility Functions

### MCP Discovery

#### discoverMcps(trafficData: string): Promise<DiscoveredMcp[]>
Discovers MCP servers in traffic data using pattern matching.

**Parameters:**
- `trafficData`: Raw traffic data as string

**Returns:**
```typescript
Promise<DiscoveredMcp[]>
```

**Usage:**
```typescript
import { discoverMcps } from '@/lib/mcp-utils';

const trafficData = await fetchTrafficData();
const discoveredServers = await discoverMcps(trafficData);

console.log(`Found ${discoveredServers.length} MCP servers`);
```

### Threat Detection

#### detectMcpThreats(params: ThreatDetectionParams): Promise<McpThreatAnalysis>
Detects security threats in MCP interactions.

**Parameters:**
```typescript
interface ThreatDetectionParams {
  mcpEndpoint: string;
  requestData: string;
  responseData: string;
  userRole: string;
  trafficVolume: string;
}
```

**Returns:**
```typescript
Promise<McpThreatAnalysis>
```

**Usage:**
```typescript
import { detectMcpThreats } from '@/lib/mcp-utils';

const threatAnalysis = await detectMcpThreats({
  mcpEndpoint: 'https://mcp.example.com',
  requestData: requestPayload,
  responseData: responsePayload,
  userRole: 'admin',
  trafficVolume: 'high'
});

if (threatAnalysis.threatLevel === 'high') {
  console.warn('High threat level detected!');
}
```

### Security Testing

#### runSecurityTest(testConfig: SecurityTestConfig): Promise<McpSecurityTest>
Runs security tests against MCP servers.

**Parameters:**
```typescript
interface SecurityTestConfig {
  testType: 'tool-poisoning' | 'authorization' | 'injection' | 'data-exposure';
  target: string;
  parameters: Record<string, any>;
}
```

**Returns:**
```typescript
Promise<McpSecurityTest>
```

**Usage:**
```typescript
import { runSecurityTest } from '@/lib/mcp-utils';

const testResult = await runSecurityTest({
  testType: 'tool-poisoning',
  target: 'https://mcp.example.com',
  parameters: {
    targetTool: 'file_system',
    testPayload: 'malicious_payload'
  }
});

console.log(`Test passed: ${testResult.passed}`);
```

## Data Models

### MCPServer
Represents an MCP server in the system.

```typescript
interface MCPServer {
  id: string;
  name: string;
  url: string;
  version: string;
  is_active: boolean;
  last_checked: Date;
  created_at: Date;
  updated_at: Date;
}
```

### MCPEvent
Represents an event from an MCP server.

```typescript
interface MCPEvent {
  id: string;
  server_id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata: Record<string, string>;
  received_at: Date;
}
```

### MCPServerStatus
Represents the status of an MCP server.

```typescript
interface MCPServerStatus {
  id: string;
  server_id: string;
  is_online: boolean;
  response_time: number; // in milliseconds
  last_checked: Date;
  error?: string;
}
```

### DiscoveredMcp
Represents a discovered MCP server.

```typescript
interface DiscoveredMcp {
  id: string;
  name: string;
  description: string;
  endpoints: string[];
  dataSources: string[];
  actions: string[];
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'monitoring' | 'inactive';
  tools: Array<{
    name: string;
    type: string;
    permissions: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
}
```

### McpThreatAnalysis
Represents threat analysis results.

```typescript
interface McpThreatAnalysis {
  threatLevel: 'low' | 'medium' | 'high';
  anomalyScore: number;
  detectedThreats: string[];
  recommendations: string[];
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    threatType: McpThreatType;
  }>;
  attackMatrix: {
    inputLayer: string[];
    executionLayer: string[];
    outputLayer: string[];
  };
}
```

## Error Handling

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error
- `503`: Service Unavailable

### Error Response Format
```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes
- `INVALID_SERVER_ID`: Invalid MCP server ID format
- `SERVER_NOT_FOUND`: MCP server not found
- `INVALID_REQUEST_BODY`: Invalid request body format
- `DATABASE_ERROR`: Database operation failed
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable

## Authentication

**Note**: Authentication is planned for future implementation.

### Planned Authentication Methods
- JWT-based authentication
- API key authentication
- OAuth 2.0 integration
- Role-based access control (RBAC)

## Rate Limiting

**Note**: Rate limiting is planned for future implementation.

### Planned Rate Limits
- 100 requests per minute per IP
- 1000 requests per hour per API key
- Burst allowance: 10 requests per second

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642234567
```

## SDK Examples

### JavaScript/TypeScript SDK

```typescript
import { AranMcpSentinel } from '@aran-mcp-sentinel/sdk';

const client = new AranMcpSentinel({
  baseUrl: 'https://api.aran-mcp-sentinel.com',
  apiKey: 'your-api-key'
});

// List MCP servers
const servers = await client.mcp.servers.list();

// Create a new server
const newServer = await client.mcp.servers.create({
  name: 'My MCP Server',
  url: 'https://mcp.example.com',
  version: '1.0.0'
});

// Run security test
const testResult = await client.mcp.tests.run({
  serverId: newServer.id,
  testType: 'tool-poisoning'
});
```

### Python SDK

```python
from aran_mcp_sentinel import AranMcpSentinel

client = AranMcpSentinel(
    base_url="https://api.aran-mcp-sentinel.com",
    api_key="your-api-key"
)

# List MCP servers
servers = client.mcp.servers.list()

# Create a new server
new_server = client.mcp.servers.create(
    name="My MCP Server",
    url="https://mcp.example.com",
    version="1.0.0"
)

# Run security test
test_result = client.mcp.tests.run(
    server_id=new_server.id,
    test_type="tool-poisoning"
)
```

## Webhook Integration

### Webhook Events
- `mcp.server.created`: When a new MCP server is created
- `mcp.server.updated`: When an MCP server is updated
- `mcp.server.deleted`: When an MCP server is deleted
- `mcp.threat.detected`: When a security threat is detected
- `mcp.test.completed`: When a security test is completed

### Webhook Payload Example
```json
{
  "event": "mcp.threat.detected",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "server_id": "550e8400-e29b-41d4-a716-446655440000",
    "threat_level": "high",
    "threat_type": "tool-poisoning",
    "details": {
      "description": "Malicious tool detected",
      "recommendations": ["Implement input validation"]
    }
  }
}
```

## Support

For API support and questions:
- **Documentation**: [https://docs.aran-mcp-sentinel.com](https://docs.aran-mcp-sentinel.com)
- **GitHub Issues**: [https://github.com/radhi1991/aran-mcp-sentinel/issues](https://github.com/radhi1991/aran-mcp-sentinel/issues)
- **Email**: support@aran-mcp-sentinel.com