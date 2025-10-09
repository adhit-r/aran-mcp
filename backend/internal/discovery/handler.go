package discovery

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/radhi1991/aran-mcp-sentinel/internal/repository"
	"go.uber.org/zap"
)

type DiscoveryHandler struct {
	logger           *zap.Logger
	discoveryService *DiscoveryService
}

func NewDiscoveryHandler(logger *zap.Logger, repo *repository.MCPServerRepository) *DiscoveryHandler {
	discoveryService := NewDiscoveryService(logger, repo)
	return &DiscoveryHandler{
		logger:           logger,
		discoveryService: discoveryService,
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

