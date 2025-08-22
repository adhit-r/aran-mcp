# MCP Sentinel Backend

This is the Go backend for the MCP Sentinel project, providing APIs for MCP server discovery, documentation, and security testing.

## Project Structure

```
backend/
├── cmd/
│   └── server/          # Main application entry point
├── configs/             # Configuration files
├── internal/
│   ├── api/             # API handlers and middleware
│   ├── config/          # Configuration loading and parsing
│   ├── mcp/             # MCP protocol implementation
│   └── models/          # Data models
├── pkg/
│   └── utils/           # Utility functions
├── go.mod              # Go module file
└── README.md           # This file
```

## Getting Started

### Prerequisites

- Go 1.22 or higher
- Docker (for running dependencies like databases)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/radhi1991/aran-mcp.git
   cd aran-mcp/backend
   ```

2. Install dependencies:
   ```bash
   go mod download
   ```

3. Copy the example config file:
   ```bash
   cp configs/config.example.yaml configs/config.yaml
   ```

4. Update the configuration in `configs/config.yaml` as needed.

### Running the Application

#### Development Mode

```bash
# Run the application
make run

# Or directly with go
ENV=development go run cmd/server/main.go
```

#### Production Mode

```bash
# Build the application
make build

# Run the binary
./bin/mcp-sentinel
```

### Environment Variables

Key environment variables that can be set:

- `SERVER_PORT`: Port to run the server on (default: 8080)
- `ENV`: Environment (development, staging, production)
- `LOG_LEVEL`: Logging level (debug, info, warn, error)
- `JWT_SECRET`: Secret for JWT token generation

## API Documentation

Once the server is running, you can access:

- **API Documentation**: `http://localhost:8080/api/v1/docs`
- **Health Check**: `http://localhost:8080/api/v1/health`

## Development

### Running Tests

```bash
# Run all tests
make test

# Run tests with coverage
make test-coverage

# Run integration tests
make test-integration
```

### Code Generation

```bash
# Generate mocks
make generate

# Format code
make fmt

# Lint code
make lint
```

### Building Docker Image

```bash
# Build the Docker image
make docker-build

# Run the Docker container
make docker-run
```

## Deployment

### Kubernetes

Example Kubernetes deployment files are provided in the `deploy/kubernetes` directory.

### Helm Chart

A Helm chart is available in the `deploy/helm` directory.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
