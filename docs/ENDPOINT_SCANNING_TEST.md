# Endpoint Scanning Feature - Testing Guide

## Overview

The endpoint scanning feature allows you to discover and analyze MCP servers by scanning endpoints, ports, or networks. This guide will help you test the feature.

## Prerequisites

1. **Backend Server Running**
   ```bash
   cd backend
   go run cmd/server/main.go
   ```
   The server should start on `http://localhost:8080`

2. **Frontend Server Running** (Optional for UI testing)
   ```bash
   cd frontend
   bun dev
   ```
   The frontend should start on `http://localhost:3000`

3. **Database Running** (Required for backend)
   ```bash
   docker-compose up -d postgres
   ```

## Testing via API

### Test 1: Scan Single Endpoint

```bash
curl -X POST http://localhost:8080/api/v1/discovery/endpoint/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:3000"}'
```

**Expected Response:**
```json
{
  "result": {
    "url": "http://localhost:3000",
    "reachable": true,
    "is_mcp_server": false,
    "response_time": 123,
    "http_status": 200,
    "health_status": "healthy",
    "detected_protocol": "HTTP/JSON",
    "scan_timestamp": "2024-01-01T00:00:00Z"
  }
}
```

### Test 2: Scan Multiple Endpoints

```bash
curl -X POST http://localhost:8080/api/v1/discovery/endpoint/scan-multiple \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "http://localhost:3000",
      "http://localhost:8080",
      "http://localhost:9000"
    ],
    "max_concurrent": 5
  }'
```

**Expected Response:**
```json
{
  "results": [
    {
      "url": "http://localhost:3000",
      "reachable": true,
      ...
    }
  ],
  "total_scanned": 3,
  "total_found": 1
}
```

### Test 3: Scan Port Range

```bash
curl -X POST http://localhost:8080/api/v1/discovery/endpoint/scan-ports \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "start_port": 3000,
    "end_port": 3010,
    "max_concurrent": 10
  }'
```

**Expected Response:**
```json
{
  "results": [...],
  "mcp_servers": [...],
  "total_ports": 11,
  "reachable": 2,
  "mcp_servers_count": 1
}
```

### Test 4: Validation Testing

Test that invalid requests are properly rejected:

```bash
# Missing URL
curl -X POST http://localhost:8080/api/v1/discovery/endpoint/scan \
  -H "Content-Type: application/json" \
  -d '{}'

# Invalid port range
curl -X POST http://localhost:8080/api/v1/discovery/endpoint/scan-ports \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "start_port": 70000,
    "end_port": 80000
  }'
```

## Testing via UI

1. **Start the frontend:**
   ```bash
   cd frontend
   bun dev
   ```

2. **Navigate to the dashboard:**
   - Open `http://localhost:3000`
   - Log in (if required)
   - Navigate to Dashboard → Real Dashboard
   - Click on the "Discovery" tab

3. **Test Single Endpoint Scan:**
   - Select "Single Endpoint" tab
   - Enter a URL (e.g., `http://localhost:3000`)
   - Click "Scan"
   - View the results in the expandable card

4. **Test Multiple Endpoint Scan:**
   - Select "Multiple Endpoints" tab
   - Enter multiple URLs (one per line)
   - Click "Scan All Endpoints"
   - View all results

5. **Test Port Range Scan:**
   - Select "Port Range" tab
   - Enter host (e.g., `localhost`)
   - Enter start port (e.g., `3000`)
   - Enter end port (e.g., `3010`)
   - Click "Scan Port Range"
   - View discovered servers

## Automated Testing

Run the automated test script:

```bash
./test_endpoint_scanning.sh
```

This script will:
- Check if the server is running
- Test all three scan types
- Test validation
- Display results

## Expected Behavior

### Single Endpoint Scan
- ✅ Returns scan result with all available information
- ✅ Includes reachability status
- ✅ Detects MCP protocol if applicable
- ✅ Returns version and capabilities if MCP server
- ✅ Includes response time and health status

### Multiple Endpoint Scan
- ✅ Scans all endpoints concurrently
- ✅ Returns results for all scanned endpoints
- ✅ Shows summary (total_scanned, total_found)
- ✅ Handles errors gracefully

### Port Range Scan
- ✅ Scans all ports in range concurrently
- ✅ Returns only reachable endpoints
- ✅ Filters MCP servers separately
- ✅ Shows statistics (total_ports, reachable, mcp_servers_count)

### Validation
- ✅ Rejects requests with missing required fields
- ✅ Validates port ranges (1-65535)
- ✅ Limits port range size (max 1000 ports)
- ✅ Returns appropriate error messages

## Troubleshooting

### Server Not Running
```
Error: Server is not running
Solution: Start the backend server
```

### Database Connection Error
```
Error: Failed to connect to database
Solution: Start PostgreSQL with docker-compose up -d postgres
```

### CORS Errors (Frontend)
```
Error: CORS policy blocked
Solution: Ensure backend CORS is configured correctly
```

### Timeout Errors
```
Error: Request timeout
Solution: Increase timeout in endpoint scanner configuration
```

## Performance Notes

- Single endpoint scan: ~1-3 seconds
- Multiple endpoint scan: ~5-10 seconds (depends on concurrent limit)
- Port range scan: ~10-30 seconds (depends on range size)

## Next Steps

After testing, you can:
1. Integrate discovered servers into the registry
2. Set up automated periodic scanning
3. Configure alerts for discovered servers
4. Add custom scan configurations



