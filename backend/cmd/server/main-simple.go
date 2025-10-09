package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/radhi1991/aran-mcp-sentinel/internal/config"
	"github.com/radhi1991/aran-mcp-sentinel/internal/database"
	"github.com/radhi1991/aran-mcp-sentinel/internal/discovery"
	"github.com/radhi1991/aran-mcp-sentinel/internal/mcp"
	"github.com/radhi1991/aran-mcp-sentinel/internal/monitoring"
	"github.com/radhi1991/aran-mcp-sentinel/internal/registry"
	"github.com/radhi1991/aran-mcp-sentinel/internal/repository"
	"github.com/radhi1991/aran-mcp-sentinel/internal/security"
	"github.com/radhi1991/aran-mcp-sentinel/internal/supabase"
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

	// Initialize Supabase client (for legacy compatibility)
	supabaseClient, err := supabase.NewClientWithConfig(cfg.Supabase.URL, cfg.Supabase.Key)
	if err != nil {
		logger.Fatal("Failed to initialize Supabase client", zap.Error(err))
	}

	// Initialize legacy MCP repository
	legacyRepo := repository.NewMCPServerRepository(supabaseClient)

	// Initialize Gin router
	r := gin.New()
	r.Use(gin.Recovery())

	// Add CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")

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
	{
		// Simple auth endpoint for testing
		api.GET("/auth/me", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"id":          "admin",
				"email":       "admin@mcp-sentinel.local",
				"name":        "MCP Sentinel Admin",
				"username":    "admin",
				"groups":      []string{"admins", "dev"},
				"auth_method": "simple",
			})
		})

		// MCP endpoints (no auth required for testing)
		mcpGroup := api.Group("/mcp")
		mcpHandler := mcp.NewHandler(logger, legacyRepo)
		mcpHandler.RegisterRoutes(mcpGroup)

		// Monitoring endpoints (no auth required for testing)
		monitoringHandler := monitoring.NewHandler(repo, logger)
		monitoringHandler.RegisterRoutes(api)

		// Comprehensive health monitoring endpoints
		healthChecker := monitoring.NewHealthChecker(repo, logger)
		comprehensiveHealthHandler := monitoring.NewComprehensiveHealthHandler(logger, healthChecker)
		comprehensiveHealthHandler.RegisterComprehensiveRoutes(api)

		// Security testing endpoints (no auth required for testing)
		securityHandler := security.NewHandler(logger)
		securityHandler.RegisterRoutes(api)

		// Discovery endpoints (no auth required for testing)
		discoveryHandler := discovery.NewDiscoveryHandler(logger, legacyRepo)
		discoveryHandler.RegisterRoutes(api)

		// Registry endpoints (no auth required for testing)
		registryHandler := registry.NewRegistryHandler(logger, legacyRepo)
		registryHandler.RegisterRoutes(api)
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
