package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

// APIKey represents an API key in the system
type APIKey struct {
	ID             uuid.UUID         `db:"id" json:"id"`
	OrganizationID uuid.UUID         `db:"organization_id" json:"organization_id"`
	UserID         *uuid.UUID        `db:"user_id" json:"user_id,omitempty"`
	Name           string            `db:"name" json:"name"`
	Description    *string           `db:"description" json:"description,omitempty"`
	KeyPrefix      string            `db:"key_prefix" json:"key_prefix"` // First 8 chars for identification
	KeyHash        string            `db:"key_hash" json:"-"`           // SHA-256 hash of the full key
	Permissions    []string          `db:"permissions" json:"permissions"`
	RateLimit      int               `db:"rate_limit" json:"rate_limit"` // Requests per minute
	Scopes         []string          `db:"scopes" json:"scopes"`
	LastUsedAt     *time.Time        `db:"last_used_at" json:"last_used_at,omitempty"`
	LastUsedIP     *string           `db:"last_used_ip" json:"last_used_ip,omitempty"`
	ExpiresAt      *time.Time        `db:"expires_at" json:"expires_at,omitempty"`
	IsActive       bool              `db:"is_active" json:"is_active"`
	CreatedAt      time.Time         `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time         `db:"updated_at" json:"updated_at"`
	RevokedAt      *time.Time        `db:"revoked_at" json:"revoked_at,omitempty"`
	Metadata       map[string]string `db:"metadata" json:"metadata,omitempty"`
}

// APIKeyCreateRequest represents a request to create an API key
type APIKeyCreateRequest struct {
	Name        string   `json:"name" binding:"required,min=1,max=100"`
	Description string   `json:"description,omitempty"`
	Permissions []string `json:"permissions,omitempty"`
	Scopes      []string `json:"scopes,omitempty"`
	RateLimit   int      `json:"rate_limit,omitempty"` // 0 = use default
	ExpiresIn   int      `json:"expires_in,omitempty"` // Days until expiration, 0 = never
}

// APIKeyCreateResponse includes the plaintext key (only shown once)
type APIKeyCreateResponse struct {
	APIKey   *APIKey `json:"api_key"`
	PlainKey string  `json:"key"` // Only returned on creation
}

// APIKeyUpdateRequest represents a request to update an API key
type APIKeyUpdateRequest struct {
	Name        *string  `json:"name,omitempty"`
	Description *string  `json:"description,omitempty"`
	Permissions []string `json:"permissions,omitempty"`
	Scopes      []string `json:"scopes,omitempty"`
	RateLimit   *int     `json:"rate_limit,omitempty"`
	IsActive    *bool    `json:"is_active,omitempty"`
}

// APIKeyManager handles API key operations
type APIKeyManager struct {
	db     *sqlx.DB
	logger *zap.Logger
}

// NewAPIKeyManager creates a new API key manager
func NewAPIKeyManager(db *sqlx.DB, logger *zap.Logger) *APIKeyManager {
	return &APIKeyManager{
		db:     db,
		logger: logger,
	}
}

// GenerateAPIKey generates a new secure API key
func (m *APIKeyManager) GenerateAPIKey() (plainKey string, prefix string, hash string, err error) {
	// Generate 32 random bytes (256 bits)
	keyBytes := make([]byte, 32)
	if _, err := rand.Read(keyBytes); err != nil {
		return "", "", "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	// Encode as base64 URL-safe string
	plainKey = "mcp_" + base64.URLEncoding.EncodeToString(keyBytes)

	// Extract prefix (first 8 chars after the prefix)
	prefix = plainKey[4:12]

	// Hash the key for storage
	hashBytes := sha256.Sum256([]byte(plainKey))
	hash = hex.EncodeToString(hashBytes[:])

	return plainKey, prefix, hash, nil
}

// ValidateAPIKey validates an API key and returns the key record if valid
func (m *APIKeyManager) ValidateAPIKey(ctx context.Context, plainKey string) (*APIKey, error) {
	// Extract prefix for quick lookup
	if len(plainKey) < 12 || !strings.HasPrefix(plainKey, "mcp_") {
		return nil, fmt.Errorf("invalid API key format")
	}

	prefix := plainKey[4:12]

	// Hash the provided key
	hashBytes := sha256.Sum256([]byte(plainKey))
	keyHash := hex.EncodeToString(hashBytes[:])

	// Look up by prefix and verify hash
	var apiKey APIKey
	query := `
		SELECT * FROM api_keys 
		WHERE key_prefix = $1 
		AND is_active = true 
		AND (expires_at IS NULL OR expires_at > NOW())
		AND revoked_at IS NULL
	`

	err := m.db.GetContext(ctx, &apiKey, query, prefix)
	if err != nil {
		return nil, fmt.Errorf("API key not found or invalid")
	}

	// Constant-time comparison of hashes
	if subtle.ConstantTimeCompare([]byte(keyHash), []byte(apiKey.KeyHash)) != 1 {
		return nil, fmt.Errorf("API key not found or invalid")
	}

	// Update last used timestamp
	go m.updateLastUsed(context.Background(), apiKey.ID, "")

	return &apiKey, nil
}

// Create creates a new API key
func (m *APIKeyManager) Create(ctx context.Context, orgID uuid.UUID, userID *uuid.UUID, req *APIKeyCreateRequest) (*APIKeyCreateResponse, error) {
	// Generate the key
	plainKey, prefix, hash, err := m.GenerateAPIKey()
	if err != nil {
		return nil, err
	}

	// Set defaults
	rateLimit := req.RateLimit
	if rateLimit <= 0 {
		rateLimit = 100 // Default rate limit
	}

	permissions := req.Permissions
	if permissions == nil {
		permissions = []string{"read"} // Default permissions
	}

	scopes := req.Scopes
	if scopes == nil {
		scopes = []string{"servers:read"} // Default scopes
	}

	// Calculate expiration
	var expiresAt *time.Time
	if req.ExpiresIn > 0 {
		exp := time.Now().AddDate(0, 0, req.ExpiresIn)
		expiresAt = &exp
	}

	apiKey := &APIKey{
		ID:             uuid.New(),
		OrganizationID: orgID,
		UserID:         userID,
		Name:           req.Name,
		KeyPrefix:      prefix,
		KeyHash:        hash,
		Permissions:    permissions,
		Scopes:         scopes,
		RateLimit:      rateLimit,
		ExpiresAt:      expiresAt,
		IsActive:       true,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if req.Description != "" {
		apiKey.Description = &req.Description
	}

	// Insert into database
	query := `
		INSERT INTO api_keys (
			id, organization_id, user_id, name, description, key_prefix, key_hash,
			permissions, scopes, rate_limit, expires_at, is_active, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
		)
	`

	_, err = m.db.ExecContext(ctx, query,
		apiKey.ID, apiKey.OrganizationID, apiKey.UserID, apiKey.Name, apiKey.Description,
		apiKey.KeyPrefix, apiKey.KeyHash, apiKey.Permissions, apiKey.Scopes,
		apiKey.RateLimit, apiKey.ExpiresAt, apiKey.IsActive, apiKey.CreatedAt, apiKey.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create API key: %w", err)
	}

	m.logger.Info("API key created",
		zap.String("key_id", apiKey.ID.String()),
		zap.String("name", apiKey.Name),
		zap.String("org_id", orgID.String()),
	)

	return &APIKeyCreateResponse{
		APIKey:   apiKey,
		PlainKey: plainKey,
	}, nil
}

// Get retrieves an API key by ID
func (m *APIKeyManager) Get(ctx context.Context, keyID uuid.UUID) (*APIKey, error) {
	var apiKey APIKey
	query := `SELECT * FROM api_keys WHERE id = $1 AND revoked_at IS NULL`

	err := m.db.GetContext(ctx, &apiKey, query, keyID)
	if err != nil {
		return nil, fmt.Errorf("API key not found: %w", err)
	}

	return &apiKey, nil
}

// List retrieves all API keys for an organization
func (m *APIKeyManager) List(ctx context.Context, orgID uuid.UUID, includeRevoked bool) ([]*APIKey, error) {
	var apiKeys []*APIKey
	var query string

	if includeRevoked {
		query = `SELECT * FROM api_keys WHERE organization_id = $1 ORDER BY created_at DESC`
	} else {
		query = `SELECT * FROM api_keys WHERE organization_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC`
	}

	err := m.db.SelectContext(ctx, &apiKeys, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list API keys: %w", err)
	}

	return apiKeys, nil
}

// Update updates an API key
func (m *APIKeyManager) Update(ctx context.Context, keyID uuid.UUID, req *APIKeyUpdateRequest) (*APIKey, error) {
	// Build dynamic update query
	updates := []string{}
	args := []interface{}{}
	argNum := 1

	if req.Name != nil {
		updates = append(updates, fmt.Sprintf("name = $%d", argNum))
		args = append(args, *req.Name)
		argNum++
	}
	if req.Description != nil {
		updates = append(updates, fmt.Sprintf("description = $%d", argNum))
		args = append(args, *req.Description)
		argNum++
	}
	if req.Permissions != nil {
		updates = append(updates, fmt.Sprintf("permissions = $%d", argNum))
		args = append(args, req.Permissions)
		argNum++
	}
	if req.Scopes != nil {
		updates = append(updates, fmt.Sprintf("scopes = $%d", argNum))
		args = append(args, req.Scopes)
		argNum++
	}
	if req.RateLimit != nil {
		updates = append(updates, fmt.Sprintf("rate_limit = $%d", argNum))
		args = append(args, *req.RateLimit)
		argNum++
	}
	if req.IsActive != nil {
		updates = append(updates, fmt.Sprintf("is_active = $%d", argNum))
		args = append(args, *req.IsActive)
		argNum++
	}

	if len(updates) == 0 {
		return m.Get(ctx, keyID)
	}

	updates = append(updates, fmt.Sprintf("updated_at = $%d", argNum))
	args = append(args, time.Now())
	argNum++

	args = append(args, keyID)

	query := fmt.Sprintf(`
		UPDATE api_keys 
		SET %s 
		WHERE id = $%d AND revoked_at IS NULL
		RETURNING *
	`, strings.Join(updates, ", "), argNum)

	var apiKey APIKey
	err := m.db.GetContext(ctx, &apiKey, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update API key: %w", err)
	}

	m.logger.Info("API key updated",
		zap.String("key_id", keyID.String()),
	)

	return &apiKey, nil
}

// Revoke revokes an API key
func (m *APIKeyManager) Revoke(ctx context.Context, keyID uuid.UUID) error {
	now := time.Now()
	query := `
		UPDATE api_keys 
		SET is_active = false, revoked_at = $1, updated_at = $1
		WHERE id = $2 AND revoked_at IS NULL
	`

	result, err := m.db.ExecContext(ctx, query, now, keyID)
	if err != nil {
		return fmt.Errorf("failed to revoke API key: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("API key not found or already revoked")
	}

	m.logger.Info("API key revoked",
		zap.String("key_id", keyID.String()),
	)

	return nil
}

// RegenerateKey regenerates the secret for an existing API key
func (m *APIKeyManager) RegenerateKey(ctx context.Context, keyID uuid.UUID) (*APIKeyCreateResponse, error) {
	// Get existing key
	existingKey, err := m.Get(ctx, keyID)
	if err != nil {
		return nil, err
	}

	// Generate new key
	plainKey, prefix, hash, err := m.GenerateAPIKey()
	if err != nil {
		return nil, err
	}

	// Update the key
	query := `
		UPDATE api_keys 
		SET key_prefix = $1, key_hash = $2, updated_at = $3
		WHERE id = $4
		RETURNING *
	`

	var apiKey APIKey
	err = m.db.GetContext(ctx, &apiKey, query, prefix, hash, time.Now(), keyID)
	if err != nil {
		return nil, fmt.Errorf("failed to regenerate API key: %w", err)
	}

	m.logger.Info("API key regenerated",
		zap.String("key_id", keyID.String()),
		zap.String("name", existingKey.Name),
	)

	return &APIKeyCreateResponse{
		APIKey:   &apiKey,
		PlainKey: plainKey,
	}, nil
}

// updateLastUsed updates the last used timestamp for an API key
func (m *APIKeyManager) updateLastUsed(ctx context.Context, keyID uuid.UUID, ip string) {
	query := `UPDATE api_keys SET last_used_at = $1, last_used_ip = $2 WHERE id = $3`
	_, err := m.db.ExecContext(ctx, query, time.Now(), ip, keyID)
	if err != nil {
		m.logger.Error("Failed to update API key last used",
			zap.String("key_id", keyID.String()),
			zap.Error(err),
		)
	}
}

// CleanupExpiredKeys removes expired API keys
func (m *APIKeyManager) CleanupExpiredKeys(ctx context.Context) (int64, error) {
	query := `
		UPDATE api_keys 
		SET is_active = false, revoked_at = NOW()
		WHERE expires_at < NOW() AND is_active = true AND revoked_at IS NULL
	`

	result, err := m.db.ExecContext(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("failed to cleanup expired keys: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows > 0 {
		m.logger.Info("Expired API keys cleaned up", zap.Int64("count", rows))
	}

	return rows, nil
}

// APIKeyHandler handles API key HTTP endpoints
type APIKeyHandler struct {
	manager *APIKeyManager
	logger  *zap.Logger
}

// NewAPIKeyHandler creates a new API key handler
func NewAPIKeyHandler(manager *APIKeyManager, logger *zap.Logger) *APIKeyHandler {
	return &APIKeyHandler{
		manager: manager,
		logger:  logger,
	}
}

// CreateKey handles POST /api/v1/api-keys
func (h *APIKeyHandler) CreateKey(c *gin.Context) {
	orgIDStr := c.GetString("organization_id")
	if orgIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Organization ID required"})
		return
	}

	orgID, err := uuid.Parse(orgIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	userIDStr := c.GetString("user_id")
	var userID *uuid.UUID
	if userIDStr != "" {
		if id, err := uuid.Parse(userIDStr); err == nil {
			userID = &id
		}
	}

	var req APIKeyCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	response, err := h.manager.Create(c.Request.Context(), orgID, userID, &req)
	if err != nil {
		h.logger.Error("Failed to create API key", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create API key"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "API key created successfully. Save the key - it won't be shown again.",
		"data":    response,
	})
}

// ListKeys handles GET /api/v1/api-keys
func (h *APIKeyHandler) ListKeys(c *gin.Context) {
	orgIDStr := c.GetString("organization_id")
	if orgIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Organization ID required"})
		return
	}

	orgID, err := uuid.Parse(orgIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	includeRevoked := c.Query("include_revoked") == "true"

	keys, err := h.manager.List(c.Request.Context(), orgID, includeRevoked)
	if err != nil {
		h.logger.Error("Failed to list API keys", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list API keys"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"api_keys": keys,
		"count":    len(keys),
	})
}

// GetKey handles GET /api/v1/api-keys/:id
func (h *APIKeyHandler) GetKey(c *gin.Context) {
	keyIDStr := c.Param("id")
	keyID, err := uuid.Parse(keyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid API key ID"})
		return
	}

	apiKey, err := h.manager.Get(c.Request.Context(), keyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "API key not found"})
		return
	}

	c.JSON(http.StatusOK, apiKey)
}

// UpdateKey handles PUT /api/v1/api-keys/:id
func (h *APIKeyHandler) UpdateKey(c *gin.Context) {
	keyIDStr := c.Param("id")
	keyID, err := uuid.Parse(keyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid API key ID"})
		return
	}

	var req APIKeyUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	apiKey, err := h.manager.Update(c.Request.Context(), keyID, &req)
	if err != nil {
		h.logger.Error("Failed to update API key", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update API key"})
		return
	}

	c.JSON(http.StatusOK, apiKey)
}

// RevokeKey handles DELETE /api/v1/api-keys/:id
func (h *APIKeyHandler) RevokeKey(c *gin.Context) {
	keyIDStr := c.Param("id")
	keyID, err := uuid.Parse(keyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid API key ID"})
		return
	}

	err = h.manager.Revoke(c.Request.Context(), keyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "API key revoked successfully"})
}

// RegenerateKey handles POST /api/v1/api-keys/:id/regenerate
func (h *APIKeyHandler) RegenerateKey(c *gin.Context) {
	keyIDStr := c.Param("id")
	keyID, err := uuid.Parse(keyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid API key ID"})
		return
	}

	response, err := h.manager.RegenerateKey(c.Request.Context(), keyID)
	if err != nil {
		h.logger.Error("Failed to regenerate API key", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to regenerate API key"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "API key regenerated successfully. Save the new key - it won't be shown again.",
		"data":    response,
	})
}

// RegisterRoutes registers API key routes
func (h *APIKeyHandler) RegisterRoutes(group *gin.RouterGroup) {
	apiKeysGroup := group.Group("/api-keys")
	{
		apiKeysGroup.POST("", h.CreateKey)
		apiKeysGroup.GET("", h.ListKeys)
		apiKeysGroup.GET("/:id", h.GetKey)
		apiKeysGroup.PUT("/:id", h.UpdateKey)
		apiKeysGroup.DELETE("/:id", h.RevokeKey)
		apiKeysGroup.POST("/:id/regenerate", h.RegenerateKey)
	}
}

// APIKeyMiddleware validates API keys in request headers
func APIKeyMiddleware(manager *APIKeyManager, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip auth for public endpoints
		if c.Request.URL.Path == "/health" ||
			strings.HasPrefix(c.Request.URL.Path, "/api/v1/auth/") {
			c.Next()
			return
		}

		// Try to get API key from header
		apiKey := c.GetHeader("X-API-Key")
		if apiKey == "" {
			// Try Authorization header with Bearer scheme
			auth := c.GetHeader("Authorization")
			if strings.HasPrefix(auth, "Bearer mcp_") {
				apiKey = strings.TrimPrefix(auth, "Bearer ")
			}
		}

		if apiKey == "" {
			c.Next() // Let other auth methods handle it
			return
		}

		// Validate the API key
		key, err := manager.ValidateAPIKey(c.Request.Context(), apiKey)
		if err != nil {
			logger.Warn("Invalid API key",
				zap.String("ip", c.ClientIP()),
				zap.String("path", c.Request.URL.Path),
			)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired API key",
				"code":  "INVALID_API_KEY",
			})
			c.Abort()
			return
		}

		// Set context values for downstream handlers
		c.Set("api_key_id", key.ID.String())
		c.Set("organization_id", key.OrganizationID.String())
		if key.UserID != nil {
			c.Set("user_id", key.UserID.String())
		}
		c.Set("api_key_permissions", key.Permissions)
		c.Set("api_key_scopes", key.Scopes)
		c.Set("api_key_rate_limit", key.RateLimit)
		c.Set("authenticated", true)
		c.Set("auth_method", "api_key")

		// Update last used IP
		go manager.updateLastUsed(context.Background(), key.ID, c.ClientIP())

		c.Next()
	}
}
