package middleware

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

// SecurityHeaders adds security headers to all responses
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent clickjacking
		c.Header("X-Frame-Options", "DENY")
		
		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")
		
		// Enable XSS protection
		c.Header("X-XSS-Protection", "1; mode=block")
		
		// Prevent referrer leakage
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		
		// Content Security Policy
		c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
		
		// HSTS (only in production with HTTPS)
		if gin.Mode() == gin.ReleaseMode {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		
		c.Next()
	}
}

// RateLimiter implements rate limiting per IP
func RateLimiter(requestsPerMinute int, logger *zap.Logger) gin.HandlerFunc {
	// Create a map to store rate limiters for each IP
	limiters := make(map[string]*rate.Limiter)
	
	return func(c *gin.Context) {
		ip := c.ClientIP()
		
		// Get or create limiter for this IP
		limiter, exists := limiters[ip]
		if !exists {
			limiter = rate.NewLimiter(rate.Every(time.Minute/time.Duration(requestsPerMinute)), requestsPerMinute)
			limiters[ip] = limiter
		}
		
		// Check if request is allowed
		if !limiter.Allow() {
			logger.Warn("Rate limit exceeded", 
				zap.String("ip", ip),
				zap.String("path", c.Request.URL.Path),
			)
			
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please try again later.",
				"retry_after": "60s",
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// RequestValidator validates common request parameters
func RequestValidator() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Validate Content-Type for POST/PUT requests
		if c.Request.Method == "POST" || c.Request.Method == "PUT" {
			contentType := c.GetHeader("Content-Type")
			if !strings.Contains(contentType, "application/json") && 
			   !strings.Contains(contentType, "multipart/form-data") {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "Invalid Content-Type. Expected application/json",
				})
				c.Abort()
				return
			}
		}
		
		// Validate request size (max 10MB)
		if c.Request.ContentLength > 10*1024*1024 {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": "Request body too large. Maximum size is 10MB",
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// RequestLogger logs all incoming requests
func RequestLogger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		
		// Process request
		c.Next()
		
		// Log request details
		duration := time.Since(start)
		
		logger.Info("HTTP Request",
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.String("query", c.Request.URL.RawQuery),
			zap.String("ip", c.ClientIP()),
			zap.String("user_agent", c.Request.UserAgent()),
			zap.Int("status", c.Writer.Status()),
			zap.Duration("duration", duration),
			zap.Int("response_size", c.Writer.Size()),
		)
	}
}

// ErrorHandler handles panics and errors gracefully
func ErrorHandler(logger *zap.Logger) gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		if err, ok := recovered.(string); ok {
			logger.Error("Panic recovered",
				zap.String("error", err),
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method),
			)
		}
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Internal server error",
			"message": "Something went wrong. Please try again later.",
		})
	})
}