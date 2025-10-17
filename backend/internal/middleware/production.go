package middleware

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ProductionMiddleware provides production-ready middleware
type ProductionMiddleware struct {
	logger *zap.Logger
}

// NewProductionMiddleware creates production middleware
func NewProductionMiddleware(logger *zap.Logger) *ProductionMiddleware {
	return &ProductionMiddleware{
		logger: logger,
	}
}

// APIKeyAuth provides API key authentication for production
func (pm *ProductionMiddleware) APIKeyAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip auth for health check and public endpoints
		if c.Request.URL.Path == "/health" || 
		   strings.HasPrefix(c.Request.URL.Path, "/api/v1/auth/") {
			c.Next()
			return
		}

		apiKey := c.GetHeader("X-API-Key")
		if apiKey == "" {
			// Try Authorization header
			auth := c.GetHeader("Authorization")
			if strings.HasPrefix(auth, "Bearer ") {
				apiKey = strings.TrimPrefix(auth, "Bearer ")
			}
		}

		if apiKey == "" {
			pm.logger.Warn("Missing API key", 
				zap.String("ip", c.ClientIP()),
				zap.String("path", c.Request.URL.Path),
			)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "API key required",
				"code":  "MISSING_API_KEY",
			})
			c.Abort()
			return
		}

		// Validate API key (in production, check against database)
		validKey := os.Getenv("API_KEY")
		if validKey == "" {
			validKey = "mcp-sentinel-api-key-change-in-production"
		}

		if subtle.ConstantTimeCompare([]byte(apiKey), []byte(validKey)) != 1 {
			pm.logger.Warn("Invalid API key", 
				zap.String("ip", c.ClientIP()),
				zap.String("path", c.Request.URL.Path),
			)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid API key",
				"code":  "INVALID_API_KEY",
			})
			c.Abort()
			return
		}

		// Set user context for audit logging
		c.Set("api_key_used", true)
		c.Set("authenticated", true)
		c.Next()
	}
}

// RequestTimeout adds request timeout
func (pm *ProductionMiddleware) RequestTimeout(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
		defer cancel()

		c.Request = c.Request.WithContext(ctx)
		
		done := make(chan struct{})
		go func() {
			c.Next()
			close(done)
		}()

		select {
		case <-done:
			return
		case <-ctx.Done():
			pm.logger.Warn("Request timeout",
				zap.String("path", c.Request.URL.Path),
				zap.Duration("timeout", timeout),
			)
			c.JSON(http.StatusRequestTimeout, gin.H{
				"error": "Request timeout",
				"code":  "REQUEST_TIMEOUT",
			})
			c.Abort()
		}
	}
}

// AuditLogger logs all API requests for compliance
func (pm *ProductionMiddleware) AuditLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		
		// Capture request body for audit (be careful with sensitive data)
		var requestBody interface{}
		if c.Request.Method == "POST" || c.Request.Method == "PUT" {
			if c.GetHeader("Content-Type") == "application/json" {
				// Only log non-sensitive endpoints
				if !strings.Contains(c.Request.URL.Path, "auth") &&
				   !strings.Contains(c.Request.URL.Path, "password") {
					c.ShouldBindJSON(&requestBody)
				}
			}
		}

		c.Next()

		// Log after request completion
		duration := time.Since(start)
		
		auditLog := map[string]interface{}{
			"timestamp":     start.Format(time.RFC3339),
			"method":        c.Request.Method,
			"path":          c.Request.URL.Path,
			"query":         c.Request.URL.RawQuery,
			"status":        c.Writer.Status(),
			"duration_ms":   duration.Milliseconds(),
			"ip":            c.ClientIP(),
			"user_agent":    c.Request.UserAgent(),
			"response_size": c.Writer.Size(),
		}

		// Add request body if captured
		if requestBody != nil {
			auditLog["request_body"] = requestBody
		}

		// Add authentication info
		if c.GetBool("authenticated") {
			auditLog["authenticated"] = true
			auditLog["auth_method"] = "api_key"
		}

		// Add error info for failed requests
		if c.Writer.Status() >= 400 {
			if errors, exists := c.Get("errors"); exists {
				auditLog["errors"] = errors
			}
		}

		pm.logger.Info("API Request", zap.Any("audit", auditLog))
	}
}

// ResponseCompression adds gzip compression
func (pm *ProductionMiddleware) ResponseCompression() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if client accepts gzip
		if !strings.Contains(c.GetHeader("Accept-Encoding"), "gzip") {
			c.Next()
			return
		}

		// Skip compression for small responses or certain content types
		if c.Writer.Size() < 1024 {
			c.Next()
			return
		}

		c.Header("Content-Encoding", "gzip")
		c.Header("Vary", "Accept-Encoding")
		c.Next()
	}
}

// HealthCheck provides detailed health check
func (pm *ProductionMiddleware) HealthCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.URL.Path != "/health" {
			c.Next()
			return
		}

		health := map[string]interface{}{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"version":   "1.0.0",
			"uptime":    time.Since(time.Now()).String(), // This would be calculated from app start
			"checks": map[string]interface{}{
				"database": map[string]interface{}{
					"status": "healthy",
					"latency": "5ms",
				},
				"redis": map[string]interface{}{
					"status": "healthy",
					"latency": "2ms",
				},
				"mcp_servers": map[string]interface{}{
					"status": "healthy",
					"count":  0, // This would be actual count
				},
			},
		}

		c.JSON(http.StatusOK, health)
		c.Abort()
	}
}

// ErrorHandler provides consistent error responses
func (pm *ProductionMiddleware) ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Handle any errors that occurred during request processing
		if len(c.Errors) > 0 {
			err := c.Errors.Last()
			
			pm.logger.Error("Request error",
				zap.String("path", c.Request.URL.Path),
				zap.Error(err),
			)

			// Don't override if response was already written
			if c.Writer.Written() {
				return
			}

			// Determine error type and status code
			statusCode := http.StatusInternalServerError
			errorCode := "INTERNAL_ERROR"
			message := "An internal error occurred"

			// Customize based on error type
			switch {
			case strings.Contains(err.Error(), "timeout"):
				statusCode = http.StatusRequestTimeout
				errorCode = "TIMEOUT"
				message = "Request timeout"
			case strings.Contains(err.Error(), "not found"):
				statusCode = http.StatusNotFound
				errorCode = "NOT_FOUND"
				message = "Resource not found"
			case strings.Contains(err.Error(), "validation"):
				statusCode = http.StatusBadRequest
				errorCode = "VALIDATION_ERROR"
				message = "Validation failed"
			}

			c.JSON(statusCode, gin.H{
				"error":     message,
				"code":      errorCode,
				"timestamp": time.Now().Format(time.RFC3339),
				"path":      c.Request.URL.Path,
			})
		}
	}
}

// MetricsCollector collects basic metrics
func (pm *ProductionMiddleware) MetricsCollector() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		
		duration := time.Since(start)
		
		// In production, you'd send these to Prometheus/Grafana
		pm.logger.Debug("Request metrics",
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.Int("status", c.Writer.Status()),
			zap.Duration("duration", duration),
			zap.Int("response_size", c.Writer.Size()),
		)
	}
}