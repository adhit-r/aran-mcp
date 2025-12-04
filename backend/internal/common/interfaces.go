package common

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// MCPDiscoveryService defines the interface for MCP server discovery
type MCPDiscoveryService interface {
	DiscoverServers(ctx context.Context, config DiscoveryConfig) ([]*DiscoveredServer, error)
	GetDiscoveredServers() []*DiscoveredServer
	RefreshServer(ctx context.Context, serverURL string) (*DiscoveredServer, error)
}

// MCPMonitorService defines the interface for MCP server monitoring
type MCPMonitorService interface {
	StartMonitoring(serverID uuid.UUID, url, name string, interval time.Duration) error
	StopMonitoring(url string)
	GetServerStatus(url string) (*ServerMonitor, bool)
	GetAllStatuses() []*ServerMonitor
	GetServerMetrics(url string) (*ServerMetrics, error)
	GetRecentAlerts(limit int) ([]*Alert, error)
}

// MCPProtocolService defines the interface for MCP protocol operations
type MCPProtocolService interface {
	Initialize(ctx context.Context, serverURL string) (*MCPServerInfo, error)
	ListTools(ctx context.Context, serverURL string) ([]MCPTool, error)
	ListResources(ctx context.Context, serverURL string) ([]MCPResource, error)
	ListPrompts(ctx context.Context, serverURL string) ([]MCPPrompt, error)
	CallTool(ctx context.Context, serverURL, toolName string, arguments map[string]interface{}) (interface{}, error)
	ReadResource(ctx context.Context, serverURL, resourceURI string) (interface{}, error)
	Ping(ctx context.Context, serverURL string) error
}
