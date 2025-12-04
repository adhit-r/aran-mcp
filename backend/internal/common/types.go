package common

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// DiscoveryConfig holds configuration for MCP discovery
type DiscoveryConfig struct {
	PortRanges    []PortRange   `json:"port_ranges"`
	NetworkRanges []string      `json:"network_ranges"`
	KnownPorts    []int         `json:"known_ports"`
	Timeout       time.Duration `json:"timeout"`
	MaxConcurrent int           `json:"max_concurrent"`
}

// PortRange represents a range of ports to scan
type PortRange struct {
	Start int `json:"start"`
	End   int `json:"end"`
}

// DiscoveredServer represents a discovered MCP server
type DiscoveredServer struct {
	URL          string                 `json:"url"`
	Name         string                 `json:"name"`
	Version      string                 `json:"version"`
	Description  string                 `json:"description"`
	Capabilities MCPCapabilities        `json:"capabilities"`
	Tools        []MCPTool              `json:"tools"`
	Resources    []MCPResource          `json:"resources"`
	Prompts      []MCPPrompt            `json:"prompts"`
	Status       string                 `json:"status"`
	LastSeen     time.Time              `json:"last_seen"`
	ResponseTime time.Duration          `json:"response_time"`
	Metadata     map[string]interface{} `json:"metadata"`
}

// MCPCapabilities represents MCP server capabilities
type MCPCapabilities struct {
	Tools     *bool `json:"tools,omitempty"`
	Resources *bool `json:"resources,omitempty"`
	Prompts   *bool `json:"prompts,omitempty"`
	Logging   *bool `json:"logging,omitempty"`
	Sampling  *bool `json:"sampling,omitempty"`
}

// MCPTool represents an MCP tool
type MCPTool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	InputSchema map[string]interface{} `json:"inputSchema"`
}

// MCPResource represents an MCP resource
type MCPResource struct {
	URI         string `json:"uri"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	MimeType    string `json:"mimeType,omitempty"`
}

// MCPPrompt represents an MCP prompt
type MCPPrompt struct {
	Name        string              `json:"name"`
	Description string              `json:"description,omitempty"`
	Arguments   []MCPPromptArgument `json:"arguments,omitempty"`
}

// MCPPromptArgument represents a prompt argument
type MCPPromptArgument struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Required    bool   `json:"required,omitempty"`
}

// ServerMonitor tracks monitoring state for a single server
type ServerMonitor struct {
	ServerID     uuid.UUID
	URL          string
	Name         string
	Status       string
	LastCheck    time.Time
	ResponseTime time.Duration
	ErrorCount   int
	UptimeStart  time.Time
	Metrics      *ServerMetrics
	Cancel       context.CancelFunc
}

// ServerMetrics holds detailed metrics for a server
type ServerMetrics struct {
	TotalRequests    int64         `json:"total_requests"`
	SuccessfulReqs   int64         `json:"successful_requests"`
	FailedRequests   int64         `json:"failed_requests"`
	AverageResponse  time.Duration `json:"average_response_time"`
	UptimePercentage float64       `json:"uptime_percentage"`
	LastError        string        `json:"last_error,omitempty"`
	ToolsCount       int           `json:"tools_count"`
	ResourcesCount   int           `json:"resources_count"`
	PromptsCount     int           `json:"prompts_count"`
}

// MonitoringAlert represents a monitoring alert
type MonitoringAlert struct {
	ID        uuid.UUID              `json:"id"`
	ServerID  uuid.UUID              `json:"server_id"`
	Level     string                 `json:"level"`
	Message   string                 `json:"message"`
	Timestamp time.Time              `json:"timestamp"`
	Details   map[string]interface{} `json:"details,omitempty"`
}

// Alert represents a monitoring alert (legacy type for compatibility)
type Alert struct {
	ID        uuid.UUID `json:"id"`
	ServerID  uuid.UUID `json:"server_id"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
	Details   string    `json:"details"`
	Timestamp time.Time `json:"timestamp"`
	Resolved  bool      `json:"resolved"`
}

// MCPServerInfo represents server information
type MCPServerInfo struct {
	Name         string            `json:"name"`
	Version      string            `json:"version"`
	Description  string            `json:"description,omitempty"`
	Capabilities MCPCapabilities   `json:"capabilities"`
	Metadata     map[string]string `json:"metadata,omitempty"`
}

// MCPRequest represents a standard MCP request
type MCPRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params,omitempty"`
}

// MCPResponse represents a standard MCP response
type MCPResponse struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Result  interface{} `json:"result,omitempty"`
	Error   *MCPError   `json:"error,omitempty"`
}

// MCPError represents an MCP error
type MCPError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}
