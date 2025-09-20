package monitoring

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/radhi1991/aran-mcp-sentinel/internal/database"
	"go.uber.org/zap"
)

// Handler handles monitoring-related HTTP requests
type Handler struct {
	healthChecker *HealthChecker
	repo          *database.Repository
	logger        *zap.Logger
}

// NewHandler creates a new monitoring handler
func NewHandler(repo *database.Repository, logger *zap.Logger) *Handler {
	healthChecker := NewHealthChecker(repo, logger)
	return &Handler{
		healthChecker: healthChecker,
		repo:          repo,
		logger:        logger,
	}
}

// RegisterRoutes registers monitoring routes
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	monitoring := rg.Group("/monitoring")
	{
		monitoring.GET("/health/:server_id", h.CheckServerHealth)
		monitoring.POST("/health/check-all", h.CheckAllServers)
		monitoring.GET("/servers", h.ListServers)
		monitoring.GET("/alerts", h.ListAlerts)
		monitoring.POST("/alerts/:id/resolve", h.ResolveAlert)
	}
}

// CheckServerHealth checks the health of a specific server
func (h *Handler) CheckServerHealth(c *gin.Context) {
	serverID := c.Param("server_id")
	if serverID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Server ID is required"})
		return
	}

	status, err := h.healthChecker.CheckServerHealth(c.Request.Context(), serverID)
	if err != nil {
		h.logger.Error("Failed to check server health", 
			zap.String("server_id", serverID),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check server health"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    status,
	})
}

// CheckAllServers checks the health of all servers
func (h *Handler) CheckAllServers(c *gin.Context) {
	err := h.healthChecker.CheckAllServers(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to check all servers", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check all servers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Health check completed for all servers",
	})
}

// ListServers lists all MCP servers with their current status
func (h *Handler) ListServers(c *gin.Context) {
	// Get organization ID from context (set by auth middleware)
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization ID not found"})
		return
	}

	// Parse pagination parameters
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	orgUUID, err := uuid.Parse(orgID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	servers, err := h.repo.ListMCPServers(c.Request.Context(), orgUUID, limit, offset)
	if err != nil {
		h.logger.Error("Failed to list servers", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list servers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    servers,
		"pagination": gin.H{
			"limit":  limit,
			"offset": offset,
			"count":  len(servers),
		},
	})
}

// ListAlerts lists alerts for the organization
func (h *Handler) ListAlerts(c *gin.Context) {
	// Get organization ID from context
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization ID not found"})
		return
	}

	// Parse pagination parameters
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	orgUUID, err := uuid.Parse(orgID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	alerts, err := h.repo.ListAlerts(c.Request.Context(), orgUUID, limit, offset)
	if err != nil {
		h.logger.Error("Failed to list alerts", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list alerts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    alerts,
		"pagination": gin.H{
			"limit":  limit,
			"offset": offset,
			"count":  len(alerts),
		},
	})
}

// ResolveAlert resolves an alert
func (h *Handler) ResolveAlert(c *gin.Context) {
	alertID := c.Param("id")
	if alertID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Alert ID is required"})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	err := h.repo.ResolveAlert(c.Request.Context(), alertID, userID.(string))
	if err != nil {
		h.logger.Error("Failed to resolve alert", 
			zap.String("alert_id", alertID),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve alert"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Alert resolved successfully",
	})
}
