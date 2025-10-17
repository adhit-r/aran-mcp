package monitoring

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// HealthStatus represents the health status of a service component
type HealthStatus struct {
	Status    string            `json:"status"`
	Timestamp time.Time         `json:"timestamp"`
	Duration  string            `json:"duration"`
	Details   map[string]string `json:"details,omitempty"`
}

// HealthResponse represents the overall health response
type HealthResponse struct {
	Status     string                   `json:"status"`
	Timestamp  time.Time                `json:"timestamp"`
	Version    string                   `json:"version"`
	Uptime     string                   `json:"uptime"`
	Components map[string]HealthStatus  `json:"components"`
}

// HealthChecker provides health checking functionality
type HealthChecker struct {
	db        *sql.DB
	logger    *zap.Logger
	startTime time.Time
}

// NewHealthChecker creates a new health checker
func NewHealthChecker(db *sql.DB, logger *zap.Logger) *HealthChecker {
	return &HealthChecker{
		db:        db,
		logger:    logger,
		startTime: time.Now(),
	}
}

// CheckHealth performs comprehensive health checks
func (h *HealthChecker) CheckHealth(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	response := HealthResponse{
		Timestamp:  time.Now(),
		Version:    "1.0.0", // TODO: Get from build info
		Uptime:     time.Since(h.startTime).String(),
		Components: make(map[string]HealthStatus),
	}

	// Check database
	dbStatus := h.checkDatabase(ctx)
	response.Components["database"] = dbStatus

	// Check external services
	mcpStatus := h.checkMCPConnectivity(ctx)
	response.Components["mcp_connectivity"] = mcpStatus

	// Check memory usage
	memStatus := h.checkMemoryUsage(ctx)
	response.Components["memory"] = memStatus

	// Determine overall status
	response.Status = h.determineOverallStatus(response.Components)

	// Set HTTP status code based on health
	statusCode := http.StatusOK
	if response.Status != "healthy" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, response)
}

// checkDatabase checks database connectivity and performance
func (h *HealthChecker) checkDatabase(ctx context.Context) HealthStatus {
	start := time.Now()
	
	status := HealthStatus{
		Timestamp: time.Now(),
		Details:   make(map[string]string),
	}

	// Test database connection
	err := h.db.PingContext(ctx)
	if err != nil {
		status.Status = "unhealthy"
		status.Details["error"] = err.Error()
		status.Duration = time.Since(start).String()
		return status
	}

	// Test a simple query
	var count int
	err = h.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM organizations").Scan(&count)
	if err != nil {
		status.Status = "degraded"
		status.Details["error"] = "Query failed: " + err.Error()
	} else {
		status.Status = "healthy"
		status.Details["organizations_count"] = string(rune(count))
	}

	status.Duration = time.Since(start).String()
	return status
}

// checkMCPConnectivity checks if we can reach MCP servers
func (h *HealthChecker) checkMCPConnectivity(ctx context.Context) HealthStatus {
	start := time.Now()
	
	status := HealthStatus{
		Timestamp: time.Now(),
		Details:   make(map[string]string),
	}

	// Try to connect to local MCP server
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequestWithContext(ctx, "GET", "http://localhost:3001", nil)
	if err != nil {
		status.Status = "degraded"
		status.Details["error"] = "Failed to create request: " + err.Error()
		status.Duration = time.Since(start).String()
		return status
	}

	resp, err := client.Do(req)
	if err != nil {
		status.Status = "degraded"
		status.Details["error"] = "MCP server unreachable: " + err.Error()
	} else {
		resp.Body.Close()
		status.Status = "healthy"
		status.Details["mcp_server_status"] = resp.Status
	}

	status.Duration = time.Since(start).String()
	return status
}

// checkMemoryUsage checks system memory usage
func (h *HealthChecker) checkMemoryUsage(ctx context.Context) HealthStatus {
	start := time.Now()
	
	status := HealthStatus{
		Timestamp: time.Now(),
		Status:    "healthy",
		Details:   make(map[string]string),
	}

	// This is a simplified check - in production you'd use runtime.MemStats
	status.Details["status"] = "Memory monitoring not implemented"
	status.Duration = time.Since(start).String()
	
	return status
}

// determineOverallStatus determines the overall system status
func (h *HealthChecker) determineOverallStatus(components map[string]HealthStatus) string {
	hasUnhealthy := false
	hasDegraded := false

	for _, component := range components {
		switch component.Status {
		case "unhealthy":
			hasUnhealthy = true
		case "degraded":
			hasDegraded = true
		}
	}

	if hasUnhealthy {
		return "unhealthy"
	}
	if hasDegraded {
		return "degraded"
	}
	return "healthy"
}

// ReadinessCheck provides a simple readiness check
func (h *HealthChecker) ReadinessCheck(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	// Check if database is ready
	err := h.db.PingContext(ctx)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "not_ready",
			"error":  "Database not ready",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "ready",
	})
}

// LivenessCheck provides a simple liveness check
func (h *HealthChecker) LivenessCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "alive",
		"uptime": time.Since(h.startTime).String(),
	})
}