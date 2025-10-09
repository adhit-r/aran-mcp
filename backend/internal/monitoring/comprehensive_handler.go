package monitoring

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// ComprehensiveHealthHandler provides comprehensive health monitoring endpoints
type ComprehensiveHealthHandler struct {
	logger          *zap.Logger
	healthChecker   *HealthChecker
	enhancedMonitor *EnhancedHealthMonitor
}

// NewComprehensiveHealthHandler creates a new comprehensive health handler
func NewComprehensiveHealthHandler(logger *zap.Logger, healthChecker *HealthChecker) *ComprehensiveHealthHandler {
	enhancedMonitor := NewEnhancedHealthMonitor(logger)
	return &ComprehensiveHealthHandler{
		logger:          logger,
		healthChecker:   healthChecker,
		enhancedMonitor: enhancedMonitor,
	}
}

// RegisterComprehensiveRoutes registers comprehensive health monitoring routes
func (h *ComprehensiveHealthHandler) RegisterComprehensiveRoutes(router *gin.RouterGroup) {
	healthGroup := router.Group("/health")
	{
		healthGroup.GET("/comprehensive/:server_id", h.GetComprehensiveHealth)
		healthGroup.POST("/comprehensive/:server_id", h.PerformComprehensiveCheck)
		healthGroup.GET("/metrics/:server_id", h.GetHealthMetrics)
		healthGroup.GET("/alerts", h.GetHealthAlerts)
		healthGroup.POST("/alerts/:alert_id/resolve", h.ResolveHealthAlert)
		healthGroup.GET("/dashboard", h.GetHealthDashboard)
		healthGroup.GET("/trends/:server_id", h.GetHealthTrends)
	}
}

// GetComprehensiveHealth returns comprehensive health information for a server
func (h *ComprehensiveHealthHandler) GetComprehensiveHealth(c *gin.Context) {
	serverID := c.Param("server_id")

	// Parse server ID
	id, err := uuid.Parse(serverID)
	if err != nil {
		h.logger.Error("Invalid server ID", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	// Get server details
	server, err := h.healthChecker.repo.GetMCPServer(c.Request.Context(), id.String())
	if err != nil {
		h.logger.Error("Failed to get server", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	// Perform comprehensive health check
	metrics, err := h.enhancedMonitor.PerformComprehensiveHealthCheck(
		c.Request.Context(),
		server.URL,
		serverID,
	)
	if err != nil {
		h.logger.Error("Failed to perform comprehensive health check",
			zap.String("server_id", serverID),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Health check failed"})
		return
	}

	h.logger.Info("Comprehensive health check completed",
		zap.String("server_id", serverID),
		zap.Int("health_score", metrics.HealthScore))

	c.JSON(http.StatusOK, gin.H{
		"server": gin.H{
			"id":   server.ID,
			"name": server.Name,
			"url":  server.URL,
		},
		"health": metrics,
	})
}

// PerformComprehensiveCheck performs a comprehensive health check
func (h *ComprehensiveHealthHandler) PerformComprehensiveCheck(c *gin.Context) {
	serverID := c.Param("server_id")

	// Parse server ID
	id, err := uuid.Parse(serverID)
	if err != nil {
		h.logger.Error("Invalid server ID", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	// Get server details
	server, err := h.healthChecker.repo.GetMCPServer(c.Request.Context(), id.String())
	if err != nil {
		h.logger.Error("Failed to get server", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	// Perform comprehensive health check
	metrics, err := h.enhancedMonitor.PerformComprehensiveHealthCheck(
		c.Request.Context(),
		server.URL,
		serverID,
	)
	if err != nil {
		h.logger.Error("Failed to perform comprehensive health check",
			zap.String("server_id", serverID),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Health check failed"})
		return
	}

	// Save health metrics to database (you'd implement this)
	// h.saveHealthMetrics(metrics)

	h.logger.Info("Comprehensive health check performed",
		zap.String("server_id", serverID),
		zap.Int("health_score", metrics.HealthScore))

	c.JSON(http.StatusOK, gin.H{
		"message": "Comprehensive health check completed",
		"health":  metrics,
	})
}

// GetHealthMetrics returns health metrics for a server
func (h *ComprehensiveHealthHandler) GetHealthMetrics(c *gin.Context) {
	serverID := c.Param("server_id")

	// Parse server ID
	id, err := uuid.Parse(serverID)
	if err != nil {
		h.logger.Error("Invalid server ID", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	// Get server details
	server, err := h.healthChecker.repo.GetMCPServer(c.Request.Context(), id.String())
	if err != nil {
		h.logger.Error("Failed to get server", zap.String("server_id", serverID), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	// Perform health check
	metrics, err := h.enhancedMonitor.PerformComprehensiveHealthCheck(
		c.Request.Context(),
		server.URL,
		serverID,
	)
	if err != nil {
		h.logger.Error("Failed to get health metrics",
			zap.String("server_id", serverID),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get health metrics"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"server_id": serverID,
		"metrics":   metrics,
	})
}

// GetHealthAlerts returns health alerts
func (h *ComprehensiveHealthHandler) GetHealthAlerts(c *gin.Context) {
	// Parse query parameters
	severity := c.Query("severity")
	resolved := c.Query("resolved")

	// In production, you'd query the database for alerts
	// For now, return mock data
	alerts := []HealthAlert{
		{
			Type:      "performance",
			Severity:  "high",
			Message:   "High response time detected",
			Timestamp: time.Now().Add(-1 * time.Hour),
			Resolved:  false,
		},
		{
			Type:      "availability",
			Severity:  "critical",
			Message:   "Server unreachable",
			Timestamp: time.Now().Add(-2 * time.Hour),
			Resolved:  true,
		},
	}

	// Filter by severity if specified
	if severity != "" {
		var filtered []HealthAlert
		for _, alert := range alerts {
			if alert.Severity == severity {
				filtered = append(filtered, alert)
			}
		}
		alerts = filtered
	}

	// Filter by resolved status if specified
	if resolved != "" {
		resolvedBool, err := strconv.ParseBool(resolved)
		if err == nil {
			var filtered []HealthAlert
			for _, alert := range alerts {
				if alert.Resolved == resolvedBool {
					filtered = append(filtered, alert)
				}
			}
			alerts = filtered
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"alerts": alerts,
		"count":  len(alerts),
	})
}

// ResolveHealthAlert resolves a health alert
func (h *ComprehensiveHealthHandler) ResolveHealthAlert(c *gin.Context) {
	alertID := c.Param("alert_id")

	// In production, you'd update the alert in the database
	h.logger.Info("Health alert resolved", zap.String("alert_id", alertID))

	c.JSON(http.StatusOK, gin.H{
		"message":  "Health alert resolved",
		"alert_id": alertID,
	})
}

// GetHealthDashboard returns health dashboard data
func (h *ComprehensiveHealthHandler) GetHealthDashboard(c *gin.Context) {
	// In production, you'd aggregate health data from all servers
	dashboard := gin.H{
		"overview": gin.H{
			"total_servers":   10,
			"online_servers":  8,
			"offline_servers": 2,
			"average_health":  85,
		},
		"recent_alerts": []gin.H{
			{
				"type":      "performance",
				"severity":  "high",
				"message":   "High response time on server-1",
				"timestamp": time.Now().Add(-30 * time.Minute),
			},
			{
				"type":      "availability",
				"severity":  "critical",
				"message":   "Server-2 is unreachable",
				"timestamp": time.Now().Add(-1 * time.Hour),
			},
		},
		"health_trends": gin.H{
			"response_time": []int{120, 135, 110, 145, 130},
			"uptime":        []float64{99.9, 99.8, 99.9, 99.7, 99.9},
		},
	}

	c.JSON(http.StatusOK, dashboard)
}

// GetHealthTrends returns health trends for a server
func (h *ComprehensiveHealthHandler) GetHealthTrends(c *gin.Context) {
	serverID := c.Param("server_id")
	days := c.DefaultQuery("days", "7")

	// Parse days parameter
	daysInt, err := strconv.Atoi(days)
	if err != nil {
		daysInt = 7
	}

	// In production, you'd query historical health data
	trends := gin.H{
		"server_id":     serverID,
		"period_days":   daysInt,
		"response_time": []int{120, 135, 110, 145, 130, 125, 140},
		"uptime":        []float64{99.9, 99.8, 99.9, 99.7, 99.9, 99.8, 99.9},
		"health_score":  []int{85, 82, 88, 75, 90, 87, 83},
		"alerts_count":  []int{2, 1, 0, 3, 1, 2, 1},
	}

	c.JSON(http.StatusOK, trends)
}

