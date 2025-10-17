package discovery

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/radhi1991/aran-mcp-sentinel/internal/mcp"
	"go.uber.org/zap"
)

// MCPDiscoveryService handles automatic discovery of MCP servers
type MCPDiscoveryService struct {
	logger   *zap.Logger
	protocol *mcp.MCPProtocol
	mu       sync.RWMutex
	servers  map[string]*DiscoveredServer
}

// DiscoveredServer represents a discovered MCP server
type DiscoveredServer struct {
	URL          string                 `json:"url"`
	Name         string                 `json:"name"`
	Version      string                 `json:"version"`
	Description  string                 `json:"description"`
	Capabilities mcp.MCPCapabilities    `json:"capabilities"`
	Tools        []mcp.MCPTool          `json:"tools"`
	Resources    []mcp.MCPResource      `json:"resources"`
	Prompts      []mcp.MCPPrompt        `json:"prompts"`
	Status       string                 `json:"status"`
	LastSeen     time.Time              `json:"last_seen"`
	ResponseTime time.Duration          `json:"response_time"`
	Metadata     map[string]interface{} `json:"metadata"`
}

// DiscoveryConfig holds configuration for MCP discovery
type DiscoveryConfig struct {
	PortRanges    []PortRange `json:"port_ranges"`
	NetworkRanges []string    `json:"network_ranges"`
	KnownPorts    []int       `json:"known_ports"`
	Timeout       time.Duration `json:"timeout"`
	MaxConcurrent int         `json:"max_concurrent"`
}

// PortRange represents a range of ports to scan
type PortRange struct {
	Start int `json:"start"`
	End   int `json:"end"`
}

// NewMCPDiscoveryService creates a new MCP discovery service
func NewMCPDiscoveryService(logger *zap.Logger) *MCPDiscoveryService {
	return &MCPDiscoveryService{
		logger:   logger,
		protocol: mcp.NewMCPProtocol(logger),
		servers:  make(map[string]*DiscoveredServer),
	}
}

// DiscoverServers performs comprehensive MCP server discovery
func (d *MCPDiscoveryService) DiscoverServers(ctx context.Context, config DiscoveryConfig) ([]*DiscoveredServer, error) {
	d.logger.Info("Starting MCP server discovery",
		zap.Int("port_ranges", len(config.PortRanges)),
		zap.Int("network_ranges", len(config.NetworkRanges)),
		zap.Duration("timeout", config.Timeout),
	)

	var allServers []*DiscoveredServer
	
	// Discover on localhost first (most common)
	localServers, err := d.discoverLocalServers(ctx, config)
	if err != nil {
		d.logger.Warn("Failed to discover local servers", zap.Error(err))
	} else {
		allServers = append(allServers, localServers...)
	}

	// Discover on network ranges
	for _, networkRange := range config.NetworkRanges {
		networkServers, err := d.discoverNetworkServers(ctx, networkRange, config)
		if err != nil {
			d.logger.Warn("Failed to discover network servers", 
				zap.String("network", networkRange),
				zap.Error(err),
			)
			continue
		}
		allServers = append(allServers, networkServers...)
	}

	// Update internal cache
	d.mu.Lock()
	for _, server := range allServers {
		d.servers[server.URL] = server
	}
	d.mu.Unlock()

	d.logger.Info("MCP discovery completed",
		zap.Int("servers_found", len(allServers)),
	)

	return allServers, nil
}

// discoverLocalServers discovers MCP servers on localhost
func (d *MCPDiscoveryService) discoverLocalServers(ctx context.Context, config DiscoveryConfig) ([]*DiscoveredServer, error) {
	var servers []*DiscoveredServer
	
	// Common MCP server ports
	commonPorts := []int{3000, 3001, 3002, 8000, 8001, 8080, 9000}
	if len(config.KnownPorts) > 0 {
		commonPorts = append(commonPorts, config.KnownPorts...)
	}

	// Add port ranges
	for _, portRange := range config.PortRanges {
		for port := portRange.Start; port <= portRange.End; port++ {
			commonPorts = append(commonPorts, port)
		}
	}

	// Scan ports concurrently
	semaphore := make(chan struct{}, config.MaxConcurrent)
	var wg sync.WaitGroup
	var mu sync.Mutex

	for _, port := range commonPorts {
		wg.Add(1)
		go func(p int) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			server, err := d.probeServer(ctx, fmt.Sprintf("http://localhost:%d", p), config.Timeout)
			if err != nil {
				return // Server not found or not MCP
			}

			mu.Lock()
			servers = append(servers, server)
			mu.Unlock()
		}(port)
	}

	wg.Wait()
	return servers, nil
}

// discoverNetworkServers discovers MCP servers on a network range
func (d *MCPDiscoveryService) discoverNetworkServers(ctx context.Context, networkRange string, config DiscoveryConfig) ([]*DiscoveredServer, error) {
	var servers []*DiscoveredServer

	// Parse network range (e.g., "192.168.1.0/24")
	_, ipNet, err := net.ParseCIDR(networkRange)
	if err != nil {
		return nil, fmt.Errorf("invalid network range: %w", err)
	}

	// Generate IP addresses in range
	ips := generateIPsInRange(ipNet)
	
	// Limit concurrent scans
	semaphore := make(chan struct{}, config.MaxConcurrent)
	var wg sync.WaitGroup
	var mu sync.Mutex

	for _, ip := range ips {
		for _, port := range config.KnownPorts {
			wg.Add(1)
			go func(ipAddr string, p int) {
				defer wg.Done()
				semaphore <- struct{}{}
				defer func() { <-semaphore }()

				serverURL := fmt.Sprintf("http://%s:%d", ipAddr, p)
				server, err := d.probeServer(ctx, serverURL, config.Timeout)
				if err != nil {
					return
				}

				mu.Lock()
				servers = append(servers, server)
				mu.Unlock()
			}(ip.String(), port)
		}
	}

	wg.Wait()
	return servers, nil
}

// probeServer attempts to connect to and identify an MCP server
func (d *MCPDiscoveryService) probeServer(ctx context.Context, serverURL string, timeout time.Duration) (*DiscoveredServer, error) {
	probeCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	start := time.Now()

	// First, check if the server is reachable
	if !d.isServerReachable(probeCtx, serverURL) {
		return nil, fmt.Errorf("server not reachable")
	}

	// Try to initialize MCP connection
	serverInfo, err := d.protocol.Initialize(probeCtx, serverURL)
	if err != nil {
		return nil, fmt.Errorf("not an MCP server: %w", err)
	}

	responseTime := time.Since(start)

	// Discover capabilities
	server := &DiscoveredServer{
		URL:          serverURL,
		Name:         serverInfo.Name,
		Version:      serverInfo.Version,
		Description:  serverInfo.Description,
		Capabilities: serverInfo.Capabilities,
		Status:       "online",
		LastSeen:     time.Now(),
		ResponseTime: responseTime,
		Metadata:     make(map[string]interface{}),
	}

	// Get tools if supported
	if serverInfo.Capabilities.Tools != nil {
		tools, err := d.protocol.ListTools(probeCtx, serverURL)
		if err != nil {
			d.logger.Warn("Failed to list tools", zap.String("url", serverURL), zap.Error(err))
		} else {
			server.Tools = tools
		}
	}

	// Get resources if supported
	if serverInfo.Capabilities.Resources != nil {
		resources, err := d.protocol.ListResources(probeCtx, serverURL)
		if err != nil {
			d.logger.Warn("Failed to list resources", zap.String("url", serverURL), zap.Error(err))
		} else {
			server.Resources = resources
		}
	}

	// Get prompts if supported
	if serverInfo.Capabilities.Prompts != nil {
		prompts, err := d.protocol.ListPrompts(probeCtx, serverURL)
		if err != nil {
			d.logger.Warn("Failed to list prompts", zap.String("url", serverURL), zap.Error(err))
		} else {
			server.Prompts = prompts
		}
	}

	d.logger.Info("Discovered MCP server",
		zap.String("url", serverURL),
		zap.String("name", server.Name),
		zap.String("version", server.Version),
		zap.Int("tools", len(server.Tools)),
		zap.Int("resources", len(server.Resources)),
		zap.Duration("response_time", responseTime),
	)

	return server, nil
}

// isServerReachable checks if a server is reachable via HTTP
func (d *MCPDiscoveryService) isServerReachable(ctx context.Context, serverURL string) bool {
	client := &http.Client{Timeout: 5 * time.Second}
	
	req, err := http.NewRequestWithContext(ctx, "HEAD", serverURL, nil)
	if err != nil {
		return false
	}

	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode < 500
}

// GetDiscoveredServers returns all discovered servers
func (d *MCPDiscoveryService) GetDiscoveredServers() []*DiscoveredServer {
	d.mu.RLock()
	defer d.mu.RUnlock()

	servers := make([]*DiscoveredServer, 0, len(d.servers))
	for _, server := range d.servers {
		servers = append(servers, server)
	}

	return servers
}

// RefreshServer updates information for a specific server
func (d *MCPDiscoveryService) RefreshServer(ctx context.Context, serverURL string) (*DiscoveredServer, error) {
	server, err := d.probeServer(ctx, serverURL, 10*time.Second)
	if err != nil {
		return nil, err
	}

	d.mu.Lock()
	d.servers[serverURL] = server
	d.mu.Unlock()

	return server, nil
}

// DiscoverFromEnvironment discovers MCP servers from environment variables
func (d *MCPDiscoveryService) DiscoverFromEnvironment() []*DiscoveredServer {
	// Common environment variables that might contain MCP server URLs
	envVars := []string{
		"MCP_SERVER_URL",
		"MCP_SERVERS",
		"MODEL_CONTEXT_PROTOCOL_URL",
	}

	var servers []*DiscoveredServer
	
	for _, envVar := range envVars {
		// This would be implemented to read from environment
		// For now, return empty slice
	}

	return servers
}

// generateIPsInRange generates all IP addresses in a CIDR range
func generateIPsInRange(ipNet *net.IPNet) []net.IP {
	var ips []net.IP
	
	for ip := ipNet.IP.Mask(ipNet.Mask); ipNet.Contains(ip); incrementIP(ip) {
		// Skip network and broadcast addresses
		if !ip.Equal(ipNet.IP) && !isBroadcast(ip, ipNet) {
			ips = append(ips, make(net.IP, len(ip)))
			copy(ips[len(ips)-1], ip)
		}
		
		// Limit to reasonable number of IPs to scan
		if len(ips) > 254 {
			break
		}
	}
	
	return ips
}

// incrementIP increments an IP address
func incrementIP(ip net.IP) {
	for j := len(ip) - 1; j >= 0; j-- {
		ip[j]++
		if ip[j] > 0 {
			break
		}
	}
}

// isBroadcast checks if an IP is the broadcast address
func isBroadcast(ip net.IP, ipNet *net.IPNet) bool {
	broadcast := make(net.IP, len(ip))
	for i := range ip {
		broadcast[i] = ip[i] | ^ipNet.Mask[i]
	}
	return ip.Equal(broadcast)
}