package auth

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AutheliaHandler handles Authelia-based authentication
type AutheliaHandler struct {
	logger *zap.Logger
}

// NewAutheliaHandler creates a new Authelia handler
func NewAutheliaHandler(logger *zap.Logger) *AutheliaHandler {
	return &AutheliaHandler{
		logger: logger,
	}
}

// RegisterRoutes registers Authelia authentication routes
func (h *AutheliaHandler) RegisterRoutes(router *gin.RouterGroup) {
	auth := router.Group("/auth")
	{
		// Only keep the /me endpoint for Authelia
		auth.GET("/me", h.GetCurrentUser)
	}
}

// GetCurrentUser returns the current authenticated user
func (h *AutheliaHandler) GetCurrentUser(c *gin.Context) {
	// Get Authelia user information
	autheliaUser, exists := GetAutheliaUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated via Authelia"})
		return
	}

	// Return Authelia user information
	c.JSON(http.StatusOK, gin.H{
		"id":          autheliaUser.Username,
		"email":       autheliaUser.Email,
		"name":        autheliaUser.DisplayName,
		"username":    autheliaUser.Username,
		"groups":      autheliaUser.Groups,
		"auth_method": "authelia",
	})
}





