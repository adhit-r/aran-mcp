package registry

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/radhi1991/aran-mcp-sentinel/internal/models"
	"github.com/radhi1991/aran-mcp-sentinel/internal/repository"
	"go.uber.org/zap"
)

// RegistryHandler provides registry API endpoints
type RegistryHandler struct {
	logger   *zap.Logger
	registry *ServerRegistry
}

// NewRegistryHandler creates a new registry handler
func NewRegistryHandler(logger *zap.Logger, repo *repository.MCPServerRepository) *RegistryHandler {
	registry := NewServerRegistry(logger, repo)
	return &RegistryHandler{
		logger:   logger,
		registry: registry,
	}
}

// RegisterRoutes registers all registry API routes
func (h *RegistryHandler) RegisterRoutes(router *gin.RouterGroup) {
	registryGroup := router.Group("/registry")
	{
		// Server management
		registryGroup.POST("/servers", h.RegisterServer)
		registryGroup.GET("/servers", h.SearchServers)
		registryGroup.GET("/servers/:id", h.GetServer)
		registryGroup.PUT("/servers/:id", h.UpdateServer)
		registryGroup.DELETE("/servers/:id", h.UnregisterServer)

		// Registry information
		registryGroup.GET("/stats", h.GetRegistryStats)
		registryGroup.GET("/capabilities", h.GetCapabilities)
		registryGroup.GET("/types", h.GetServerTypes)

		// Filtered searches
		registryGroup.GET("/servers/type/:type", h.GetServersByType)
		registryGroup.GET("/servers/organization/:org_id", h.GetServersByOrganization)
		registryGroup.GET("/servers/capability/:capability", h.GetServersByCapability)

		// Health updates
		registryGroup.PUT("/servers/:id/health", h.UpdateServerHealth)
	}
}

// RegisterServerRequest represents the request to register a server
type RegisterServerRequest struct {
	Name           string                 `json:"name" binding:"required"`
	URL            string                 `json:"url" binding:"required"`
	Description    string                 `json:"description"`
	Type           string                 `json:"type" binding:"required"`
	Capabilities   []string               `json:"capabilities"`
	Tags           []string               `json:"tags"`
	OrganizationID string                 `json:"organization_id" binding:"required"`
	Metadata       map[string]interface{} `json:"metadata"`
}

// RegisterServer registers a new server in the registry
func (h *RegistryHandler) RegisterServer(c *gin.Context) {
	var req RegisterServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid register server request", zap.Error(err))
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

	// Create server model
	server := &models.MCPServer{
		ID:             uuid.New(),
		OrganizationID: orgID,
		Name:           req.Name,
		URL:            req.URL,
		Description:    req.Description,
		Type:           req.Type,
		Status:         "unknown",
		Capabilities:   req.Capabilities,
		Metadata:       req.Metadata,
	}

	// Add tags to metadata
	if len(req.Tags) > 0 {
		if server.Metadata == nil {
			server.Metadata = make(map[string]interface{})
		}
		server.Metadata["tags"] = req.Tags
	}

	// Register server
	if err := h.registry.RegisterServer(c.Request.Context(), server); err != nil {
		h.logger.Error("Failed to register server", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register server"})
		return
	}

	h.logger.Info("Server registered successfully",
		zap.String("server_id", server.ID.String()),
		zap.String("server_name", server.Name))

	c.JSON(http.StatusCreated, gin.H{
		"message": "Server registered successfully",
		"server": gin.H{
			"id":   server.ID,
			"name": server.Name,
			"url":  server.URL,
		},
	})
}

// SearchServers searches for servers in the registry
func (h *RegistryHandler) SearchServers(c *gin.Context) {
	// Parse query parameters
	options := RegistrySearchOptions{
		Query:          c.Query("query"),
		Type:           c.Query("type"),
		Status:         c.Query("status"),
		OrganizationID: c.Query("organization_id"),
		SortBy:         c.Query("sort_by"),
		SortOrder:      c.Query("sort_order"),
	}

	// Parse limit and offset
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			options.Limit = limit
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			options.Offset = offset
		}
	}

	// Parse capabilities
	if capabilitiesStr := c.Query("capabilities"); capabilitiesStr != "" {
		// Split by comma
		capabilities := []string{}
		for _, cap := range splitString(capabilitiesStr, ",") {
			if cap != "" {
				capabilities = append(capabilities, cap)
			}
		}
		options.Capabilities = capabilities
	}

	// Parse tags
	if tagsStr := c.Query("tags"); tagsStr != "" {
		// Split by comma
		tags := []string{}
		for _, tag := range splitString(tagsStr, ",") {
			if tag != "" {
				tags = append(tags, tag)
			}
		}
		options.Tags = tags
	}

	// Parse minimum health score
	if healthScoreStr := c.Query("min_health_score"); healthScoreStr != "" {
		if healthScore, err := strconv.Atoi(healthScoreStr); err == nil {
			options.MinHealthScore = healthScore
		}
	}

	// Search servers
	servers, err := h.registry.SearchServers(c.Request.Context(), options)
	if err != nil {
		h.logger.Error("Failed to search servers", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search servers"})
		return
	}

	h.logger.Info("Server search completed", zap.Int("count", len(servers)))
	c.JSON(http.StatusOK, gin.H{
		"servers": servers,
		"count":   len(servers),
		"options": options,
	})
}

// GetServer retrieves a specific server from the registry
func (h *RegistryHandler) GetServer(c *gin.Context) {
	serverID := c.Param("id")

	// Parse server ID
	id, err := uuid.Parse(serverID)
	if err != nil {
		h.logger.Error("Invalid server ID", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	// Get server
	server, err := h.registry.GetServer(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get server", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"server": server,
	})
}

// UpdateServer updates a server in the registry
func (h *RegistryHandler) UpdateServer(c *gin.Context) {
	serverID := c.Param("id")

	// Parse server ID
	id, err := uuid.Parse(serverID)
	if err != nil {
		h.logger.Error("Invalid server ID", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	// Parse request body
	var updateReq struct {
		Name         string                 `json:"name"`
		URL          string                 `json:"url"`
		Description  string                 `json:"description"`
		Type         string                 `json:"type"`
		Capabilities []string               `json:"capabilities"`
		Tags         []string               `json:"tags"`
		Metadata     map[string]interface{} `json:"metadata"`
	}

	if err := c.ShouldBindJSON(&updateReq); err != nil {
		h.logger.Error("Failed to bind update request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Get existing server
	existingServer, err := h.registry.GetServer(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get existing server", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	// Update server model
	server := &models.MCPServer{
		ID:             id,
		OrganizationID: existingServer.OrganizationID,
		Name:           updateReq.Name,
		URL:            updateReq.URL,
		Description:    updateReq.Description,
		Type:           updateReq.Type,
		Capabilities:   updateReq.Capabilities,
		Metadata:       updateReq.Metadata,
	}

	// Add tags to metadata
	if len(updateReq.Tags) > 0 {
		if server.Metadata == nil {
			server.Metadata = make(map[string]interface{})
		}
		server.Metadata["tags"] = updateReq.Tags
	}

	// Update server
	if err := h.registry.RegisterServer(c.Request.Context(), server); err != nil {
		h.logger.Error("Failed to update server", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update server"})
		return
	}

	h.logger.Info("Server updated successfully", zap.String("server_id", serverID))
	c.JSON(http.StatusOK, gin.H{
		"message": "Server updated successfully",
		"server":  server,
	})
}

// UnregisterServer removes a server from the registry
func (h *RegistryHandler) UnregisterServer(c *gin.Context) {
	serverID := c.Param("id")

	// Parse server ID
	id, err := uuid.Parse(serverID)
	if err != nil {
		h.logger.Error("Invalid server ID", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	// Unregister server
	if err := h.registry.UnregisterServer(c.Request.Context(), id); err != nil {
		h.logger.Error("Failed to unregister server", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unregister server"})
		return
	}

	h.logger.Info("Server unregistered successfully", zap.String("server_id", serverID))
	c.JSON(http.StatusOK, gin.H{
		"message":   "Server unregistered successfully",
		"server_id": serverID,
	})
}

// GetRegistryStats returns registry statistics
func (h *RegistryHandler) GetRegistryStats(c *gin.Context) {
	stats, err := h.registry.GetRegistryStats(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get registry stats", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get registry stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetCapabilities returns all unique capabilities in the registry
func (h *RegistryHandler) GetCapabilities(c *gin.Context) {
	capabilities, err := h.registry.GetServerCapabilities(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get capabilities", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get capabilities"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"capabilities": capabilities,
		"count":        len(capabilities),
	})
}

// GetServerTypes returns all unique server types in the registry
func (h *RegistryHandler) GetServerTypes(c *gin.Context) {
	types, err := h.registry.GetServerTypes(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get server types", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get server types"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"types": types,
		"count": len(types),
	})
}

// GetServersByType returns servers filtered by type
func (h *RegistryHandler) GetServersByType(c *gin.Context) {
	serverType := c.Param("type")

	servers, err := h.registry.GetServersByType(c.Request.Context(), serverType)
	if err != nil {
		h.logger.Error("Failed to get servers by type", zap.String("type", serverType), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get servers by type"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"servers": servers,
		"count":   len(servers),
		"type":    serverType,
	})
}

// GetServersByOrganization returns servers for a specific organization
func (h *RegistryHandler) GetServersByOrganization(c *gin.Context) {
	orgIDStr := c.Param("org_id")

	// Parse organization ID
	orgID, err := uuid.Parse(orgIDStr)
	if err != nil {
		h.logger.Error("Invalid organization ID", zap.String("org_id", orgIDStr), zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	servers, err := h.registry.GetServersByOrganization(c.Request.Context(), orgID)
	if err != nil {
		h.logger.Error("Failed to get servers by organization", zap.String("org_id", orgIDStr), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get servers by organization"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"servers":         servers,
		"count":           len(servers),
		"organization_id": orgIDStr,
	})
}

// GetServersByCapability returns servers that have a specific capability
func (h *RegistryHandler) GetServersByCapability(c *gin.Context) {
	capability := c.Param("capability")

	servers, err := h.registry.GetServersByCapability(c.Request.Context(), capability)
	if err != nil {
		h.logger.Error("Failed to get servers by capability", zap.String("capability", capability), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get servers by capability"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"servers":    servers,
		"count":      len(servers),
		"capability": capability,
	})
}

// UpdateServerHealthRequest represents the request to update server health
type UpdateServerHealthRequest struct {
	Status       string                 `json:"status"`
	ResponseTime int64                  `json:"response_time_ms"`
	Uptime       float64                `json:"uptime_percentage"`
	LastChecked  string                 `json:"last_checked"`
	HealthData   map[string]interface{} `json:"health_data"`
}

// UpdateServerHealth updates server health information
func (h *RegistryHandler) UpdateServerHealth(c *gin.Context) {
	serverID := c.Param("id")

	// Parse server ID
	id, err := uuid.Parse(serverID)
	if err != nil {
		h.logger.Error("Invalid server ID", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	// Parse request body
	var req UpdateServerHealthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind health update request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Prepare health data
	healthData := make(map[string]interface{})
	if req.Status != "" {
		healthData["status"] = req.Status
	}
	if req.ResponseTime > 0 {
		healthData["response_time"] = req.ResponseTime
	}
	if req.Uptime > 0 {
		healthData["uptime"] = req.Uptime
	}
	if req.LastChecked != "" {
		// Parse last checked time
		if lastChecked, err := parseTime(req.LastChecked); err == nil {
			healthData["last_checked"] = lastChecked
		}
	}

	// Add custom health data
	for key, value := range req.HealthData {
		healthData[key] = value
	}

	// Update server health
	if err := h.registry.UpdateServerHealth(c.Request.Context(), id, healthData); err != nil {
		h.logger.Error("Failed to update server health", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update server health"})
		return
	}

	h.logger.Info("Server health updated successfully", zap.String("server_id", serverID))
	c.JSON(http.StatusOK, gin.H{
		"message":   "Server health updated successfully",
		"server_id": serverID,
	})
}

// Helper functions

// splitString splits a string by delimiter
func splitString(s, delimiter string) []string {
	var result []string
	start := 0
	for i := 0; i < len(s); i++ {
		if i+len(delimiter) <= len(s) && s[i:i+len(delimiter)] == delimiter {
			result = append(result, s[start:i])
			start = i + len(delimiter)
			i += len(delimiter) - 1
		}
	}
	result = append(result, s[start:])
	return result
}

// parseTime parses a time string
func parseTime(timeStr string) (interface{}, error) {
	// Try different time formats
	formats := []string{
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05.000Z",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, timeStr); err == nil {
			return t, nil
		}
	}

	return nil, fmt.Errorf("unable to parse time: %s", timeStr)
}
