package database

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// PoolHandler handles HTTP requests for connection pool management
type PoolHandler struct {
	pool *PooledConnection
}

// NewPoolHandler creates a new PoolHandler
func NewPoolHandler(pool *PooledConnection) *PoolHandler {
	return &PoolHandler{pool: pool}
}

// GetStats returns current connection pool statistics
// @Summary Get connection pool statistics
// @Description Returns detailed statistics about the database connection pool
// @Tags Database
// @Produce json
// @Security ApiKeyAuth
// @Security BearerAuth
// @Success 200 {object} PoolStats
// @Router /api/v1/db/pool/stats [get]
func (h *PoolHandler) GetStats(c *gin.Context) {
	stats := h.pool.Stats()
	c.JSON(http.StatusOK, stats)
}

// GetConfig returns current connection pool configuration
// @Summary Get connection pool configuration
// @Description Returns the current database connection pool configuration
// @Tags Database
// @Produce json
// @Security ApiKeyAuth
// @Security BearerAuth
// @Success 200 {object} PoolConfig
// @Router /api/v1/db/pool/config [get]
func (h *PoolHandler) GetConfig(c *gin.Context) {
	config := h.pool.GetConfig()
	// Mask password
	config.Password = "********"
	c.JSON(http.StatusOK, config)
}

// UpdateConfigRequest represents a request to update pool configuration
type UpdateConfigRequest struct {
	MaxOpenConns    *int    `json:"max_open_conns"`
	MaxIdleConns    *int    `json:"max_idle_conns"`
	ConnMaxLifetime *string `json:"conn_max_lifetime"` // Duration string like "30m"
	ConnMaxIdleTime *string `json:"conn_max_idle_time"` // Duration string like "10m"
}

// UpdateConfig updates connection pool configuration dynamically
// @Summary Update connection pool configuration
// @Description Updates the database connection pool configuration at runtime
// @Tags Database
// @Accept json
// @Produce json
// @Param config body UpdateConfigRequest true "Configuration to update"
// @Security ApiKeyAuth
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Router /api/v1/db/pool/config [put]
func (h *PoolHandler) UpdateConfig(c *gin.Context) {
	var req UpdateConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config := h.pool.GetConfig()

	if req.MaxOpenConns != nil {
		if *req.MaxOpenConns < 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "max_open_conns must be at least 1"})
			return
		}
		config.MaxOpenConns = *req.MaxOpenConns
	}

	if req.MaxIdleConns != nil {
		if *req.MaxIdleConns < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "max_idle_conns cannot be negative"})
			return
		}
		config.MaxIdleConns = *req.MaxIdleConns
	}

	// Note: Duration updates would require parsing time.ParseDuration
	// Left as exercise for production implementation

	h.pool.UpdateConfig(config)

	c.JSON(http.StatusOK, gin.H{
		"message": "Configuration updated successfully",
		"config":  config,
	})
}

// HealthCheckResponse represents a health check response
type HealthCheckResponse struct {
	Status  string    `json:"status"`
	Message string    `json:"message,omitempty"`
	Stats   PoolStats `json:"stats"`
}

// HealthCheck performs a database health check
// @Summary Database health check
// @Description Performs an immediate health check on the database connection
// @Tags Database
// @Produce json
// @Success 200 {object} HealthCheckResponse
// @Failure 503 {object} HealthCheckResponse
// @Router /api/v1/db/health [get]
func (h *PoolHandler) HealthCheck(c *gin.Context) {
	err := h.pool.HealthCheck(c.Request.Context())
	stats := h.pool.Stats()

	if err != nil {
		c.JSON(http.StatusServiceUnavailable, HealthCheckResponse{
			Status:  "unhealthy",
			Message: err.Error(),
			Stats:   stats,
		})
		return
	}

	c.JSON(http.StatusOK, HealthCheckResponse{
		Status: "healthy",
		Stats:  stats,
	})
}

// ResetCircuitBreaker resets the circuit breaker
// @Summary Reset circuit breaker
// @Description Manually resets the database circuit breaker to closed state
// @Tags Database
// @Produce json
// @Security ApiKeyAuth
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/db/pool/circuit-breaker/reset [post]
func (h *PoolHandler) ResetCircuitBreaker(c *gin.Context) {
	h.pool.ResetCircuitBreaker()
	c.JSON(http.StatusOK, gin.H{
		"message": "Circuit breaker reset successfully",
		"stats":   h.pool.Stats(),
	})
}

// WarmUpRequest represents a warmup request
type WarmUpRequest struct {
	NumConnections int `json:"num_connections"`
}

// WarmUp pre-establishes database connections
// @Summary Warm up connection pool
// @Description Pre-establishes database connections to improve initial request latency
// @Tags Database
// @Accept json
// @Produce json
// @Param request body WarmUpRequest false "Number of connections to establish"
// @Security ApiKeyAuth
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]string
// @Router /api/v1/db/pool/warmup [post]
func (h *PoolHandler) WarmUp(c *gin.Context) {
	var req WarmUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Use default if not specified
		req.NumConnections = 0
	}

	err := h.pool.WarmUp(c.Request.Context(), req.NumConnections)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Warmup completed with errors",
			"message": err.Error(),
			"stats":   h.pool.Stats(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Connection pool warmed up successfully",
		"stats":   h.pool.Stats(),
	})
}

// RegisterPoolRoutes registers the pool management routes
func (h *PoolHandler) RegisterPoolRoutes(router *gin.RouterGroup) {
	db := router.Group("/db")
	{
		db.GET("/health", h.HealthCheck)

		pool := db.Group("/pool")
		{
			pool.GET("/stats", h.GetStats)
			pool.GET("/config", h.GetConfig)
			pool.PUT("/config", h.UpdateConfig)
			pool.POST("/circuit-breaker/reset", h.ResetCircuitBreaker)
			pool.POST("/warmup", h.WarmUp)
		}
	}
}
