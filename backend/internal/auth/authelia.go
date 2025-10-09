package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AutheliaUser represents user information from Authelia headers
type AutheliaUser struct {
	Username    string   `json:"username"`
	DisplayName string   `json:"display_name"`
	Email       string   `json:"email"`
	Groups      []string `json:"groups"`
}

// AutheliaMiddleware extracts user information from Authelia headers
func AutheliaMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract user information from Authelia headers
		username := c.GetHeader("Remote-User")
		displayName := c.GetHeader("Remote-Name")
		email := c.GetHeader("Remote-Email")
		groupsHeader := c.GetHeader("Remote-Groups")

		// If no username header, user is not authenticated
		if username == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			c.Abort()
			return
		}

		// Parse groups from comma-separated string
		var groups []string
		if groupsHeader != "" {
			groups = strings.Split(groupsHeader, ",")
			// Trim whitespace from each group
			for i, group := range groups {
				groups[i] = strings.TrimSpace(group)
			}
		}

		// Create user object
		user := AutheliaUser{
			Username:    username,
			DisplayName: displayName,
			Email:       email,
			Groups:      groups,
		}

		// Set user in context
		c.Set("authelia_user", user)
		c.Set("user_id", username)
		c.Set("user_email", email)
		c.Set("user_groups", groups)

		logger.Info("User authenticated via Authelia",
			zap.String("username", username),
			zap.String("email", email),
			zap.Strings("groups", groups))

		c.Next()
	}
}

// GetAutheliaUserFromContext retrieves Authelia user from context
func GetAutheliaUserFromContext(c *gin.Context) (AutheliaUser, bool) {
	user, exists := c.Get("authelia_user")
	if !exists {
		return AutheliaUser{}, false
	}

	autheliaUser, ok := user.(AutheliaUser)
	if !ok {
		return AutheliaUser{}, false
	}

	return autheliaUser, true
}

// HasGroup checks if user has a specific group
func HasGroup(c *gin.Context, group string) bool {
	user, exists := GetAutheliaUserFromContext(c)
	if !exists {
		return false
	}

	for _, userGroup := range user.Groups {
		if userGroup == group {
			return true
		}
	}

	return false
}

// IsAdmin checks if user is an admin
func IsAdmin(c *gin.Context) bool {
	return HasGroup(c, "admins")
}





