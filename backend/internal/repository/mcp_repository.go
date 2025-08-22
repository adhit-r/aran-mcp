package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/radhi1991/aran-mcp-sentinel/internal/models"
	"github.com/radhi1991/aran-mcp-sentinel/internal/supabase"
)

type MCPServerRepository struct {
	db *supabase.Client
}

func NewMCPServerRepository(supabaseClient *supabase.Client) *MCPServerRepository {
	return &MCPServerRepository{
		db: supabaseClient,
	}
}

// CreateServer adds a new MCP server to the database
func (r *MCPServerRepository) CreateServer(ctx context.Context, server *models.MCPServer) error {
	if server.ID == uuid.Nil {
		server.ID = uuid.New()
	}

	now := time.Now()
	server.CreatedAt = now
	server.UpdatedAt = now

	_, _, err := r.db.From("mcp_servers").Insert(server, false, "", "", "").Execute()
	return err
}

// GetServer retrieves an MCP server by ID
func (r *MCPServerRepository) GetServer(ctx context.Context, id uuid.UUID) (*models.MCPServer, error) {
	var result []models.MCPServer
	
	// Convert UUID to string for the query
	idStr := id.String()
	
	// Execute the query
	_, data, err := r.db.From("mcp_servers").
		Select("*", "exact", false).
		Eq("id", idStr).
		Execute()

	if err != nil {
		return nil, fmt.Errorf("failed to query server: %w", err)
	}

	// Convert the response to JSON bytes
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal response data: %w", err)
	}

	// Parse the JSON response into result
	if err := json.Unmarshal(jsonData, &result); err != nil {
		return nil, fmt.Errorf("failed to parse server data: %w", err)
	}

	if len(result) == 0 {
		return nil, errors.New("server not found")
	}

	return &result[0], nil
}

// UpdateServerStatus updates the status of an MCP server
func (r *MCPServerRepository) UpdateServerStatus(ctx context.Context, status *models.MCPServerStatus) error {
	status.LastChecked = time.Now()

	// Check if status exists
	serverIDStr := status.ServerID.String()
	_, data, err := r.db.From("mcp_server_status").
		Select("id", "", false).
		Eq("server_id", serverIDStr).
		Execute()

	if err != nil {
		return fmt.Errorf("failed to check existing status: %w", err)
	}

	// Convert the response to JSON bytes
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal response data: %w", err)
	}

	var existingStatus []struct {
		ID uuid.UUID `json:"id"`
	}

	if err := json.Unmarshal(jsonData, &existingStatus); err != nil {
		return fmt.Errorf("failed to parse existing status: %w", err)
	}

	if len(existingStatus) > 0 {
		// Update existing status
		status.ID = existingStatus[0].ID
		_, _, err = r.db.From("mcp_server_status").
			Update(status, "", "").
			Eq("id", status.ID.String()).
			Execute()
	} else {
		// Insert new status
		if status.ID == uuid.Nil {
			status.ID = uuid.New()
		}
		_, _, err = r.db.From("mcp_server_status").Insert(status, false, "", "", "").Execute()
	}

	return err
}

// LogEvent records an MCP event in the database
func (r *MCPServerRepository) LogEvent(ctx context.Context, event *models.MCPEvent) error {
	if event.ID == uuid.Nil {
		event.ID = uuid.New()
	}

	if event.ReceivedAt.IsZero() {
		event.ReceivedAt = time.Now()
	}

	// Convert metadata to JSONB
	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	_, _, err = r.db.From("mcp_events").Insert(eventJSON, false, "", "", "").Execute()
	return err
}

// ListActiveServers returns all active MCP servers
func (r *MCPServerRepository) ListActiveServers(ctx context.Context) ([]models.MCPServer, error) {
	var servers []models.MCPServer
	
	_, data, err := r.db.From("mcp_servers").
		Select("*", "exact", false).
		Eq("is_active", "true").
		Execute()

	if err != nil {
		return nil, fmt.Errorf("failed to list active servers: %w", err)
	}

	// Convert the response to JSON bytes
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal response data: %w", err)
	}

	// Parse the JSON response into servers
	if err := json.Unmarshal(jsonData, &servers); err != nil {
		return nil, fmt.Errorf("failed to parse servers data: %w", err)
	}

	return servers, nil
}

// GetServerStatus retrieves the current status of an MCP server
func (r *MCPServerRepository) GetServerStatus(ctx context.Context, serverID uuid.UUID) (*models.MCPServerStatus, error) {
	var statuses []models.MCPServerStatus
	
	serverIDStr := serverID.String()
	_, data, err := r.db.From("mcp_server_status").
		Select("*", "exact", false).
		Eq("server_id", serverIDStr).
		Order("last_checked", nil).
		Limit(1, "").
		Execute()

	if err != nil {
		return nil, fmt.Errorf("failed to get server status: %w", err)
	}

	// Convert the response to JSON bytes
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal response data: %w", err)
	}

	// Parse the JSON response into statuses
	if err := json.Unmarshal(jsonData, &statuses); err != nil {
		return nil, fmt.Errorf("failed to parse status data: %w", err)
	}

	if len(statuses) == 0 {
		return nil, errors.New("no status found for server")
	}

	return &statuses[0], nil
}
