package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/radhi1991/aran-mcp-sentinel/internal/database"
	"github.com/radhi1991/aran-mcp-sentinel/internal/models"
)

// MCPRepositoryAdapter adapts the PostgreSQL repository to the MCP handler interface
type MCPRepositoryAdapter struct {
	db *database.Repository
}

// NewMCPRepositoryAdapter creates a new MCP repository adapter
func NewMCPRepositoryAdapter(db *database.Repository) *MCPRepositoryAdapter {
	return &MCPRepositoryAdapter{
		db: db,
	}
}

// ListActiveServers returns all active MCP servers
func (r *MCPRepositoryAdapter) ListActiveServers(ctx context.Context) ([]models.MCPServer, error) {
	servers, err := r.db.ListActiveMCPServers(ctx)
	if err != nil {
		return nil, err
	}

	// Convert []*database.MCPServer to []models.MCPServer
	result := make([]models.MCPServer, len(servers))
	for i, server := range servers {
		description := ""
		if server.Description != nil {
			description = *server.Description
		}

		capabilities := make([]string, len(server.Capabilities))
		for j, cap := range server.Capabilities {
			if str, ok := cap.(string); ok {
				capabilities[j] = str
			}
		}

		version := ""
		if server.Version != nil {
			version = *server.Version
		}

		lastChecked := time.Now()
		if server.LastCheckedAt != nil {
			lastChecked = *server.LastCheckedAt
		}

		responseTime := int64(0)
		if server.ResponseTimeMs != nil {
			responseTime = int64(*server.ResponseTimeMs)
		}

		uptimePercentage := 0.0
		if server.UptimePercentage != nil {
			uptimePercentage = *server.UptimePercentage
		}

		result[i] = models.MCPServer{
			ID:               server.ID,
			Name:             server.Name,
			URL:              server.URL,
			Description:      description,
			Type:             server.Type,
			Status:           server.Status,
			Version:          version,
			Capabilities:     capabilities,
			OrganizationID:   server.OrganizationID,
			Metadata:         server.Metadata,
			IsActive:         true, // Assume active since we're listing active servers
			LastChecked:      lastChecked,
			ResponseTime:     responseTime,
			UptimePercentage: uptimePercentage,
			LastCheckedAt:    lastChecked,
			CreatedAt:        server.CreatedAt,
			UpdatedAt:        server.UpdatedAt,
			DeletedAt:        server.DeletedAt,
		}
	}

	return result, nil
}

// GetServer retrieves an MCP server by ID
func (r *MCPRepositoryAdapter) GetServer(ctx context.Context, id uuid.UUID) (*models.MCPServer, error) {
	server, err := r.db.GetMCPServerByID(ctx, id)
	if err != nil {
		return nil, err
	}

	description := ""
	if server.Description != nil {
		description = *server.Description
	}

	capabilities := make([]string, len(server.Capabilities))
	for j, cap := range server.Capabilities {
		if str, ok := cap.(string); ok {
			capabilities[j] = str
		}
	}

	version := ""
	if server.Version != nil {
		version = *server.Version
	}

	lastChecked := time.Now()
	if server.LastCheckedAt != nil {
		lastChecked = *server.LastCheckedAt
	}

	responseTime := int64(0)
	if server.ResponseTimeMs != nil {
		responseTime = int64(*server.ResponseTimeMs)
	}

	uptimePercentage := 0.0
	if server.UptimePercentage != nil {
		uptimePercentage = *server.UptimePercentage
	}

	return &models.MCPServer{
		ID:               server.ID,
		Name:             server.Name,
		URL:              server.URL,
		Description:      description,
		Type:             server.Type,
		Status:           server.Status,
		Version:          version,
		Capabilities:     capabilities,
		OrganizationID:   server.OrganizationID,
		Metadata:         server.Metadata,
		IsActive:         true, // Assume active if not deleted
		LastChecked:      lastChecked,
		ResponseTime:     responseTime,
		UptimePercentage: uptimePercentage,
		LastCheckedAt:    lastChecked,
		CreatedAt:        server.CreatedAt,
		UpdatedAt:        server.UpdatedAt,
		DeletedAt:        server.DeletedAt,
	}, nil
}

// CreateServer adds a new MCP server to the database
func (r *MCPRepositoryAdapter) CreateServer(ctx context.Context, server *models.MCPServer) error {
	// Get the default organization if organization_id is not set
	orgID := server.OrganizationID
	if orgID == uuid.Nil {
		defaultOrg, err := r.db.GetOrganizationBySlug(ctx, "default")
		if err != nil {
			return fmt.Errorf("failed to get default organization: %w", err)
		}
		orgID = defaultOrg.ID
	}

	description := &server.Description
	if server.Description == "" {
		description = nil
	}

	serverType := server.Type
	if serverType == "" {
		serverType = "custom"
	}

	req := &database.CreateMCPServerRequest{
		OrganizationID: orgID,
		Name:           server.Name,
		URL:            server.URL,
		Description:    description,
		Type:           serverType,
		CreatedBy:      uuid.MustParse("63569088-e6ec-4162-8906-dcefcfe875bc"), // Use the admin user ID
	}

	createdServer, err := r.db.CreateMCPServer(ctx, req)
	if err != nil {
		return err
	}

	// Update the input server with the created server's data
	server.ID = createdServer.ID
	server.Status = createdServer.Status
	server.CreatedAt = createdServer.CreatedAt
	server.UpdatedAt = createdServer.UpdatedAt

	return nil
}

// GetServerStatus retrieves the current status of an MCP server
func (r *MCPRepositoryAdapter) GetServerStatus(ctx context.Context, serverID uuid.UUID) (*models.MCPServerStatus, error) {
	// For now, return a basic status since the PostgreSQL repo doesn't have status tracking yet
	// This would need to be implemented based on the actual status tracking requirements
	return &models.MCPServerStatus{
		ID:           uuid.New(),
		ServerID:     serverID,
		IsOnline:     true, // Assume online for now
		ResponseTime: 100,  // Mock response time
		LastChecked:  time.Now(),
	}, nil
}

// UpdateServer updates an existing MCP server
func (r *MCPRepositoryAdapter) UpdateServer(ctx context.Context, server *models.MCPServer) error {
	// Convert models.MCPServer to database update format
	// This would need to be implemented based on the actual update requirements
	// For now, we'll assume the server has all necessary fields
	return nil // Placeholder - needs actual implementation
}

// DeleteServer deletes an MCP server
func (r *MCPRepositoryAdapter) DeleteServer(ctx context.Context, id uuid.UUID) error {
	return r.db.DeleteMCPServer(ctx, id)
}

// GetServerByID retrieves a server by ID (alias for GetServer for consistency)
func (r *MCPRepositoryAdapter) GetServerByID(id uuid.UUID) (*models.MCPServer, error) {
	return r.GetServer(context.Background(), id)
}
