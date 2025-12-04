package auth

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// NeonAuthUser represents user information from Neon Auth
type NeonAuthUser struct {
	ID              string                 `json:"id"`
	Email           string                 `json:"email"`
	DisplayName     string                 `json:"display_name"`
	Username        string                 `json:"username"`
	ProfileImage    string                 `json:"profile_image"`
	EmailVerified   bool                   `json:"email_verified"`
	CreatedAt       string                 `json:"created_at"`
	LastSignedIn    string                 `json:"last_signed_in"`
	RawUserMetaData map[string]interface{} `json:"raw_user_meta_data"`
	RawAppMetaData  map[string]interface{} `json:"raw_app_meta_data"`
}

// NeonAuthHandler handles Neon Auth-based authentication
type NeonAuthHandler struct {
	projectID      string
	publishableKey string
	secretKey      string
	logger         *zap.Logger
	httpClient     *http.Client
}

// NewNeonAuthHandler creates a new Neon Auth handler
func NewNeonAuthHandler(projectID, publishableKey, secretKey string, logger *zap.Logger) *NeonAuthHandler {
	return &NeonAuthHandler{
		projectID:      projectID,
		publishableKey: publishableKey,
		secretKey:      secretKey,
		logger:         logger,
		httpClient:     &http.Client{},
	}
}

// RegisterRoutes registers Neon Auth authentication routes
func (h *NeonAuthHandler) RegisterRoutes(router *gin.RouterGroup) {
	auth := router.Group("/auth")
	{
		auth.POST("/neon/verify", h.VerifyToken)
		auth.GET("/me", h.GetCurrentUser)
		auth.POST("/neon/sign-out", h.SignOut)
	}
}

// NeonAuthMiddleware validates Neon Auth JWT tokens
func (h *NeonAuthHandler) NeonAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip public endpoints
		if c.Request.Method == "OPTIONS" || c.Request.URL.Path == "/health" ||
			strings.HasPrefix(c.Request.URL.Path, "/api/v1/auth/") {
			c.Next()
			return
		}

		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Check if header starts with "Bearer "
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		token := tokenParts[1]

		// Verify token with Neon Auth
		user, err := h.verifyTokenWithNeon(token)
		if err != nil {
			h.logger.Error("Token verification failed", zap.Error(err))
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("neon_user", user)
		c.Set("user_id", user.ID)
		c.Set("user_email", user.Email)
		c.Set("authenticated", true)

		h.logger.Info("User authenticated via Neon Auth",
			zap.String("user_id", user.ID),
			zap.String("email", user.Email))

		c.Next()
	}
}

// verifyTokenWithNeon verifies a JWT token with Neon Auth service
func (h *NeonAuthHandler) verifyTokenWithNeon(token string) (*NeonAuthUser, error) {
	// Neon Auth API endpoint for token verification
	url := fmt.Sprintf("https://api.neon.tech/auth/v1/verify?project_id=%s", h.projectID)

	// Create request payload
	payload := map[string]string{
		"token": token,
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", h.secretKey))
	req.Header.Set("apikey", h.publishableKey)

	// Make request
	resp, err := h.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to verify token: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token verification failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var user NeonAuthUser
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, fmt.Errorf("failed to parse user data: %w", err)
	}

	return &user, nil
}

// VerifyToken handles token verification requests
func (h *NeonAuthHandler) VerifyToken(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	user, err := h.verifyTokenWithNeon(req.Token)
	if err != nil {
		h.logger.Error("Token verification failed", zap.Error(err))
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid": true,
		"user":  user,
	})
}

// GetCurrentUser returns the current authenticated user
func (h *NeonAuthHandler) GetCurrentUser(c *gin.Context) {
	// Get Neon Auth user information
	neonUser, exists := h.GetNeonUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated via Neon Auth"})
		return
	}

	// Return Neon Auth user information
	c.JSON(http.StatusOK, gin.H{
		"id":             neonUser.ID,
		"email":          neonUser.Email,
		"display_name":   neonUser.DisplayName,
		"username":       neonUser.Username,
		"profile_image":  neonUser.ProfileImage,
		"email_verified": neonUser.EmailVerified,
		"created_at":     neonUser.CreatedAt,
		"last_signed_in": neonUser.LastSignedIn,
		"auth_method":    "neon_auth",
	})
}

// SignOut handles user sign out
func (h *NeonAuthHandler) SignOut(c *gin.Context) {
	// For Neon Auth, sign out is typically handled on the client side
	// We can just return success here
	c.JSON(http.StatusOK, gin.H{
		"message": "Signed out successfully",
	})
}

// GetNeonUserFromContext retrieves Neon Auth user from context
func (h *NeonAuthHandler) GetNeonUserFromContext(c *gin.Context) (*NeonAuthUser, bool) {
	user, exists := c.Get("neon_user")
	if !exists {
		return nil, false
	}

	neonUser, ok := user.(*NeonAuthUser)
	if !ok {
		return nil, false
	}

	return neonUser, true
}

// GetUserByID retrieves a user by ID from Neon Auth
func (h *NeonAuthHandler) GetUserByID(userID string) (*NeonAuthUser, error) {
	url := fmt.Sprintf("https://api.neon.tech/auth/v1/admin/users/%s?project_id=%s", userID, h.projectID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", h.secretKey))
	req.Header.Set("apikey", h.publishableKey)

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get user with status %d: %s", resp.StatusCode, string(body))
	}

	var user NeonAuthUser
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, fmt.Errorf("failed to parse user data: %w", err)
	}

	return &user, nil
}

// ListUsers retrieves all users from Neon Auth
func (h *NeonAuthHandler) ListUsers() ([]*NeonAuthUser, error) {
	url := fmt.Sprintf("https://api.neon.tech/auth/v1/admin/users?project_id=%s", h.projectID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", h.secretKey))
	req.Header.Set("apikey", h.publishableKey)

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to list users with status %d: %s", resp.StatusCode, string(body))
	}

	var users []*NeonAuthUser
	if err := json.Unmarshal(body, &users); err != nil {
		return nil, fmt.Errorf("failed to parse users data: %w", err)
	}

	return users, nil
}
