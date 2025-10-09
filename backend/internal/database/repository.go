package database

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

// Repository handles database operations
type Repository struct {
	db     *sqlx.DB
	logger *zap.Logger
}

// NewRepository creates a new repository
func NewRepository(db *sqlx.DB, logger *zap.Logger) *Repository {
	return &Repository{
		db:     db,
		logger: logger,
	}
}

// Organization operations

// CreateOrganization creates a new organization
func (r *Repository) CreateOrganization(ctx context.Context, req *CreateOrganizationRequest) (*Organization, error) {
	org := &Organization{
		ID:          uuid.New(),
		Name:        req.Name,
		Slug:        req.Slug,
		Email:       req.Email,
		Description: req.Description,
		Settings:    JSONB{},
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	query := `
		INSERT INTO organizations (id, name, slug, email, description, settings, created_at, updated_at)
		VALUES (:id, :name, :slug, :email, :description, :settings, :created_at, :updated_at)
		RETURNING *
	`

	rows, err := r.db.NamedQueryContext(ctx, query, org)
	if err != nil {
		return nil, fmt.Errorf("failed to create organization: %w", err)
	}
	defer rows.Close()

	if rows.Next() {
		if err := rows.StructScan(org); err != nil {
			return nil, fmt.Errorf("failed to scan organization: %w", err)
		}
	}

	return org, nil
}

// GetOrganizationByID retrieves an organization by ID
func (r *Repository) GetOrganizationByID(ctx context.Context, id uuid.UUID) (*Organization, error) {
	var org Organization
	query := `SELECT * FROM organizations WHERE id = $1 AND deleted_at IS NULL`
	
	err := r.db.GetContext(ctx, &org, query, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get organization: %w", err)
	}

	return &org, nil
}

// GetOrganizationBySlug retrieves an organization by slug
func (r *Repository) GetOrganizationBySlug(ctx context.Context, slug string) (*Organization, error) {
	var org Organization
	query := `SELECT * FROM organizations WHERE slug = $1 AND deleted_at IS NULL`
	
	err := r.db.GetContext(ctx, &org, query, slug)
	if err != nil {
		return nil, fmt.Errorf("failed to get organization by slug: %w", err)
	}

	return &org, nil
}

// User operations

// CreateUser creates a new user
func (r *Repository) CreateUser(ctx context.Context, req *CreateUserRequest, passwordHash string) (*User, error) {
	user := &User{
		ID:             uuid.New(),
		OrganizationID: req.OrganizationID,
		Email:          req.Email,
		Name:           req.Name,
		PasswordHash:   passwordHash,
		Role:           req.Role,
		IsActive:       true,
		Preferences:    JSONB{},
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	query := `
		INSERT INTO users (id, organization_id, email, name, password_hash, role, is_active, preferences, created_at, updated_at)
		VALUES (:id, :organization_id, :email, :name, :password_hash, :role, :is_active, :preferences, :created_at, :updated_at)
		RETURNING *
	`

	rows, err := r.db.NamedQueryContext(ctx, query, user)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	defer rows.Close()

	if rows.Next() {
		if err := rows.StructScan(user); err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
	}

	return user, nil
}

// GetUserByEmail retrieves a user by email
func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	var user User
	query := `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`
	
	err := r.db.GetContext(ctx, &user, query, email)
	if err != nil {
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	return &user, nil
}

// GetUserByID retrieves a user by ID
func (r *Repository) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	var user User
	query := `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`
	
	err := r.db.GetContext(ctx, &user, query, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}

	return &user, nil
}

// UpdateUserLastLogin updates the user's last login time
func (r *Repository) UpdateUserLastLogin(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`
	
	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to update user last login: %w", err)
	}

	return nil
}

// MCP Server operations

// CreateMCPServer creates a new MCP server
func (r *Repository) CreateMCPServer(ctx context.Context, req *CreateMCPServerRequest) (*MCPServer, error) {
	server := &MCPServer{
		ID:             uuid.New(),
		OrganizationID: req.OrganizationID,
		Name:           req.Name,
		URL:            req.URL,
		Description:    req.Description,
		Type:           req.Type,
		Status:         "unknown",
		Capabilities:   JSONBArray{},
		Metadata:       JSONB{},
		CreatedBy:      &req.CreatedBy,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	query := `
		INSERT INTO mcp_servers (id, organization_id, name, url, description, type, status, capabilities, metadata, created_by, created_at, updated_at)
		VALUES (:id, :organization_id, :name, :url, :description, :type, :status, :capabilities, :metadata, :created_by, :created_at, :updated_at)
		RETURNING *
	`

	rows, err := r.db.NamedQueryContext(ctx, query, server)
	if err != nil {
		return nil, fmt.Errorf("failed to create MCP server: %w", err)
	}
	defer rows.Close()

	if rows.Next() {
		if err := rows.StructScan(server); err != nil {
			return nil, fmt.Errorf("failed to scan MCP server: %w", err)
		}
	}

	return server, nil
}

// GetMCPServerByID retrieves an MCP server by ID
func (r *Repository) GetMCPServerByID(ctx context.Context, id uuid.UUID) (*MCPServer, error) {
	var server MCPServer
	query := `SELECT * FROM mcp_servers WHERE id = $1 AND deleted_at IS NULL`
	
	err := r.db.GetContext(ctx, &server, query, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get MCP server: %w", err)
	}

	return &server, nil
}

// ListMCPServers retrieves MCP servers for an organization
func (r *Repository) ListMCPServers(ctx context.Context, organizationID uuid.UUID, limit, offset int) ([]*MCPServer, error) {
	var servers []*MCPServer
	query := `
		SELECT * FROM mcp_servers 
		WHERE organization_id = $1 AND deleted_at IS NULL 
		ORDER BY created_at DESC 
		LIMIT $2 OFFSET $3
	`
	
	err := r.db.SelectContext(ctx, &servers, query, organizationID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list MCP servers: %w", err)
	}

	return servers, nil
}

// UpdateMCPServerStatus updates the status of an MCP server
func (r *Repository) UpdateMCPServerStatus(ctx context.Context, id uuid.UUID, status string, responseTimeMs *int, errorMessage *string) error {
	now := time.Now()
	
	// Update server status
	query := `
		UPDATE mcp_servers 
		SET status = $2, last_checked_at = $3, response_time_ms = $4, updated_at = $3
		WHERE id = $1
	`
	
	_, err := r.db.ExecContext(ctx, query, id, status, now, responseTimeMs)
	if err != nil {
		return fmt.Errorf("failed to update MCP server status: %w", err)
	}

	// Add to status history
	historyQuery := `
		INSERT INTO server_status_history (id, server_id, status, response_time_ms, error_message, checked_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	
	_, err = r.db.ExecContext(ctx, historyQuery, uuid.New(), id, status, responseTimeMs, errorMessage, now)
	if err != nil {
		r.logger.Error("Failed to insert status history", zap.Error(err))
		// Don't fail the main operation for history logging
	}

	return nil
}

// DeleteMCPServer soft deletes an MCP server
func (r *Repository) DeleteMCPServer(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE mcp_servers SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`
	
	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete MCP server: %w", err)
	}

	return nil
}

// Alert operations

// CreateAlert creates a new alert
func (r *Repository) CreateAlert(ctx context.Context, alert *Alert) error {
	alert.ID = uuid.New()
	alert.CreatedAt = time.Now()
	alert.UpdatedAt = time.Now()

	query := `
		INSERT INTO alerts (id, organization_id, server_id, type, severity, title, message, is_read, metadata, created_at, updated_at)
		VALUES (:id, :organization_id, :server_id, :type, :severity, :title, :message, :is_read, :metadata, :created_at, :updated_at)
	`

	_, err := r.db.NamedExecContext(ctx, query, alert)
	if err != nil {
		return fmt.Errorf("failed to create alert: %w", err)
	}

	return nil
}

// ListAlerts retrieves alerts for an organization
func (r *Repository) ListAlerts(ctx context.Context, organizationID uuid.UUID, limit, offset int) ([]*Alert, error) {
	var alerts []*Alert
	query := `
		SELECT * FROM alerts 
		WHERE organization_id = $1 
		ORDER BY created_at DESC 
		LIMIT $2 OFFSET $3
	`
	
	err := r.db.SelectContext(ctx, &alerts, query, organizationID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list alerts: %w", err)
	}

	return alerts, nil
}

// Audit log operations

// CreateAuditLog creates a new audit log entry
func (r *Repository) CreateAuditLog(ctx context.Context, log *AuditLog) error {
	log.ID = uuid.New()
	log.CreatedAt = time.Now()

	query := `
		INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
		VALUES (:id, :organization_id, :user_id, :action, :resource_type, :resource_id, :details, :ip_address, :user_agent, :created_at)
	`

	_, err := r.db.NamedExecContext(ctx, query, log)
	if err != nil {
		return fmt.Errorf("failed to create audit log: %w", err)
	}

	return nil
}

// MCP Server operations

// GetMCPServer retrieves an MCP server by ID
func (r *Repository) GetMCPServer(ctx context.Context, serverID string) (*MCPServer, error) {
	query := `
		SELECT id, organization_id, name, url, description, type, version, capabilities, 
		       status, last_checked_at, response_time_ms, created_at, updated_at
		FROM mcp_servers 
		WHERE id = $1 AND deleted_at IS NULL
	`

	var server MCPServer
	err := r.db.GetContext(ctx, &server, query, serverID)
	if err != nil {
		return nil, fmt.Errorf("failed to get MCP server: %w", err)
	}

	return &server, nil
}

// ListActiveMCPServers retrieves all active MCP servers
func (r *Repository) ListActiveMCPServers(ctx context.Context) ([]*MCPServer, error) {
	query := `
		SELECT id, organization_id, name, url, description, type, version, capabilities, 
		       status, last_checked_at, response_time_ms, created_at, updated_at
		FROM mcp_servers 
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC
	`

	var servers []*MCPServer
	err := r.db.SelectContext(ctx, &servers, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list MCP servers: %w", err)
	}

	return servers, nil
}


// ResolveAlert resolves an alert
func (r *Repository) ResolveAlert(ctx context.Context, alertID, userID string) error {
	query := `
		UPDATE alerts 
		SET is_resolved = true, resolved_by = $2, resolved_at = $3, updated_at = $3
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query, alertID, userID, time.Now())
	if err != nil {
		return fmt.Errorf("failed to resolve alert: %w", err)
	}

	return nil
}
