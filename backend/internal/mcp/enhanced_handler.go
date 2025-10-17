package mcp

import (
	"context"
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/radhi1991/aran-mcp-sentinel/internal/discovery"
	"github.com/radhi1991/aran-mcp-sentinel/internal/monitoring"
	"go.uber.org/zap"
)

// EnhancedHandler provides real MCP functionality
type EnhancedHandler struct {
	db           *sql.DB
	logger       *zap.Logger
	protocol     *MCPProtocol
	discovery    *discovery.MCPDiscoveryService
	monitor      *monitoring.MCPMonitor
	toolManager  *ToolManager
}

// NewEnhancedHandler creates a new enhanced MCP handler
func NewEnhancedHandler(db *sql.DB, logger *zap.Logger) *EnhancedHandler {
	return &EnhancedHandler{
		db:          db,
		logger:      logger,
		protocol:    NewMCPProtocol(logger),
		discovery:   discovery.NewMCPDiscoveryService(logger),
		monitor:     monitoring.NewMCPMonitor(db, logger),
		toolManager: NewToolManager(db, logger),
	}
}

// RegisterEnhancedRoutes registers enhanced MCP API routes
func (h *EnhancedHandler) RegisterEnhancedRoutes(router *gin.RouterGroup) {
	// Discovery endpoints
	discoveryGroup := router.Group("/discovery")
	{
		discoveryGroup.POST("/scan", h.DiscoverServers)
		discoveryGroup.GET("/servers", h.GetDiscoveredServers)
		discoveryGroup.POST("/servers/:url/refresh", h.RefreshServer)
	}

	// Real MCP protocol endpoints
	protocolGroup := router.Group("/protocol")
	{
		protocolGroup.POST("/initialize", h.InitializeServer)
		protocolGroup.POST("/ping", h.PingServer)
		protocolGroup.GET("/servers/:id/capabilities", h.GetServerCapabilities)
	}

	// Tool management endpoints
	toolsGroup := router.Group("/tools")
	{
		toolsGroup.GET("", h.ListTools)
		toolsGroup.GET("/:id", h.GetTool)
		toolsGroup.POST("/:id/execute", h.ExecuteTool)
		toolsGroup.GET("/:id/stats", h.GetToolStats)
		toolsGroup.POST("/discover/:server_id", h.DiscoverTools)
	}

	// Resource management endpoints
	resourcesGroup := router.Group("/resources")
	{
		resourcesGroup.GET("/servers/:server_id", h.ListResources)
		resourcesGroup.POST("/read", h.ReadResource)
	}

	// Monitoring endpoints
	monitoringGroup := router.Group("/monitoring")
	{
		monitoringGroup.POST("/start/:server_id", h.StartMonitoring)
		monitoringGroup.POST("/stop/:server_id", h.StopMonitoring)
		monitoringGroup.GET("/status", h.GetMonitoringStatus)
		monitoringGroup.GET("/alerts", h.GetAlerts)
	}
}

// DiscoverServers performs MCP server discovery
func (h *EnhancedHandler) DiscoverServers(c *gin.Context) {
	var req struct {
		PortRanges    []discovery.PortRange `json:"port_ranges"`
		NetworkRanges []string              `json:"network_ranges"`
		KnownPorts    []int                 `json:"known_ports"`
		Timeout       int                   `json:"timeout_seconds"`
		MaxConcurrent int                   `json:"max_concurrent"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Set defaults
	if req.Timeout == 0 {
		req.Timeout = 10
	}
	if req.MaxConcurrent == 0 {
		req.MaxConcurrent = 50
	}
	if len(req.KnownPorts) == 0 {
		req.KnownPorts = []int{3000, 3001, 3002, 8000, 8080}
	}

	config := discovery.DiscoveryConfig{
		PortRanges:    req.PortRanges,
		NetworkRanges: req.NetworkRanges,
		KnownPorts:    req.KnownPorts,
		Timeout:       time.Duration(req.Timeout) * time.Second,
		MaxConcurrent: req.MaxConcurrent,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Minute)
	defer cancel()

	servers, err := h.discovery.DiscoverServers(ctx, config)
	if err != nil {
		h.logger.Error("Discovery failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Discovery failed"})
		return
	}

	h.logger.Info("Discovery completed", zap.Int("servers_found", len(servers)))

	c.JSON(http.StatusOK, gin.H{
		"servers_found": len(servers),
		"servers":       servers,
	})
}

// GetDiscoveredServers returns all discovered servers
func (h *EnhancedHandler) GetDiscoveredServers(c *gin.Context) {
	servers := h.discovery.GetDiscoveredServers()
	c.JSON(http.StatusOK, gin.H{
		"servers": servers,
	})
}

// RefreshServer refreshes information for a specific server
func (h *EnhancedHandler) RefreshServer(c *gin.Context) {
	serverURL := c.Param("url")
	if serverURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Server URL required"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	server, err := h.discovery.RefreshServer(ctx, serverURL)
	if err != nil {
		h.logger.Error("Failed to refresh server", zap.String("url", serverURL), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refresh server"})
		return
	}

	c.JSON(http.StatusOK, server)
}

// InitializeServer initializes connection to an MCP server
func (h *EnhancedHandler) InitializeServer(c *gin.Context) {
	var req struct {
		URL string `json:"url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	serverInfo, err := h.protocol.Initialize(ctx, req.URL)
	if err != nil {
		h.logger.Error("Failed to initialize server", zap.String("url", req.URL), zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to initialize MCP server"})
		return
	}

	c.JSON(http.StatusOK, serverInfo)
}

// PingServer pings an MCP server
func (h *EnhancedHandler) PingServer(c *gin.Context) {
	var req struct {
		URL string `json:"url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	start := time.Now()
	err := h.protocol.Ping(ctx, req.URL)
	responseTime := time.Since(start)

	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":        "offline",
			"error":         err.Error(),
			"response_time": responseTime.Milliseconds(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "online",
		"response_time": responseTime.Milliseconds(),
	})
}

// GetServerCapabilities returns detailed server capabilities
func (h *EnhancedHandler) GetServerCapabilities(c *gin.Context) {
	serverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	// Get server URL from database
	var serverURL string
	err = h.db.QueryRow("SELECT url FROM mcp_servers WHERE id = $1", serverID).Scan(&serverURL)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	// Initialize and get capabilities
	serverInfo, err := h.protocol.Initialize(ctx, serverURL)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Server unavailable"})
		return
	}

	// Get tools, resources, and prompts
	capabilities := map[string]interface{}{
		"server_info": serverInfo,
	}

	if serverInfo.Capabilities.Tools != nil {
		tools, err := h.protocol.ListTools(ctx, serverURL)
		if err == nil {
			capabilities["tools"] = tools
		}
	}

	if serverInfo.Capabilities.Resources != nil {
		resources, err := h.protocol.ListResources(ctx, serverURL)
		if err == nil {
			capabilities["resources"] = resources
		}
	}

	if serverInfo.Capabilities.Prompts != nil {
		prompts, err := h.protocol.ListPrompts(ctx, serverURL)
		if err == nil {
			capabilities["prompts"] = prompts
		}
	}

	c.JSON(http.StatusOK, capabilities)
}

// DiscoverTools discovers tools from a server
func (h *EnhancedHandler) DiscoverTools(c *gin.Context) {
	serverID, err := uuid.Parse(c.Param("server_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	// Get server URL
	var serverURL string
	err = h.db.QueryRow("SELECT url FROM mcp_servers WHERE id = $1", serverID).Scan(&serverURL)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()

	tools, err := h.toolManager.DiscoverTools(ctx, serverID, serverURL)
	if err != nil {
		h.logger.Error("Failed to discover tools", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to discover tools"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tools_discovered": len(tools),
		"tools":           tools,
	})
}

// ListTools lists all managed tools
func (h *EnhancedHandler) ListTools(c *gin.Context) {
	var serverID *uuid.UUID
	if serverIDStr := c.Query("server_id"); serverIDStr != "" {
		if id, err := uuid.Parse(serverIDStr); err == nil {
			serverID = &id
		}
	}

	category := c.Query("category")
	riskLevel := c.Query("risk_level")
	
	var enabled *bool
	if enabledStr := c.Query("enabled"); enabledStr != "" {
		if e, err := strconv.ParseBool(enabledStr); err == nil {
			enabled = &e
		}
	}

	tools, err := h.toolManager.ListTools(serverID, category, riskLevel, enabled)
	if err != nil {
		h.logger.Error("Failed to list tools", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list tools"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tools": tools,
	})
}

// GetTool gets a specific tool
func (h *EnhancedHandler) GetTool(c *gin.Context) {
	toolID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tool ID"})
		return
	}

	tool, err := h.toolManager.GetTool(toolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tool not found"})
		return
	}

	c.JSON(http.StatusOK, tool)
}

// ExecuteTool executes a tool
func (h *EnhancedHandler) ExecuteTool(c *gin.Context) {
	toolID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tool ID"})
		return
	}

	var req struct {
		Arguments map[string]interface{} `json:"arguments"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()

	// TODO: Get user ID from authentication context
	var userID *uuid.UUID

	execution, err := h.toolManager.ExecuteTool(ctx, toolID, req.Arguments, userID)
	if err != nil {
		h.logger.Error("Tool execution failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, execution)
}

// GetToolStats gets tool usage statistics
func (h *EnhancedHandler) GetToolStats(c *gin.Context) {
	toolID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tool ID"})
		return
	}

	stats, err := h.toolManager.GetToolUsageStats(toolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tool not found"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// ListResources lists resources from a server
func (h *EnhancedHandler) ListResources(c *gin.Context) {
	serverID, err := uuid.Parse(c.Param("server_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	// Get server URL
	var serverURL string
	err = h.db.QueryRow("SELECT url FROM mcp_servers WHERE id = $1", serverID).Scan(&serverURL)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	resources, err := h.protocol.ListResources(ctx, serverURL)
	if err != nil {
		h.logger.Error("Failed to list resources", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list resources"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"resources": resources,
	})
}

// ReadResource reads a resource from a server
func (h *EnhancedHandler) ReadResource(c *gin.Context) {
	var req struct {
		ServerID    uuid.UUID `json:"server_id" binding:"required"`
		ResourceURI string    `json:"resource_uri" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Get server URL
	var serverURL string
	err := h.db.QueryRow("SELECT url FROM mcp_servers WHERE id = $1", req.ServerID).Scan(&serverURL)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	result, err := h.protocol.ReadResource(ctx, serverURL, req.ResourceURI)
	if err != nil {
		h.logger.Error("Failed to read resource", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read resource"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"resource": result,
	})
}

// StartMonitoring starts monitoring a server
func (h *EnhancedHandler) StartMonitoring(c *gin.Context) {
	serverID, err := uuid.Parse(c.Param("server_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	var req struct {
		IntervalSeconds int `json:"interval_seconds"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.IntervalSeconds == 0 {
		req.IntervalSeconds = 30 // Default to 30 seconds
	}

	// Get server details
	var serverURL, serverName string
	err = h.db.QueryRow("SELECT url, name FROM mcp_servers WHERE id = $1", serverID).Scan(&serverURL, &serverName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	interval := time.Duration(req.IntervalSeconds) * time.Second
	err = h.monitor.StartMonitoring(serverID, serverURL, serverName, interval)
	if err != nil {
		h.logger.Error("Failed to start monitoring", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start monitoring"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Monitoring started",
		"interval": req.IntervalSeconds,
	})
}

// StopMonitoring stops monitoring a server
func (h *EnhancedHandler) StopMonitoring(c *gin.Context) {
	serverID, err := uuid.Parse(c.Param("server_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	// Get server URL
	var serverURL string
	err = h.db.QueryRow("SELECT url FROM mcp_servers WHERE id = $1", serverID).Scan(&serverURL)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	h.monitor.StopMonitoring(serverURL)

	c.JSON(http.StatusOK, gin.H{
		"message": "Monitoring stopped",
	})
}

// GetMonitoringStatus gets monitoring status for all servers
func (h *EnhancedHandler) GetMonitoringStatus(c *gin.Context) {
	statuses := h.monitor.GetAllStatuses()
	c.JSON(http.StatusOK, gin.H{
		"statuses": statuses,
	})
}

// GetAlerts gets recent monitoring alerts
func (h *EnhancedHandler) GetAlerts(c *gin.Context) {
	limit := 50
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	alerts, err := h.monitor.GetRecentAlerts(limit)
	if err != nil {
		h.logger.Error("Failed to get alerts", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get alerts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"alerts": alerts,
	})
}