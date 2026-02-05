# aran CLI

A command-line interface for interacting with the aran-mcp API.

## Installation

### From Source

```bash
cd cli
go build -o aran ./cmd/
sudo mv aran /usr/local/bin/
```

### Using Go Install

```bash
go install github.com/radhi1991/aran-mcp-sentinel/cli/cmd@latest
```

## Quick Start

### 1. Configure the CLI

```bash
# Interactive setup
aran configure init

# Or set values directly
aran configure set api-endpoint http://localhost:8080
aran configure set api-key your-api-key
```

### 2. Check API Health

```bash
aran health
```

### 3. List Servers

```bash
aran servers list
```

## Commands

### Configuration

```bash
# Initialize configuration
aran configure init

# Show current configuration
aran configure show

# Set a configuration value
aran configure set <key> <value>

# Manage profiles
aran configure profile add production --endpoint https://api.example.com --key xxx
aran configure profile list
aran configure profile use production
aran configure profile remove production
```

### Health Check

```bash
aran health
```

### Server Management

```bash
# List all servers
aran servers list
aran srv list

# Get server details
aran servers get <id>

# Create a new server
aran servers create --name "My Server" --url "http://localhost:3000" --type api

# Delete a server
aran servers delete <id>
```

### Search

```bash
# Text search
aran search "filesystem"

# Filter by status
aran search --status online,offline

# Filter by type
aran search --type api,database

# Combined filters with sorting
aran search "prod" --status online --sort name --limit 10
```

### Alerts

```bash
# List all alerts
aran alerts list
```

### Discovery

```bash
# Discover MCP server capabilities
aran discover http://localhost:3000
```

## Output Formats

All commands support multiple output formats:

```bash
# Table output (default)
aran servers list

# JSON output
aran servers list -o json

# YAML output
aran servers list -o yaml
```

## Configuration File

Configuration is stored in `~/.aran-mcp/config.yaml`:

```yaml
api_endpoint: http://localhost:8080
api_key: your-api-key
format: table
timeout: 30
profiles:
  production:
    name: production
    api_endpoint: https://api.example.com
    api_key: prod-api-key
    default: false
  staging:
    name: staging
    api_endpoint: https://staging.example.com
    api_key: staging-api-key
    default: true
active: production
```

## Environment Variables

You can also use environment variables:

```bash
export ARAN_API_ENDPOINT=http://localhost:8080
export ARAN_API_KEY=your-api-key
```

## Shell Completion

Generate shell completion scripts:

```bash
# Bash
aran completion bash > /etc/bash_completion.d/aran

# Zsh
aran completion zsh > "${fpath[1]}/_aran"

# Fish
aran completion fish > ~/.config/fish/completions/aran.fish

# PowerShell
aran completion powershell > aran.ps1
```

## Examples

### Managing Multiple Environments

```bash
# Add profiles for different environments
aran configure profile add dev --endpoint http://localhost:8080 --key dev-key
aran configure profile add staging --endpoint https://staging.example.com --key stage-key
aran configure profile add prod --endpoint https://api.example.com --key prod-key

# Switch between profiles
aran configure profile use dev
aran servers list  # Lists dev servers

aran configure profile use prod
aran servers list  # Lists prod servers
```

### Quick Server Operations

```bash
# Create and verify a server
aran servers create -n "API Gateway" -u "http://gateway:8080" -t api
aran servers list

# Search for specific servers
aran search "gateway" --status online

# Get detailed info
aran servers get abc123 -o json
```

### Monitoring

```bash
# Check health
aran health

# View active alerts
aran alerts list -o json | jq '.[] | select(.severity == "critical")'
```

## License

MIT License - see [LICENSE](../LICENSE) for details.
