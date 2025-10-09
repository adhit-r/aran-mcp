package models

// MCPServerPreset represents a predefined MCP server configuration
type MCPServerPreset struct {
	ID                string                 `json:"id"`
	Name              string                 `json:"name"`
	Description       string                 `json:"description"`
	Category          string                 `json:"category"`
	Icon              string                 `json:"icon"`
	DefaultURL        string                 `json:"default_url"`
	ConfigTemplate    map[string]interface{} `json:"config_template"`
	SetupInstructions string                 `json:"setup_instructions"`
	SecurityNotes     string                 `json:"security_notes"`
	RequiredTools     []string               `json:"required_tools"`
}

// GetMCPServerPresets returns predefined MCP server configurations
func GetMCPServerPresets() []MCPServerPreset {
	return []MCPServerPreset{
		{
			ID:          "filesystem",
			Name:        "Filesystem MCP Server",
			Description: "Secure filesystem operations with read/write capabilities",
			Category:    "Storage",
			Icon:        "folder",
			DefaultURL:  "http://localhost:3001",
			ConfigTemplate: map[string]interface{}{
				"allowed_paths": []string{"/tmp", "/data"},
				"read_only":     false,
				"max_file_size": "10MB",
			},
			SetupInstructions: `1. Install: npm install -g @modelcontextprotocol/server-filesystem
2. Run: mcp-server-filesystem --port 3001
3. Configure allowed paths in security settings`,
			SecurityNotes: "Restrict filesystem access to specific directories. Enable read-only mode for sensitive data.",
			RequiredTools: []string{"file_read", "file_write", "file_list"},
		},
		{
			ID:          "postgres",
			Name:        "PostgreSQL Database MCP",
			Description: "Secure database query and management interface",
			Category:    "Database",
			Icon:        "database",
			DefaultURL:  "http://localhost:3002",
			ConfigTemplate: map[string]interface{}{
				"connection_string": "postgresql://user:pass@localhost:5432/db",
				"read_only":         true,
				"query_timeout":     "30s",
				"max_rows":          1000,
			},
			SetupInstructions: `1. Install: npm install -g @modelcontextprotocol/server-postgres
2. Set DATABASE_URL environment variable
3. Run: mcp-server-postgres --port 3002`,
			SecurityNotes: "Use read-only credentials. Implement query sanitization. Monitor for SQL injection attempts.",
			RequiredTools: []string{"query", "schema", "list_tables"},
		},
		{
			ID:          "github",
			Name:        "GitHub MCP Server",
			Description: "GitHub repository management and code operations",
			Category:    "Development",
			Icon:        "github",
			DefaultURL:  "http://localhost:3003",
			ConfigTemplate: map[string]interface{}{
				"token":       "ghp_xxxxx",
				"org":         "your-org",
				"permissions": []string{"read:repo", "write:issues"},
			},
			SetupInstructions: `1. Create GitHub Personal Access Token
2. Install: npm install -g @modelcontextprotocol/server-github
3. Set GITHUB_TOKEN environment variable
4. Run: mcp-server-github --port 3003`,
			SecurityNotes: "Use fine-grained tokens with minimal permissions. Rotate tokens regularly. Monitor repository access.",
			RequiredTools: []string{"create_issue", "list_repos", "search_code"},
		},
		{
			ID:          "slack",
			Name:        "Slack MCP Server",
			Description: "Slack messaging and collaboration integration",
			Category:    "Communication",
			Icon:        "message-circle",
			DefaultURL:  "http://localhost:3004",
			ConfigTemplate: map[string]interface{}{
				"token":    "xoxb-xxxxx",
				"channels": []string{"#general", "#alerts"},
			},
			SetupInstructions: `1. Create Slack App and get Bot Token
2. Install: npm install -g @modelcontextprotocol/server-slack
3. Set SLACK_TOKEN environment variable
4. Run: mcp-server-slack --port 3004`,
			SecurityNotes: "Limit bot permissions. Monitor message content for sensitive data. Use workspace-approved apps only.",
			RequiredTools: []string{"send_message", "list_channels", "get_history"},
		},
		{
			ID:          "google-drive",
			Name:        "Google Drive MCP",
			Description: "Google Drive file management and collaboration",
			Category:    "Storage",
			Icon:        "cloud",
			DefaultURL:  "http://localhost:3005",
			ConfigTemplate: map[string]interface{}{
				"credentials": "path/to/credentials.json",
				"scopes":      []string{"drive.readonly"},
			},
			SetupInstructions: `1. Create Google Cloud project and enable Drive API
2. Download credentials JSON
3. Install: npm install -g @modelcontextprotocol/server-gdrive
4. Run: mcp-server-gdrive --port 3005`,
			SecurityNotes: "Use service accounts with minimal permissions. Implement folder-level access controls.",
			RequiredTools: []string{"list_files", "download", "upload"},
		},
		{
			ID:          "memory",
			Name:        "Memory/KV Store MCP",
			Description: "Key-value storage for agent memory and context",
			Category:    "Storage",
			Icon:        "brain",
			DefaultURL:  "http://localhost:3006",
			ConfigTemplate: map[string]interface{}{
				"backend":    "redis",
				"host":       "localhost:6379",
				"max_memory": "100MB",
				"ttl":        "1h",
			},
			SetupInstructions: `1. Start Redis: redis-server
2. Install: npm install -g @modelcontextprotocol/server-memory
3. Run: mcp-server-memory --port 3006`,
			SecurityNotes: "Encrypt sensitive data at rest. Implement TTL for temporary data. Monitor for data exfiltration.",
			RequiredTools: []string{"get", "set", "delete", "list"},
		},
		{
			ID:          "web-search",
			Name:        "Web Search MCP",
			Description: "Web search and content retrieval capabilities",
			Category:    "Data",
			Icon:        "search",
			DefaultURL:  "http://localhost:3007",
			ConfigTemplate: map[string]interface{}{
				"provider":    "brave",
				"api_key":     "xxxxx",
				"max_results": 10,
				"safe_search": true,
			},
			SetupInstructions: `1. Get API key from Brave Search or alternative
2. Install: npm install -g @modelcontextprotocol/server-search
3. Set SEARCH_API_KEY environment variable
4. Run: mcp-server-search --port 3007`,
			SecurityNotes: "Monitor search queries for sensitive information. Implement rate limiting. Filter results for malicious content.",
			RequiredTools: []string{"search", "fetch_url"},
		},
		{
			ID:          "notion",
			Name:        "Notion MCP Server",
			Description: "Notion workspace and knowledge base integration",
			Category:    "Productivity",
			Icon:        "book-open",
			DefaultURL:  "http://localhost:3008",
			ConfigTemplate: map[string]interface{}{
				"token":       "secret_xxxxx",
				"database_id": "xxxxx",
			},
			SetupInstructions: `1. Create Notion integration and get token
2. Install: npm install -g @modelcontextprotocol/server-notion
3. Set NOTION_TOKEN environment variable
4. Run: mcp-server-notion --port 3008`,
			SecurityNotes: "Use integration tokens with limited page access. Monitor for data leakage. Implement content filtering.",
			RequiredTools: []string{"create_page", "query_database", "update_page"},
		},
		{
			ID:          "aws",
			Name:        "AWS Services MCP",
			Description: "AWS cloud services integration (S3, Lambda, etc.)",
			Category:    "Cloud",
			Icon:        "cloud",
			DefaultURL:  "http://localhost:3009",
			ConfigTemplate: map[string]interface{}{
				"region":            "us-east-1",
				"access_key_id":     "AKIA...",
				"secret_access_key": "xxxxx",
				"services":          []string{"s3", "lambda"},
			},
			SetupInstructions: `1. Create IAM user with minimal permissions
2. Install: npm install -g @modelcontextprotocol/server-aws
3. Configure AWS credentials
4. Run: mcp-server-aws --port 3009`,
			SecurityNotes: "Use IAM roles with least privilege. Enable CloudTrail logging. Rotate credentials regularly.",
			RequiredTools: []string{"s3_list", "s3_get", "lambda_invoke"},
		},
		{
			ID:          "custom-http",
			Name:        "Custom HTTP MCP",
			Description: "Generic HTTP API integration template",
			Category:    "Integration",
			Icon:        "globe",
			DefaultURL:  "http://localhost:3010",
			ConfigTemplate: map[string]interface{}{
				"base_url":   "https://api.example.com",
				"auth_type":  "bearer",
				"auth_token": "xxxxx",
				"timeout":    "30s",
				"rate_limit": 100,
			},
			SetupInstructions: `1. Define your API endpoints
2. Install: npm install -g @modelcontextprotocol/server-http
3. Configure authentication
4. Run: mcp-server-http --port 3010`,
			SecurityNotes: "Validate all inputs. Implement request signing. Monitor for SSRF attacks. Use HTTPS only.",
			RequiredTools: []string{"get", "post", "put", "delete"},
		},
	}
}

// GetPresetByID returns a preset by its ID
func GetPresetByID(id string) *MCPServerPreset {
	presets := GetMCPServerPresets()
	for _, preset := range presets {
		if preset.ID == id {
			return &preset
		}
	}
	return nil
}

// GetPresetsByCategory returns presets filtered by category
func GetPresetsByCategory(category string) []MCPServerPreset {
	presets := GetMCPServerPresets()
	filtered := []MCPServerPreset{}

	for _, preset := range presets {
		if preset.Category == category {
			filtered = append(filtered, preset)
		}
	}

	return filtered
}


