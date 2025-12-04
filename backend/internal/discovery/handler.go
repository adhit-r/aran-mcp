package discovery

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type DiscoveryHandler struct {
	logger           *zap.Logger
	discoveryService *DiscoveryService
	endpointScanner  *EndpointScanner
}

func NewDiscoveryHandler(logger *zap.Logger, repo interface{}) *DiscoveryHandler {
	// Create endpoint scanner for endpoint scanning
	endpointScanner := NewEndpointScanner(logger)
	
	// Discovery service is optional - endpoint scanning doesn't require it
	// We'll create it as nil since we're not using it for endpoint scanning endpoints
	return &DiscoveryHandler{
		logger:           logger,
		discoveryService: nil,
		endpointScanner:  endpointScanner,
	}
}

// RegisterRoutes registers all discovery API routes
func (h *DiscoveryHandler) RegisterRoutes(router *gin.RouterGroup) {
	discoveryGroup := router.Group("/discovery")
	{
		discoveryGroup.POST("/scan", h.ScanForServers)
		discoveryGroup.GET("/status", h.GetDiscoveryStatus)
		discoveryGroup.POST("/start-periodic", h.StartPeriodicDiscovery)
		discoveryGroup.POST("/stop-periodic", h.StopPeriodicDiscovery)
		
		// Endpoint scanning routes
		discoveryGroup.POST("/endpoint/scan", h.ScanEndpoint)
		discoveryGroup.POST("/endpoint/scan-multiple", h.ScanMultipleEndpoints)
		discoveryGroup.POST("/endpoint/scan-ports", h.ScanPortRange)
	}
}

// ScanForServersRequest represents the request body for scanning
type ScanForServersRequest struct {
	OrganizationID string   `json:"organization_id" binding:"required"`
	NetworkRanges  []string `json:"network_ranges,omitempty"`
	Ports          []int    `json:"ports,omitempty"`
}

// ScanForServers scans for MCP servers
func (h *DiscoveryHandler) ScanForServers(c *gin.Context) {
	if h.discoveryService == nil {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "Discovery service not available. Use endpoint scanning instead."})
		return
	}

	var req ScanForServersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid scan request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Parse organization ID
	orgID, err := uuid.Parse(req.OrganizationID)
	if err != nil {
		h.logger.Error("Invalid organization ID", zap.String("org_id", req.OrganizationID), zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	// Start discovery in background
	go func() {
		ctx := c.Request.Context()
		servers, err := h.discoveryService.DiscoverMCPServers(ctx, orgID)
		if err != nil {
			h.logger.Error("Discovery failed", zap.Error(err))
			return
		}

		if len(servers) > 0 {
			if err := h.discoveryService.SaveDiscoveredServers(ctx, servers); err != nil {
				h.logger.Error("Failed to save discovered servers", zap.Error(err))
			}
		}
	}()

	h.logger.Info("Started MCP server discovery", zap.String("organization_id", req.OrganizationID))
	c.JSON(http.StatusOK, gin.H{
		"message": "MCP server discovery started",
		"status":  "scanning",
	})
}

// GetDiscoveryStatus returns the current discovery status
func (h *DiscoveryHandler) GetDiscoveryStatus(c *gin.Context) {
	// For now, return a simple status
	// In production, you'd track discovery state
	c.JSON(http.StatusOK, gin.H{
		"status":    "active",
		"last_scan": time.Now().Format(time.RFC3339),
		"message":   "Discovery service is running",
	})
}

// StartPeriodicDiscoveryRequest represents the request to start periodic discovery
type StartPeriodicDiscoveryRequest struct {
	OrganizationID  string `json:"organization_id" binding:"required"`
	IntervalMinutes int    `json:"interval_minutes,omitempty"`
}

// StartPeriodicDiscovery starts periodic server discovery
func (h *DiscoveryHandler) StartPeriodicDiscovery(c *gin.Context) {
	if h.discoveryService == nil {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "Discovery service not available"})
		return
	}

	var req StartPeriodicDiscoveryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid periodic discovery request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Parse organization ID
	orgID, err := uuid.Parse(req.OrganizationID)
	if err != nil {
		h.logger.Error("Invalid organization ID", zap.String("org_id", req.OrganizationID), zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	// Set default interval if not provided
	intervalMinutes := req.IntervalMinutes
	if intervalMinutes <= 0 {
		intervalMinutes = 30 // Default to 30 minutes
	}

	interval := time.Duration(intervalMinutes) * time.Minute

	// Start periodic discovery in background
	go h.discoveryService.StartPeriodicDiscovery(c.Request.Context(), orgID, interval)

	h.logger.Info("Started periodic MCP server discovery",
		zap.String("organization_id", req.OrganizationID),
		zap.Duration("interval", interval))

	c.JSON(http.StatusOK, gin.H{
		"message":          "Periodic MCP server discovery started",
		"interval_minutes": intervalMinutes,
		"status":           "active",
	})
}

// StopPeriodicDiscovery stops periodic server discovery
func (h *DiscoveryHandler) StopPeriodicDiscovery(c *gin.Context) {
	// In production, you'd implement proper discovery state management
	// For now, just return a success message

	h.logger.Info("Stopped periodic MCP server discovery")
	c.JSON(http.StatusOK, gin.H{
		"message": "Periodic MCP server discovery stopped",
		"status":  "inactive",
	})
}

// ScanEndpointRequest represents the request to scan a single endpoint
type ScanEndpointRequest struct {
	URL string `json:"url" binding:"required"`
}

// ScanEndpoint scans a single endpoint for MCP server information
func (h *DiscoveryHandler) ScanEndpoint(c *gin.Context) {
	var req ScanEndpointRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid scan endpoint request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx := c.Request.Context()
	result := h.endpointScanner.ScanEndpoint(ctx, req.URL)

	h.logger.Info("Endpoint scan completed",
		zap.String("url", req.URL),
		zap.Bool("is_mcp", result.IsMCPServer),
		zap.String("version", result.Version))

	c.JSON(http.StatusOK, gin.H{
		"result": result,
	})
}

// ScanMultipleEndpointsRequest represents the request to scan multiple endpoints
type ScanMultipleEndpointsRequest struct {
	URLs         []string `json:"urls" binding:"required"`
	MaxConcurrent int     `json:"max_concurrent,omitempty"`
}

// ScanMultipleEndpoints scans multiple endpoints concurrently
func (h *DiscoveryHandler) ScanMultipleEndpoints(c *gin.Context) {
	var req ScanMultipleEndpointsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid scan multiple endpoints request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	maxConcurrent := req.MaxConcurrent
	if maxConcurrent <= 0 {
		maxConcurrent = 10
	}

	ctx := c.Request.Context()
	results := h.endpointScanner.ScanMultipleEndpoints(ctx, req.URLs, maxConcurrent)

	h.logger.Info("Multiple endpoint scan completed",
		zap.Int("total_urls", len(req.URLs)),
		zap.Int("results", len(results)))

	c.JSON(http.StatusOK, gin.H{
		"results":      results,
		"total_scanned": len(req.URLs),
		"total_found":   len(results),
	})
}

// ScanPortRangeRequest represents the request to scan a port range
type ScanPortRangeRequest struct {
	Host          string `json:"host" binding:"required"`
	StartPort     int    `json:"start_port" binding:"required"`
	EndPort       int    `json:"end_port" binding:"required"`
	MaxConcurrent int    `json:"max_concurrent,omitempty"`
}

// ScanPortRange scans a range of ports on a given host
func (h *DiscoveryHandler) ScanPortRange(c *gin.Context) {
	var req ScanPortRangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid scan port range request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Validate port range
	if req.StartPort < 1 || req.StartPort > 65535 || req.EndPort < 1 || req.EndPort > 65535 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid port range (must be 1-65535)"})
		return
	}

	if req.StartPort > req.EndPort {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Start port must be less than or equal to end port"})
		return
	}

	// Limit port range to prevent excessive scanning
	if req.EndPort-req.StartPort > 1000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Port range too large (max 1000 ports)"})
		return
	}

	maxConcurrent := req.MaxConcurrent
	if maxConcurrent <= 0 {
		maxConcurrent = 20
	}

	ctx := c.Request.Context()
	results := h.endpointScanner.ScanPortRange(ctx, req.Host, req.StartPort, req.EndPort, maxConcurrent)

	// Filter to only MCP servers
	mcpServers := make([]*ScanResult, 0)
	for _, result := range results {
		if result.IsMCPServer {
			mcpServers = append(mcpServers, result)
		}
	}

	h.logger.Info("Port range scan completed",
		zap.String("host", req.Host),
		zap.Int("start_port", req.StartPort),
		zap.Int("end_port", req.EndPort),
		zap.Int("mcp_servers_found", len(mcpServers)))

	c.JSON(http.StatusOK, gin.H{
		"results":        results,
		"mcp_servers":    mcpServers,
		"total_ports":     req.EndPort - req.StartPort + 1,
		"reachable":      len(results),
		"mcp_servers_count": len(mcpServers),
	})
}

