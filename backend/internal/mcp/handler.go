package mcp

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/radhi1991/aran-mcp-sentinel/internal/models"
	"github.com/radhi1991/aran-mcp-sentinel/internal/repository"
	"go.uber.org/zap"
)

type Handler struct {
	logger *zap.Logger
	repo   *repository.MCPServerRepository
}

func NewHandler(logger *zap.Logger, repo *repository.MCPServerRepository) *Handler {
	return &Handler{
		logger: logger,
		repo:   repo,
	}
}

// RegisterRoutes registers all MCP API routes
func (h *Handler) RegisterRoutes(router *gin.RouterGroup) {
	// Server management endpoints
	serverGroup := router.Group("/servers")
	{
		serverGroup.GET("", h.ListServers)
		serverGroup.GET("/:id", h.GetServer)
		serverGroup.POST("", h.CreateServer)
		serverGroup.PUT("/:id", h.UpdateServer)
		serverGroup.DELETE("/:id", h.DeleteServer)
		serverGroup.GET("/:id/status", h.GetServerStatus)
	}

	// Test execution endpoints
	testGroup := router.Group("/tests")
	{
		testGroup.POST("", h.runTest)
		testGroup.GET("/:id", h.getTestResult)
	}

	// Server presets endpoints
	presetGroup := router.Group("/presets")
	{
		presetGroup.GET("", h.ListPresets)
		presetGroup.GET("/:id", h.GetPreset)
		presetGroup.GET("/category/:category", h.GetPresetsByCategory)
	}
}

// ListServers returns a list of all MCP servers
func (h *Handler) ListServers(c *gin.Context) {
	servers, err := h.repo.ListActiveServers(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to list servers", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve servers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"servers": servers,
	})
}

// GetServer returns a specific MCP server by ID
func (h *Handler) GetServer(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	server, err := h.repo.GetServer(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get server", zap.Error(err), zap.String("server_id", id.String()))
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	c.JSON(http.StatusOK, server)
}

// CreateServer adds a new MCP server
func (h *Handler) CreateServer(c *gin.Context) {
	var server models.MCPServer
	if err := c.ShouldBindJSON(&server); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.repo.CreateServer(c.Request.Context(), &server); err != nil {
		h.logger.Error("Failed to create server", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create server"})
		return
	}

	c.JSON(http.StatusCreated, server)
}

// GetServerStatus returns the status of an MCP server
func (h *Handler) GetServerStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	status, err := h.repo.GetServerStatus(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get server status",
			zap.Error(err),
			zap.String("server_id", id.String()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get server status"})
		return
	}

	c.JSON(http.StatusOK, status)
}

// runTest executes a test against an MCP server
func (h *Handler) runTest(c *gin.Context) {
	// TODO: Implement MCP test execution
	c.JSON(http.StatusNotImplemented, gin.H{"message": "Not implemented"})
}

// getTestResult retrieves the result of a previously executed test
func (h *Handler) getTestResult(c *gin.Context) {
	// TODO: Implement getting test results
	c.JSON(http.StatusNotImplemented, gin.H{"message": "Not implemented"})
}

// UpdateServer updates an existing MCP server
func (h *Handler) UpdateServer(c *gin.Context) {
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
		Metadata     map[string]interface{} `json:"metadata"`
	}

	if err := c.ShouldBindJSON(&updateReq); err != nil {
		h.logger.Error("Failed to bind update request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Update server in database
	server := &models.MCPServer{
		ID:           id,
		Name:         updateReq.Name,
		URL:          updateReq.URL,
		Description:  updateReq.Description,
		Type:         updateReq.Type,
		Capabilities: updateReq.Capabilities,
		Metadata:     updateReq.Metadata,
	}

	if err := h.repo.UpdateServer(c.Request.Context(), server); err != nil {
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

// DeleteServer deletes an MCP server
func (h *Handler) DeleteServer(c *gin.Context) {
	serverID := c.Param("id")

	// Parse server ID
	id, err := uuid.Parse(serverID)
	if err != nil {
		h.logger.Error("Invalid server ID", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	// Check if server exists
	server, err := h.repo.GetServerByID(id)
	if err != nil {
		h.logger.Error("Failed to get server", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	// Delete server from database
	if err := h.repo.DeleteServer(c.Request.Context(), id); err != nil {
		h.logger.Error("Failed to delete server", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete server"})
		return
	}

	h.logger.Info("Server deleted successfully",
		zap.String("server_id", serverID),
		zap.String("server_name", server.Name))

	c.JSON(http.StatusOK, gin.H{
		"message": "Server deleted successfully",
		"server": gin.H{
			"id":   server.ID,
			"name": server.Name,
		},
	})
}
