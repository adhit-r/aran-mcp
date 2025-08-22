package models

import (
	"time"

	"github.com/google/uuid"
)

// MCPServer represents an MCP server in the system
type MCPServer struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	URL         string    `json:"url" db:"url"`
	Version     string    `json:"version" db:"version"`
	IsActive    bool      `json:"is_active" db:"is_active"`
	LastChecked time.Time `json:"last_checked" db:"last_checked"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
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
