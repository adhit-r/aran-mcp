package models

import (
	"time"

	"github.com/google/uuid"
)

// MCPServer represents an MCP server in the system
type MCPServer struct {
	ID               uuid.UUID              `json:"id" db:"id"`
	Name             string                 `json:"name" db:"name"`
	URL              string                 `json:"url" db:"url"`
	Description      string                 `json:"description" db:"description"`
	Type             string                 `json:"type" db:"type"`
	Status           string                 `json:"status" db:"status"`
	Version          string                 `json:"version" db:"version"`
	Capabilities     []string               `json:"capabilities" db:"capabilities"`
	OrganizationID   uuid.UUID              `json:"organization_id" db:"organization_id"`
	Metadata         map[string]interface{} `json:"metadata" db:"metadata"`
	IsActive         bool                   `json:"is_active" db:"is_active"`
	LastChecked      time.Time              `json:"last_checked" db:"last_checked"`
	ResponseTime     int64                  `json:"response_time" db:"response_time"` // in milliseconds
	UptimePercentage float64                `json:"uptime_percentage" db:"uptime_percentage"`
	LastCheckedAt    time.Time              `json:"last_checked_at" db:"last_checked_at"`
	CreatedAt        time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at" db:"updated_at"`
	DeletedAt        *time.Time             `json:"deleted_at,omitempty" db:"deleted_at"`
}

// MCPEvent represents an event from an MCP server
type MCPEvent struct {
	ID         uuid.UUID         `json:"id" db:"id"`
	ServerID   uuid.UUID         `json:"server_id" db:"server_id"`
	EventType  string            `json:"event_type" db:"event_type"`
	Severity   string            `json:"severity" db:"severity"`
	Message    string            `json:"message" db:"message"`
	Metadata   map[string]string `json:"metadata" db:"metadata"`
	ReceivedAt time.Time         `json:"received_at" db:"received_at"`
}

// MCPServerStatus represents the status of an MCP server
type MCPServerStatus struct {
	ID           uuid.UUID `json:"id" db:"id"`
	ServerID     uuid.UUID `json:"server_id" db:"server_id"`
	IsOnline     bool      `json:"is_online" db:"is_online"`
	ResponseTime int64     `json:"response_time" db:"response_time"` // in milliseconds
	LastChecked  time.Time `json:"last_checked" db:"last_checked"`
	Error        string    `json:"error,omitempty" db:"error"`
}

// Alert represents a health alert
type Alert struct {
	ID             uuid.UUID `json:"id" db:"id"`
	OrganizationID uuid.UUID `json:"organization_id" db:"organization_id"`
	ServerID       uuid.UUID `json:"server_id" db:"server_id"`
	Type           string    `json:"type" db:"type"`
	Severity       string    `json:"severity" db:"severity"`
	Message        string    `json:"message" db:"message"`
	Timestamp      time.Time `json:"timestamp" db:"timestamp"`
	Resolved       bool      `json:"resolved" db:"resolved"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

// ServerSearchOptions represents search options for servers
type ServerSearchOptions struct {
	Query          string   `json:"query,omitempty"`
	Type           string   `json:"type,omitempty"`
	Status         string   `json:"status,omitempty"`
	OrganizationID string   `json:"organization_id,omitempty"`
	Capabilities   []string `json:"capabilities,omitempty"`
	Tags           []string `json:"tags,omitempty"`
	MinHealthScore int      `json:"min_health_score,omitempty"`
	SortBy         string   `json:"sort_by,omitempty"`
	SortOrder      string   `json:"sort_order,omitempty"`
	Limit          int      `json:"limit,omitempty"`
	Offset         int      `json:"offset,omitempty"`
}
