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
	"github.com/radhi1991/aran-mcp-sentinel/internal/mcp"
	"github.com/radhi1991/aran-mcp-sentinel/internal/repository"
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

	// Initialize Supabase client
	supabaseClient, err := supabase.NewClient()
	if err != nil {
		logger.Fatal("Failed to initialize Supabase client", zap.Error(err))
	}

	// Initialize MCP repository
	repo := repository.NewMCPServerRepository(supabaseClient)

	// Initialize Gin router
	r := gin.New()
	r.Use(gin.Recovery())

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		// Check database connection
		if err := supabaseClient.HealthCheck(c.Request.Context()); err != nil {
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
		// MCP endpoints
		mcpGroup := api.Group("/mcp")
		// Initialize MCP handler with repository
		mcpHandler := mcp.NewHandler(logger, repo)
		mcpHandler.RegisterRoutes(mcpGroup)
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
