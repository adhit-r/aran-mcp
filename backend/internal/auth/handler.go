package auth

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"github.com/radhi1991/aran-mcp-sentinel/internal/database"
)

// AuthHandler handles authentication requests
type AuthHandler struct {
	repo       *database.Repository
	jwtManager *JWTManager
	logger     *zap.Logger
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(repo *database.Repository, jwtManager *JWTManager, logger *zap.Logger) *AuthHandler {
	return &AuthHandler{
		repo:       repo,
		jwtManager: jwtManager,
		logger:     logger,
	}
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	User         *database.User `json:"user"`
	AccessToken  string         `json:"access_token"`
	RefreshToken string         `json:"refresh_token"`
	ExpiresIn    int64          `json:"expires_in"`
}

// RegisterRoutes registers authentication routes
func (h *AuthHandler) RegisterRoutes(router *gin.RouterGroup) {
	auth := router.Group("/auth")
	{
		// Only keep the /me endpoint for Authelia
		auth.GET("/me", h.GetCurrentUser)
	}
}

// Login handles user login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Get user from database
	user, err := h.repo.GetUserByEmail(c.Request.Context(), req.Email)
	if err != nil {
		h.logger.Error("Failed to get user", zap.Error(err), zap.String("email", req.Email))
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Check if user is active
	if !user.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Account is deactivated"})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		h.logger.Error("Invalid password", zap.Error(err), zap.String("email", req.Email))
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate tokens
	accessToken, err := h.jwtManager.GenerateAccessToken(user.ID, user.OrganizationID, user.Email, user.Role)
	if err != nil {
		h.logger.Error("Failed to generate access token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	refreshToken, err := h.jwtManager.GenerateRefreshToken(user.ID)
	if err != nil {
		h.logger.Error("Failed to generate refresh token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Update last login time
	if err := h.repo.UpdateUserLastLogin(c.Request.Context(), user.ID); err != nil {
		h.logger.Error("Failed to update last login", zap.Error(err))
		// Don't fail the login for this
	}

	// Create audit log
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	auditLog := &database.AuditLog{
		OrganizationID: user.OrganizationID,
		UserID:         &user.ID,
		Action:         "login",
		ResourceType:   "user",
		ResourceID:     &user.ID,
		IPAddress:      &ipAddress,
		UserAgent:      &userAgent,
	}
	if err := h.repo.CreateAuditLog(c.Request.Context(), auditLog); err != nil {
		h.logger.Error("Failed to create audit log", zap.Error(err))
		// Don't fail the login for this
	}

	// Remove password hash from response
	user.PasswordHash = ""

	response := LoginResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(15 * time.Minute.Seconds()), // 15 minutes
	}

	c.JSON(http.StatusOK, response)
}

// RefreshTokenRequest represents a refresh token request
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// RefreshToken handles token refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Generate new access token from refresh token
	newAccessToken, err := h.jwtManager.RefreshToken(req.RefreshToken)
	if err != nil {
		h.logger.Error("Failed to refresh token", zap.Error(err))
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	response := gin.H{
		"access_token": newAccessToken,
		"expires_in":   int64(15 * time.Minute.Seconds()),
	}

	c.JSON(http.StatusOK, response)
}

// Logout handles user logout
func (h *AuthHandler) Logout(c *gin.Context) {
	userID, exists := GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Create audit log
	orgID, _ := GetOrganizationIDFromContext(c)
	orgUUID, _ := uuid.Parse(orgID)
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	auditLog := &database.AuditLog{
		OrganizationID: orgUUID,
		UserID:         &userUUID,
		Action:         "logout",
		ResourceType:   "user",
		ResourceID:     &userUUID,
		IPAddress:      &ipAddress,
		UserAgent:      &userAgent,
	}
	if err := h.repo.CreateAuditLog(c.Request.Context(), auditLog); err != nil {
		h.logger.Error("Failed to create audit log", zap.Error(err))
		// Don't fail the logout for this
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// GetCurrentUser returns the current authenticated user
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
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

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}
