package discovery

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/radhi1991/aran-mcp-sentinel/internal/models"
	"github.com/radhi1991/aran-mcp-sentinel/internal/repository"
	"go.uber.org/zap"
)

type DiscoveryService struct {
	logger *zap.Logger
	repo   *repository.MCPServerRepository
}

func NewDiscoveryService(logger *zap.Logger, repo *repository.MCPServerRepository) *DiscoveryService {
	return &DiscoveryService{
		logger: logger,
		repo:   repo,
	}
}

// DiscoverMCPServers scans for MCP servers on common ports and IP ranges
func (d *DiscoveryService) DiscoverMCPServers(ctx context.Context, organizationID uuid.UUID) ([]*models.MCPServer, error) {
	var discoveredServers []*models.MCPServer

	// Common MCP server ports
	commonPorts := []int{3000, 3001, 3002, 8080, 8081, 8082, 9000, 9001, 9002}

	// Get local network ranges
	networkRanges := d.getLocalNetworkRanges()

	for _, networkRange := range networkRanges {
		servers := d.scanNetworkRange(ctx, networkRange, commonPorts, organizationID)
		discoveredServers = append(discoveredServers, servers...)
	}

	// Also scan localhost with common ports
	localhostServers := d.scanLocalhost(ctx, commonPorts, organizationID)
	discoveredServers = append(discoveredServers, localhostServers...)

	d.logger.Info("MCP server discovery completed",
		zap.Int("servers_found", len(discoveredServers)))

	return discoveredServers, nil
}

// getLocalNetworkRanges returns common local network ranges to scan
func (d *DiscoveryService) getLocalNetworkRanges() []string {
	return []string{
		"192.168.1.0/24", // Common home network
		"192.168.0.0/24", // Alternative home network
		"10.0.0.0/24",    // Common corporate network
		"172.16.0.0/24",  // Docker default network
	}
}

// scanNetworkRange scans a network range for MCP servers
func (d *DiscoveryService) scanNetworkRange(ctx context.Context, networkRange string, ports []int, organizationID uuid.UUID) []*models.MCPServer {
	var servers []*models.MCPServer

	// Parse network range (simplified - in production, use proper CIDR parsing)
	if strings.HasSuffix(networkRange, "/24") {
		baseIP := strings.TrimSuffix(networkRange, "/24")

		// Scan first 10 IPs in the range (to avoid long scans)
		for i := 1; i <= 10; i++ {
			ip := fmt.Sprintf("%s.%d", baseIP, i)
			server := d.scanIP(ctx, ip, ports, organizationID)
			if server != nil {
				servers = append(servers, server)
			}
		}
	}

	return servers
}

// scanLocalhost scans localhost for MCP servers
func (d *DiscoveryService) scanLocalhost(ctx context.Context, ports []int, organizationID uuid.UUID) []*models.MCPServer {
	var servers []*models.MCPServer

	// Scan localhost
	server := d.scanIP(ctx, "localhost", ports, organizationID)
	if server != nil {
		servers = append(servers, server)
	}

	// Scan 127.0.0.1
	server = d.scanIP(ctx, "127.0.0.1", ports, organizationID)
	if server != nil {
		servers = append(servers, server)
	}

	return servers
}

// scanIP scans a specific IP for MCP servers on given ports
func (d *DiscoveryService) scanIP(ctx context.Context, ip string, ports []int, organizationID uuid.UUID) *models.MCPServer {
	for _, port := range ports {
		address := fmt.Sprintf("%s:%d", ip, port)

		// Check if port is open and responds to MCP protocol
		if d.isMCPServer(ctx, address) {
			server := &models.MCPServer{
				ID:             uuid.New(),
				OrganizationID: organizationID,
				Name:           fmt.Sprintf("Discovered MCP Server (%s)", address),
				URL:            fmt.Sprintf("http://%s", address),
				Description:    fmt.Sprintf("Auto-discovered MCP server at %s", address),
				Type:           "discovered",
				Status:         "unknown",
				Capabilities:   []string{"discovered"},
				Metadata: map[string]interface{}{
					"discovery_method": "network_scan",
					"discovered_at":    time.Now(),
					"ip_address":       ip,
					"port":             port,
				},
			}

			d.logger.Info("Discovered MCP server",
				zap.String("address", address),
				zap.String("server_id", server.ID.String()))

			return server
		}
	}

	return nil
}

// isMCPServer checks if a given address hosts an MCP server
func (d *DiscoveryService) isMCPServer(ctx context.Context, address string) bool {
	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 2 * time.Second,
	}

	// Try common MCP endpoints
	endpoints := []string{
		"/",
		"/health",
		"/status",
		"/info",
		"/mcp",
		"/api",
		"/api/v1",
		"/api/v1/health",
	}

	for _, endpoint := range endpoints {
		url := fmt.Sprintf("http://%s%s", address, endpoint)

		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			continue
		}

		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		defer resp.Body.Close()

		// Check if response indicates MCP server
		if d.isMCPResponse(resp) {
			return true
		}
	}

	return false
}

// isMCPResponse checks if an HTTP response indicates an MCP server
func (d *DiscoveryService) isMCPResponse(resp *http.Response) bool {
	// Check status code
	if resp.StatusCode < 200 || resp.StatusCode >= 400 {
		return false
	}

	// Check content type for JSON (common for MCP servers)
	contentType := resp.Header.Get("Content-Type")
	if strings.Contains(contentType, "application/json") {
		return true
	}

	// Check for common MCP headers
	mcpHeaders := []string{
		"X-MCP-Version",
		"X-MCP-Server",
		"X-MCP-Capabilities",
	}

	for _, header := range mcpHeaders {
		if resp.Header.Get(header) != "" {
			return true
		}
	}

	// Check if response contains MCP-related content
	// This is a simplified check - in production, you'd parse the response body
	return resp.ContentLength > 0 && resp.ContentLength < 10000 // Reasonable size for MCP responses
}

// SaveDiscoveredServers saves discovered servers to the database
func (d *DiscoveryService) SaveDiscoveredServers(ctx context.Context, servers []*models.MCPServer) error {
	for _, server := range servers {
		if err := d.repo.CreateServer(ctx, server); err != nil {
			d.logger.Error("Failed to save discovered server",
				zap.String("server_name", server.Name),
				zap.String("server_url", server.URL),
				zap.Error(err))
			// Continue with other servers even if one fails
		} else {
			d.logger.Info("Saved discovered server",
				zap.String("server_id", server.ID.String()),
				zap.String("server_name", server.Name))
		}
	}

	return nil
}

// StartPeriodicDiscovery starts a background routine for periodic server discovery
func (d *DiscoveryService) StartPeriodicDiscovery(ctx context.Context, organizationID uuid.UUID, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	d.logger.Info("Starting periodic MCP server discovery",
		zap.Duration("interval", interval))

	for {
		select {
		case <-ctx.Done():
			d.logger.Info("Stopping periodic MCP server discovery")
			return
		case <-ticker.C:
			d.logger.Info("Running periodic MCP server discovery")

			servers, err := d.DiscoverMCPServers(ctx, organizationID)
			if err != nil {
				d.logger.Error("Failed to discover MCP servers", zap.Error(err))
				continue
			}

			if len(servers) > 0 {
				if err := d.SaveDiscoveredServers(ctx, servers); err != nil {
					d.logger.Error("Failed to save discovered servers", zap.Error(err))
				}
			}
		}
	}
}

