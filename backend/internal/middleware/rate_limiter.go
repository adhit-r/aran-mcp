package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

// RateLimitConfig defines the configuration for rate limiting
type RateLimitConfig struct {
	// Global rate limiting
	GlobalRequestsPerMinute int  `json:"global_requests_per_minute"`
	GlobalBurstSize         int  `json:"global_burst_size"`
	EnableGlobal            bool `json:"enable_global"`

	// Per-IP rate limiting
	IPRequestsPerMinute int  `json:"ip_requests_per_minute"`
	IPBurstSize         int  `json:"ip_burst_size"`
	EnablePerIP         bool `json:"enable_per_ip"`

	// Per-user (API key) rate limiting
	UserRequestsPerMinute int  `json:"user_requests_per_minute"`
	UserBurstSize         int  `json:"user_burst_size"`
	EnablePerUser         bool `json:"enable_per_user"`

	// Per-endpoint rate limiting
	EndpointLimits    map[string]*EndpointLimit `json:"endpoint_limits"`
	EnablePerEndpoint bool                      `json:"enable_per_endpoint"`

	// Cleanup settings
	CleanupInterval time.Duration `json:"cleanup_interval"`
	EntryTTL        time.Duration `json:"entry_ttl"`

	// Response settings
	RetryAfterSeconds int  `json:"retry_after_seconds"`
	IncludeHeaders    bool `json:"include_headers"`
}

// EndpointLimit defines rate limits for a specific endpoint
type EndpointLimit struct {
	Path              string `json:"path"`
	Method            string `json:"method"`
	RequestsPerMinute int    `json:"requests_per_minute"`
	BurstSize         int    `json:"burst_size"`
}

// RateLimitEntry tracks rate limit state for an entity
type RateLimitEntry struct {
	Limiter    *rate.Limiter
	LastAccess time.Time
}

// AdvancedRateLimiter provides comprehensive rate limiting
type AdvancedRateLimiter struct {
	config    *RateLimitConfig
	logger    *zap.Logger
	mu        sync.RWMutex
	ipLimits  map[string]*RateLimitEntry
	userLimits map[string]*RateLimitEntry
	endpointLimits map[string]map[string]*RateLimitEntry // endpoint -> (ip/user -> entry)
	globalLimiter *rate.Limiter
	stopCleanup   chan struct{}
}

// DefaultRateLimitConfig returns sensible defaults
func DefaultRateLimitConfig() *RateLimitConfig {
	return &RateLimitConfig{
		// Global: 1000 requests per minute across all IPs
		GlobalRequestsPerMinute: 1000,
		GlobalBurstSize:         100,
		EnableGlobal:            true,

		// Per-IP: 100 requests per minute per IP
		IPRequestsPerMinute: 100,
		IPBurstSize:         20,
		EnablePerIP:         true,

		// Per-user: 200 requests per minute per authenticated user
		UserRequestsPerMinute: 200,
		UserBurstSize:         40,
		EnablePerUser:         true,

		// Per-endpoint: different limits for different endpoints
		EnablePerEndpoint: true,
		EndpointLimits: map[string]*EndpointLimit{
			// Health check - very permissive
			"GET:/health": {
				Path:              "/health",
				Method:            "GET",
				RequestsPerMinute: 600,
				BurstSize:         60,
			},
			// Search - moderate limits
			"GET:/api/v1/servers/search": {
				Path:              "/api/v1/servers/search",
				Method:            "GET",
				RequestsPerMinute: 60,
				BurstSize:         10,
			},
			"POST:/api/v1/servers/search": {
				Path:              "/api/v1/servers/search",
				Method:            "POST",
				RequestsPerMinute: 60,
				BurstSize:         10,
			},
			// Create server - stricter limits
			"POST:/api/v1/mcp/servers": {
				Path:              "/api/v1/mcp/servers",
				Method:            "POST",
				RequestsPerMinute: 30,
				BurstSize:         5,
			},
			// Delete server - very strict
			"DELETE:/api/v1/mcp/servers": {
				Path:              "/api/v1/mcp/servers",
				Method:            "DELETE",
				RequestsPerMinute: 10,
				BurstSize:         2,
			},
			// Security tests - strict due to resource intensity
			"POST:/api/v1/security/test": {
				Path:              "/api/v1/security/test",
				Method:            "POST",
				RequestsPerMinute: 10,
				BurstSize:         2,
			},
			// Auth endpoints - moderate to prevent brute force
			"POST:/api/v1/auth/login": {
				Path:              "/api/v1/auth/login",
				Method:            "POST",
				RequestsPerMinute: 20,
				BurstSize:         5,
			},
			"POST:/api/v1/auth/register": {
				Path:              "/api/v1/auth/register",
				Method:            "POST",
				RequestsPerMinute: 10,
				BurstSize:         3,
			},
		},

		CleanupInterval:   5 * time.Minute,
		EntryTTL:          10 * time.Minute,
		RetryAfterSeconds: 60,
		IncludeHeaders:    true,
	}
}

// NewAdvancedRateLimiter creates a new advanced rate limiter
func NewAdvancedRateLimiter(config *RateLimitConfig, logger *zap.Logger) *AdvancedRateLimiter {
	if config == nil {
		config = DefaultRateLimitConfig()
	}

	rl := &AdvancedRateLimiter{
		config:         config,
		logger:         logger,
		ipLimits:       make(map[string]*RateLimitEntry),
		userLimits:     make(map[string]*RateLimitEntry),
		endpointLimits: make(map[string]map[string]*RateLimitEntry),
		stopCleanup:    make(chan struct{}),
	}

	// Initialize global limiter
	if config.EnableGlobal {
		rl.globalLimiter = rate.NewLimiter(
			rate.Every(time.Minute/time.Duration(config.GlobalRequestsPerMinute)),
			config.GlobalBurstSize,
		)
	}

	// Initialize endpoint-specific limiters map
	for key := range config.EndpointLimits {
		rl.endpointLimits[key] = make(map[string]*RateLimitEntry)
	}

	// Start cleanup goroutine
	go rl.cleanupLoop()

	return rl
}

// Middleware returns the Gin middleware handler
func (rl *AdvancedRateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		clientIP := c.ClientIP()
		userID := c.GetString("user_id") // Set by auth middleware
		apiKey := c.GetString("api_key")
		path := c.Request.URL.Path
		method := c.Request.Method

		// Determine the key for user-based limiting
		userKey := userID
		if userKey == "" && apiKey != "" {
			// Hash API key for privacy
			hash := sha256.Sum256([]byte(apiKey))
			userKey = "apikey:" + hex.EncodeToString(hash[:8])
		}

		// Track rate limit info for headers
		var limitInfo *rateLimitInfo

		// Check global rate limit
		if rl.config.EnableGlobal {
			if !rl.globalLimiter.Allow() {
				rl.logger.Warn("Global rate limit exceeded",
					zap.String("ip", clientIP),
					zap.String("path", path),
				)
				rl.rateLimitResponse(c, "global", nil)
				return
			}
		}

		// Check per-endpoint rate limit
		if rl.config.EnablePerEndpoint {
			endpointKey := method + ":" + rl.normalizeEndpoint(path)
			if limit, exists := rl.config.EndpointLimits[endpointKey]; exists {
				if !rl.checkEndpointLimit(ctx, endpointKey, clientIP, limit) {
					rl.logger.Warn("Endpoint rate limit exceeded",
						zap.String("ip", clientIP),
						zap.String("endpoint", endpointKey),
					)
					rl.rateLimitResponse(c, "endpoint", &rateLimitInfo{
						limit:     limit.RequestsPerMinute,
						remaining: 0,
						reset:     time.Now().Add(time.Minute),
					})
					return
				}
			}
		}

		// Check per-IP rate limit
		if rl.config.EnablePerIP {
			allowed, info := rl.checkIPLimit(ctx, clientIP)
			if !allowed {
				rl.logger.Warn("IP rate limit exceeded",
					zap.String("ip", clientIP),
					zap.String("path", path),
				)
				rl.rateLimitResponse(c, "ip", info)
				return
			}
			limitInfo = info
		}

		// Check per-user rate limit
		if rl.config.EnablePerUser && userKey != "" {
			allowed, info := rl.checkUserLimit(ctx, userKey)
			if !allowed {
				rl.logger.Warn("User rate limit exceeded",
					zap.String("user", userKey),
					zap.String("ip", clientIP),
					zap.String("path", path),
				)
				rl.rateLimitResponse(c, "user", info)
				return
			}
			// User limits take precedence for headers
			limitInfo = info
		}

		// Add rate limit headers if enabled
		if rl.config.IncludeHeaders && limitInfo != nil {
			c.Header("X-RateLimit-Limit", strconv.Itoa(limitInfo.limit))
			c.Header("X-RateLimit-Remaining", strconv.Itoa(limitInfo.remaining))
			c.Header("X-RateLimit-Reset", strconv.FormatInt(limitInfo.reset.Unix(), 10))
		}

		c.Next()
	}
}

type rateLimitInfo struct {
	limit     int
	remaining int
	reset     time.Time
}

// normalizeEndpoint normalizes endpoint paths (removes IDs)
func (rl *AdvancedRateLimiter) normalizeEndpoint(path string) string {
	// Remove UUID patterns
	path = strings.ReplaceAll(path, "/", "/")
	
	// Common patterns to normalize
	parts := strings.Split(path, "/")
	for i, part := range parts {
		// If it looks like a UUID or numeric ID, replace with placeholder
		if len(part) == 36 && strings.Count(part, "-") == 4 {
			parts[i] = ":id"
		} else if _, err := strconv.Atoi(part); err == nil && len(part) > 0 {
			parts[i] = ":id"
		}
	}
	
	return strings.Join(parts, "/")
}

// checkIPLimit checks if an IP is within rate limits
func (rl *AdvancedRateLimiter) checkIPLimit(ctx context.Context, ip string) (bool, *rateLimitInfo) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	entry, exists := rl.ipLimits[ip]
	if !exists {
		entry = &RateLimitEntry{
			Limiter: rate.NewLimiter(
				rate.Every(time.Minute/time.Duration(rl.config.IPRequestsPerMinute)),
				rl.config.IPBurstSize,
			),
			LastAccess: time.Now(),
		}
		rl.ipLimits[ip] = entry
	}

	entry.LastAccess = time.Now()

	// Calculate remaining tokens
	reservation := entry.Limiter.Reserve()
	delay := reservation.Delay()
	
	if delay > 0 {
		reservation.Cancel()
		return false, &rateLimitInfo{
			limit:     rl.config.IPRequestsPerMinute,
			remaining: 0,
			reset:     time.Now().Add(time.Minute),
		}
	}

	// Estimate remaining requests
	tokens := int(entry.Limiter.Tokens())
	
	return true, &rateLimitInfo{
		limit:     rl.config.IPRequestsPerMinute,
		remaining: tokens,
		reset:     time.Now().Add(time.Minute),
	}
}

// checkUserLimit checks if a user is within rate limits
func (rl *AdvancedRateLimiter) checkUserLimit(ctx context.Context, userKey string) (bool, *rateLimitInfo) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	entry, exists := rl.userLimits[userKey]
	if !exists {
		entry = &RateLimitEntry{
			Limiter: rate.NewLimiter(
				rate.Every(time.Minute/time.Duration(rl.config.UserRequestsPerMinute)),
				rl.config.UserBurstSize,
			),
			LastAccess: time.Now(),
		}
		rl.userLimits[userKey] = entry
	}

	entry.LastAccess = time.Now()

	reservation := entry.Limiter.Reserve()
	delay := reservation.Delay()

	if delay > 0 {
		reservation.Cancel()
		return false, &rateLimitInfo{
			limit:     rl.config.UserRequestsPerMinute,
			remaining: 0,
			reset:     time.Now().Add(time.Minute),
		}
	}

	tokens := int(entry.Limiter.Tokens())

	return true, &rateLimitInfo{
		limit:     rl.config.UserRequestsPerMinute,
		remaining: tokens,
		reset:     time.Now().Add(time.Minute),
	}
}

// checkEndpointLimit checks if an endpoint is within rate limits for a given client
func (rl *AdvancedRateLimiter) checkEndpointLimit(ctx context.Context, endpointKey, clientKey string, limit *EndpointLimit) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	endpointMap, exists := rl.endpointLimits[endpointKey]
	if !exists {
		endpointMap = make(map[string]*RateLimitEntry)
		rl.endpointLimits[endpointKey] = endpointMap
	}

	entry, exists := endpointMap[clientKey]
	if !exists {
		entry = &RateLimitEntry{
			Limiter: rate.NewLimiter(
				rate.Every(time.Minute/time.Duration(limit.RequestsPerMinute)),
				limit.BurstSize,
			),
			LastAccess: time.Now(),
		}
		endpointMap[clientKey] = entry
	}

	entry.LastAccess = time.Now()
	return entry.Limiter.Allow()
}

// rateLimitResponse sends a rate limit exceeded response
func (rl *AdvancedRateLimiter) rateLimitResponse(c *gin.Context, limitType string, info *rateLimitInfo) {
	retryAfter := rl.config.RetryAfterSeconds
	
	response := gin.H{
		"error":       "Rate limit exceeded",
		"code":        "RATE_LIMIT_EXCEEDED",
		"limit_type":  limitType,
		"retry_after": fmt.Sprintf("%ds", retryAfter),
		"message":     fmt.Sprintf("Too many requests. Please wait %d seconds before trying again.", retryAfter),
	}

	if info != nil {
		response["limit"] = info.limit
		response["remaining"] = info.remaining
		response["reset"] = info.reset.Unix()
	}

	c.Header("Retry-After", strconv.Itoa(retryAfter))
	
	if info != nil {
		c.Header("X-RateLimit-Limit", strconv.Itoa(info.limit))
		c.Header("X-RateLimit-Remaining", "0")
		c.Header("X-RateLimit-Reset", strconv.FormatInt(info.reset.Unix(), 10))
	}

	c.JSON(http.StatusTooManyRequests, response)
	c.Abort()
}

// cleanupLoop periodically removes stale rate limit entries
func (rl *AdvancedRateLimiter) cleanupLoop() {
	ticker := time.NewTicker(rl.config.CleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			rl.cleanup()
		case <-rl.stopCleanup:
			return
		}
	}
}

// cleanup removes entries that haven't been accessed recently
func (rl *AdvancedRateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	ttl := rl.config.EntryTTL

	// Cleanup IP limits
	for ip, entry := range rl.ipLimits {
		if now.Sub(entry.LastAccess) > ttl {
			delete(rl.ipLimits, ip)
		}
	}

	// Cleanup user limits
	for user, entry := range rl.userLimits {
		if now.Sub(entry.LastAccess) > ttl {
			delete(rl.userLimits, user)
		}
	}

	// Cleanup endpoint limits
	for endpoint, clientMap := range rl.endpointLimits {
		for client, entry := range clientMap {
			if now.Sub(entry.LastAccess) > ttl {
				delete(clientMap, client)
			}
		}
		// Remove empty endpoint maps
		if len(clientMap) == 0 {
			delete(rl.endpointLimits, endpoint)
		}
	}

	rl.logger.Debug("Rate limiter cleanup completed",
		zap.Int("ip_entries", len(rl.ipLimits)),
		zap.Int("user_entries", len(rl.userLimits)),
		zap.Int("endpoint_entries", len(rl.endpointLimits)),
	)
}

// Stop stops the rate limiter cleanup goroutine
func (rl *AdvancedRateLimiter) Stop() {
	close(rl.stopCleanup)
}

// Stats returns current rate limiter statistics
func (rl *AdvancedRateLimiter) Stats() map[string]interface{} {
	rl.mu.RLock()
	defer rl.mu.RUnlock()

	endpointStats := make(map[string]int)
	for endpoint, clientMap := range rl.endpointLimits {
		endpointStats[endpoint] = len(clientMap)
	}

	return map[string]interface{}{
		"ip_entries":       len(rl.ipLimits),
		"user_entries":     len(rl.userLimits),
		"endpoint_entries": endpointStats,
		"config": map[string]interface{}{
			"global_enabled":   rl.config.EnableGlobal,
			"per_ip_enabled":   rl.config.EnablePerIP,
			"per_user_enabled": rl.config.EnablePerUser,
			"per_endpoint_enabled": rl.config.EnablePerEndpoint,
		},
	}
}

// UpdateConfig updates the rate limiter configuration
func (rl *AdvancedRateLimiter) UpdateConfig(config *RateLimitConfig) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	rl.config = config

	// Recreate global limiter if needed
	if config.EnableGlobal {
		rl.globalLimiter = rate.NewLimiter(
			rate.Every(time.Minute/time.Duration(config.GlobalRequestsPerMinute)),
			config.GlobalBurstSize,
		)
	}

	// Clear existing limiters to apply new config
	rl.ipLimits = make(map[string]*RateLimitEntry)
	rl.userLimits = make(map[string]*RateLimitEntry)
	rl.endpointLimits = make(map[string]map[string]*RateLimitEntry)

	for key := range config.EndpointLimits {
		rl.endpointLimits[key] = make(map[string]*RateLimitEntry)
	}
}

// RateLimitHandler provides an HTTP handler for rate limit management
type RateLimitHandler struct {
	limiter *AdvancedRateLimiter
	logger  *zap.Logger
}

// NewRateLimitHandler creates a new rate limit handler
func NewRateLimitHandler(limiter *AdvancedRateLimiter, logger *zap.Logger) *RateLimitHandler {
	return &RateLimitHandler{
		limiter: limiter,
		logger:  logger,
	}
}

// GetStats returns rate limiter statistics
func (h *RateLimitHandler) GetStats(c *gin.Context) {
	c.JSON(http.StatusOK, h.limiter.Stats())
}

// GetConfig returns current rate limit configuration
func (h *RateLimitHandler) GetConfig(c *gin.Context) {
	c.JSON(http.StatusOK, h.limiter.config)
}

// UpdateConfig updates rate limit configuration
func (h *RateLimitHandler) UpdateConfig(c *gin.Context) {
	var config RateLimitConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid configuration"})
		return
	}

	h.limiter.UpdateConfig(&config)
	h.logger.Info("Rate limit configuration updated")
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Configuration updated successfully",
		"config":  config,
	})
}

// RegisterRoutes registers rate limit management routes
func (h *RateLimitHandler) RegisterRoutes(group *gin.RouterGroup) {
	rateLimitGroup := group.Group("/rate-limit")
	{
		rateLimitGroup.GET("/stats", h.GetStats)
		rateLimitGroup.GET("/config", h.GetConfig)
		rateLimitGroup.PUT("/config", h.UpdateConfig)
	}
}
