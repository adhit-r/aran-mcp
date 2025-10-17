package main

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/radhi1991/aran-mcp-sentinel/internal/auth"
	"go.uber.org/zap"
)

func main() {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	jwks := os.Getenv("CLERK_JWKS_URL")
	iss := os.Getenv("CLERK_ISSUER")
	aud := os.Getenv("CLERK_AUDIENCE")

	if jwks == "" {
		fmt.Println("Please set CLERK_JWKS_URL to your Clerk JWKS endpoint. Example: https://api.clerk.dev/.well-known/jwks")
	}

	r := gin.New()
	r.Use(gin.Recovery())

	// Protected group uses Clerk middleware
	api := r.Group("/api/v1")
	api.Use(auth.ClerkMiddleware(jwks, iss, aud, logger))
	{
		api.GET("/protected", func(c *gin.Context) {
			userID, _ := c.Get("user_id")
			email, _ := c.Get("user_email")
			role, _ := c.Get("user_role")

			c.JSON(http.StatusOK, gin.H{
				"user_id":    userID,
				"user_email": email,
				"user_role":  role,
			})
		})
	}

	// Simple health
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "time": time.Now().UTC()})
	})

	addr := ":8085"
	if p := os.Getenv("PORT"); p != "" {
		addr = ":" + p
	}

	logger.Info("Starting auth-demo server", zap.String("addr", addr))
	if err := r.Run(addr); err != nil {
		logger.Fatal("server failed", zap.Error(err))
	}
}
