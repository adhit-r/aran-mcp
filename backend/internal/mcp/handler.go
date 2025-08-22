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
	logger    *zap.Logger
	repo      *repository.MCPServerRepository
}

func NewHandler(logger *zap.Logger, repo *repository.MCPServerRepository) *Handler {
	return &Handler{
		logger: logger,
		repo:   repo,
	}
}

// RegisterRoutes registers all MCP API routes
func (h *Handler) RegisterRoutes(router *gin.RouterGroup) {
	mcpGroup := router.Group("/mcp")
	{
		// Server management endpoints
		serverGroup := mcpGroup.Group("/servers")
		{
			serverGroup.GET("", h.ListServers)
			serverGroup.GET("/:id", h.GetServer)
			serverGroup.POST("", h.CreateServer)
			serverGroup.GET("/:id/status", h.GetServerStatus)
		}

		// Test execution endpoints
		testGroup := mcpGroup.Group("/tests")
		{
			testGroup.POST("", h.runTest)
			testGroup.GET("/:id", h.getTestResult)
		}
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
