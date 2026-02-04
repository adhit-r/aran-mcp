package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/radhi1991/aran-mcp-sentinel/internal/auth"
	"github.com/radhi1991/aran-mcp-sentinel/internal/config"
	"github.com/radhi1991/aran-mcp-sentinel/internal/database"
	"github.com/radhi1991/aran-mcp-sentinel/internal/discovery"
	"github.com/radhi1991/aran-mcp-sentinel/internal/mcp"
	"github.com/radhi1991/aran-mcp-sentinel/internal/middleware"
	"github.com/radhi1991/aran-mcp-sentinel/internal/monitoring"
	"github.com/radhi1991/aran-mcp-sentinel/internal/repository"
	"github.com/radhi1991/aran-mcp-sentinel/internal/security"
	"github.com/radhi1991/aran-mcp-sentinel/internal/webhook"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	// Initialize database connection
	logger.Info("Database config",
		zap.String("host", cfg.Database.Host),
		zap.Int("port", cfg.Database.Port),
		zap.String("user", cfg.Database.User),
		zap.String("dbname", cfg.Database.Name),
		zap.String("sslmode", cfg.Database.SSLMode))

	dbConfig := database.Config{
		Host:     cfg.Database.Host,
		Port:     cfg.Database.Port,
		User:     cfg.Database.User,
		Password: cfg.Database.Password,
		DBName:   cfg.Database.Name,
		SSLMode:  cfg.Database.SSLMode,
	}

	dbConn, err := database.NewConnection(dbConfig, logger)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer dbConn.Close()

	// Initialize repository
	repo := database.NewRepository(dbConn.DB, logger)

	// Initialize Neon Auth handler if enabled
	var neonAuthHandler *auth.NeonAuthHandler
	if cfg.NeonAuth.Enabled && cfg.NeonAuth.ProjectID != "" && cfg.NeonAuth.SecretKey != "" {
		neonAuthHandler = auth.NewNeonAuthHandler(
			cfg.NeonAuth.ProjectID,
			cfg.NeonAuth.PublishableKey,
			cfg.NeonAuth.SecretKey,
			logger,
		)
		logger.Info("Neon Auth enabled", zap.String("project_id", cfg.NeonAuth.ProjectID))
	}

	// Initialize JWT manager (for legacy compatibility)
	jwtManager := auth.NewJWTManager(auth.JWTConfig{
		SecretKey:     cfg.JWT.SecretKey,
		AccessExpiry:  time.Duration(cfg.JWT.AccessExpiry) * time.Minute,
		RefreshExpiry: time.Duration(cfg.JWT.RefreshExpiry) * time.Hour,
	})

	// Initialize auth handler with all supported methods
	authHandler := auth.NewAuthHandler(repo, jwtManager, neonAuthHandler, logger)

	// Initialize alerts handler
	alertsHandler := monitoring.NewAlertsHandler(dbConn.DB.DB)

	// Initialize Gin router
	r := gin.New()

	// Add security middleware
	r.Use(middleware.ErrorHandler(logger))
	r.Use(middleware.RequestLogger(logger))
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.RequestValidator())

	// Add rate limiting (100 requests per minute by default)
	rateLimit := 100
	if rateLimitStr := os.Getenv("RATE_LIMIT_REQUESTS_PER_MINUTE"); rateLimitStr != "" {
		if parsed, err := strconv.Atoi(rateLimitStr); err == nil {
			rateLimit = parsed
		}
	}
	r.Use(middleware.RateLimiter(rateLimit, logger))

	// Add secure CORS middleware
	allowedOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:3000"
	}

	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Check if origin is allowed
		allowed := false
		for _, allowedOrigin := range strings.Split(allowedOrigins, ",") {
			if strings.TrimSpace(allowedOrigin) == origin {
				allowed = true
				break
			}
		}

		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		// Check database connection
		if err := dbConn.HealthCheck(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":  "unhealthy",
				"message": "Database connection failed",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Service is healthy",
		})
	})

	// API v1 routes
	api := r.Group("/api/v1")

	// Register MCP routes (temporarily unprotected for testing)
	mcpGroup := r.Group("/api/v1/mcp")
	mcpRepo := repository.NewMCPRepositoryAdapter(repo)
	mcpHandler := mcp.NewHandler(logger, mcpRepo)
	mcpHandler.RegisterRoutes(mcpGroup)
	discoverySvc := discovery.NewMCPDiscoveryService(logger)
	monitorSvc := monitoring.NewMCPMonitor(dbConn.DB.DB, logger, nil)
	enhancedHandler := mcp.NewEnhancedHandler(dbConn.DB.DB, logger, discoverySvc, monitorSvc)
	enhancedHandler.RegisterEnhancedRoutes(mcpGroup)

	{
		// Authentication endpoints (no auth required)
		authHandler.RegisterRoutes(api)

		// Protected routes (require authentication)
		protected := api.Group("/")
		// Choose authentication middleware based on configuration
		useClerk := false
		if os.Getenv("USE_CLERK_AUTH") == "true" || cfg.Clerk.JWKSURL != "" {
			useClerk = true
		}

		useNeonAuth := cfg.NeonAuth.Enabled && cfg.NeonAuth.ProjectID != ""

		// Feature flag for MCP authentication
		enableMCPAuth := os.Getenv("ENABLE_MCP_AUTH") == "true"

		if useNeonAuth {
			logger.Info("Using Neon Auth middleware for authentication")
			neonMiddleware := neonAuthHandler.NeonAuthMiddleware()
			if enableMCPAuth {
				api.Group("/mcp", neonMiddleware)
			}
			protected.Use(neonMiddleware)
		} else if useClerk {
			logger.Info("Using Clerk middleware for authentication")
			clerkMiddleware := auth.ClerkMiddleware(cfg.Clerk.JWKSURL, cfg.Clerk.Issuer, cfg.Clerk.Audience, logger)
			if enableMCPAuth {
				api.Group("/mcp", clerkMiddleware)
			}
			protected.Use(clerkMiddleware)
		} else {
			// Use Authelia middleware for authentication
			autheliaMiddleware := auth.AutheliaMiddleware(logger)
			if enableMCPAuth {
				api.Group("/mcp", autheliaMiddleware)
			}
			protected.Use(autheliaMiddleware)
		}

		// Register MCP routes (conditionally protected)
		// mcpGroup := api.Group("/mcp")
		// mcpRepo := repository.NewMCPRepositoryAdapter(repo)
		// mcpHandler := mcp.NewHandler(logger, mcpRepo)
		// mcpHandler.RegisterRoutes(mcpGroup)
		// discoverySvc := discovery.NewMCPDiscoveryService(logger)
		// monitorSvc := monitoring.NewMCPMonitor(dbConn.DB.DB, logger, nil)
		// enhancedHandler := mcp.NewEnhancedHandler(dbConn.DB.DB, logger, discoverySvc, monitorSvc)
		// enhancedHandler.RegisterEnhancedRoutes(mcpGroup)

		{
			// Monitoring endpoints
			monitoringHandler := monitoring.NewHandler(repo, logger)
			monitoringHandler.RegisterRoutes(protected)

			// Security testing endpoints
			securityHandler := security.NewHandler(logger)
			securityHandler.RegisterRoutes(protected)

			// Threat modeling endpoints (SAFE-MCP integration)
			threatModelManager := security.NewThreatModelManager(logger)
			threatModelHandler := security.NewThreatModelHandler(logger, threatModelManager)
			threatModelHandler.RegisterRoutes(protected)

			// Alerts endpoints
			alertsHandler.RegisterRoutes(protected)

			// Discovery endpoints (including endpoint scanning)
			// Endpoint scanning doesn't require repository, so we pass nil
			discoveryHandler := discovery.NewDiscoveryHandler(logger, nil)
			discoveryHandler.RegisterRoutes(protected)

			// Webhook endpoints
			webhookService := webhook.NewService(dbConn.DB.DB, logger)
			webhookHandler := webhook.NewHandler(webhookService, logger)
			webhookHandler.RegisterRoutes(protected)
		}
	}

	// Create HTTP server
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Server.Port),
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		logger.Info("Starting server", zap.String("address", server.Addr))
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Fatal("Server error", zap.Error(err))
		}
	}()

	// Start periodic health checks
	healthChecker := monitoring.NewHealthChecker(repo, logger)
	healthCtx, healthCancel := context.WithCancel(context.Background())
	defer healthCancel()

	go healthChecker.StartPeriodicHealthChecks(healthCtx, 30*time.Second)
	logger.Info("Started periodic health checks", zap.Duration("interval", 30*time.Second))

	// Wait for interrupt signal to gracefully shut down the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// The context is used to inform the server it has 5 seconds to finish
	// the request it is currently handling
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown:", zap.Error(err))
	}

	logger.Info("Server exiting")
}
