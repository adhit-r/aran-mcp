package database

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// JSONB represents a JSONB field that can be marshaled/unmarshaled
type JSONB map[string]interface{}

// Value implements the driver.Valuer interface
func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), j)
	}

	return json.Unmarshal(bytes, j)
}

// JSONBArray represents a JSONB field that can handle both arrays and objects
type JSONBArray []interface{}

// Value implements the driver.Valuer interface
func (j JSONBArray) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface
func (j *JSONBArray) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), j)
	}

	return json.Unmarshal(bytes, j)
}

// Organization represents an organization in the system
type Organization struct {
	ID          uuid.UUID `db:"id" json:"id"`
	Name        string    `db:"name" json:"name"`
	Slug        string    `db:"slug" json:"slug"`
	Email       string    `db:"email" json:"email"`
	Description *string   `db:"description" json:"description"`
	Settings    JSONB     `db:"settings" json:"settings"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
	DeletedAt   *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}

// User represents a user in the system
type User struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	OrganizationID uuid.UUID  `db:"organization_id" json:"organization_id"`
	Email          string     `db:"email" json:"email"`
	Name           string     `db:"name" json:"name"`
	PasswordHash   string     `db:"password_hash" json:"-"`
	Role           string     `db:"role" json:"role"`
	IsActive       bool       `db:"is_active" json:"is_active"`
	LastLoginAt    *time.Time `db:"last_login_at" json:"last_login_at,omitempty"`
	Preferences    JSONB      `db:"preferences" json:"preferences"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt      *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}

// MCPServer represents an MCP server in the system
type MCPServer struct {
	ID               uuid.UUID  `db:"id" json:"id"`
	OrganizationID   uuid.UUID  `db:"organization_id" json:"organization_id"`
	Name             string     `db:"name" json:"name"`
	URL              string     `db:"url" json:"url"`
	Description      *string    `db:"description" json:"description"`
	Type             string     `db:"type" json:"type"`
	Status           string     `db:"status" json:"status"`
	Version          *string    `db:"version" json:"version"`
	Capabilities     JSONBArray `db:"capabilities" json:"capabilities"`
	Metadata         JSONB      `db:"metadata" json:"metadata"`
	LastCheckedAt    *time.Time `db:"last_checked_at" json:"last_checked_at,omitempty"`
	ResponseTimeMs   *int       `db:"response_time_ms" json:"response_time_ms,omitempty"`
	UptimePercentage *float64   `db:"uptime_percentage" json:"uptime_percentage,omitempty"`
	ErrorRate        *float64   `db:"error_rate" json:"error_rate,omitempty"`
	CreatedBy        *uuid.UUID `db:"created_by" json:"created_by,omitempty"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt        *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}

// ServerStatusHistory represents the status history of an MCP server
type ServerStatusHistory struct {
	ID             uuid.UUID `db:"id" json:"id"`
	ServerID       uuid.UUID `db:"server_id" json:"server_id"`
	Status         string    `db:"status" json:"status"`
	ResponseTimeMs *int      `db:"response_time_ms" json:"response_time_ms,omitempty"`
	ErrorMessage   *string   `db:"error_message" json:"error_message,omitempty"`
	CheckedAt      time.Time `db:"checked_at" json:"checked_at"`
}

// Alert represents an alert in the system
type Alert struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	OrganizationID uuid.UUID  `db:"organization_id" json:"organization_id"`
	ServerID       *uuid.UUID `db:"server_id" json:"server_id,omitempty"`
	Type           string     `db:"type" json:"type"`
	Severity       string     `db:"severity" json:"severity"`
	Title          string     `db:"title" json:"title"`
	Message        string     `db:"message" json:"message"`
	IsRead         bool       `db:"is_read" json:"is_read"`
	ResolvedAt     *time.Time `db:"resolved_at" json:"resolved_at,omitempty"`
	ResolvedBy     *uuid.UUID `db:"resolved_by" json:"resolved_by,omitempty"`
	Metadata       JSONB      `db:"metadata" json:"metadata"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
}

// SecurityTest represents a security test in the system
type SecurityTest struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	OrganizationID uuid.UUID  `db:"organization_id" json:"organization_id"`
	ServerID       *uuid.UUID `db:"server_id" json:"server_id,omitempty"`
	Name           string     `db:"name" json:"name"`
	Type           string     `db:"type" json:"type"`
	Status         string     `db:"status" json:"status"`
	Result         *string    `db:"result" json:"result,omitempty"`
	Score          *int       `db:"score" json:"score,omitempty"`
	Details        JSONB      `db:"details" json:"details"`
	StartedAt      *time.Time `db:"started_at" json:"started_at,omitempty"`
	CompletedAt    *time.Time `db:"completed_at" json:"completed_at,omitempty"`
	CreatedBy      *uuid.UUID `db:"created_by" json:"created_by,omitempty"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
}

// APIKey represents an API key in the system
type APIKey struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	OrganizationID uuid.UUID  `db:"organization_id" json:"organization_id"`
	UserID         *uuid.UUID `db:"user_id" json:"user_id,omitempty"`
	Name           string     `db:"name" json:"name"`
	KeyHash        string     `db:"key_hash" json:"-"`
	Permissions    JSONB      `db:"permissions" json:"permissions"`
	LastUsedAt     *time.Time `db:"last_used_at" json:"last_used_at,omitempty"`
	ExpiresAt      *time.Time `db:"expires_at" json:"expires_at,omitempty"`
	IsActive       bool       `db:"is_active" json:"is_active"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
}

// AuditLog represents an audit log entry
type AuditLog struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	OrganizationID uuid.UUID  `db:"organization_id" json:"organization_id"`
	UserID         *uuid.UUID `db:"user_id" json:"user_id,omitempty"`
	Action         string     `db:"action" json:"action"`
	ResourceType   string     `db:"resource_type" json:"resource_type"`
	ResourceID     *uuid.UUID `db:"resource_id" json:"resource_id,omitempty"`
	Details        JSONB      `db:"details" json:"details"`
	IPAddress      *string    `db:"ip_address" json:"ip_address,omitempty"`
	UserAgent      *string    `db:"user_agent" json:"user_agent,omitempty"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
}

// CreateOrganizationRequest represents a request to create an organization
type CreateOrganizationRequest struct {
	Name        string  `json:"name" validate:"required,min=1,max=255"`
	Slug        string  `json:"slug" validate:"required,min=1,max=100"`
	Email       string  `json:"email" validate:"required,email"`
	Description *string `json:"description,omitempty"`
}

// CreateUserRequest represents a request to create a user
type CreateUserRequest struct {
	OrganizationID uuid.UUID `json:"organization_id" validate:"required"`
	Email          string    `json:"email" validate:"required,email"`
	Name           string    `json:"name" validate:"required,min=1,max=255"`
	Password       string    `json:"password" validate:"required,min=8"`
	Role           string    `json:"role" validate:"required,oneof=admin user viewer"`
}

// CreateMCPServerRequest represents a request to create an MCP server
type CreateMCPServerRequest struct {
	OrganizationID uuid.UUID `json:"organization_id" validate:"required"`
	Name           string    `json:"name" validate:"required,min=1,max=255"`
	URL            string    `json:"url" validate:"required,url"`
	Description    *string   `json:"description,omitempty"`
	Type           string    `json:"type" validate:"required,oneof=filesystem database api custom"`
	CreatedBy      uuid.UUID `json:"created_by" validate:"required"`
}

// UpdateMCPServerRequest represents a request to update an MCP server
type UpdateMCPServerRequest struct {
	Name        *string `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
	URL         *string `json:"url,omitempty" validate:"omitempty,url"`
	Description *string `json:"description,omitempty"`
	Type        *string `json:"type,omitempty" validate:"omitempty,oneof=filesystem database api custom"`
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	User  User   `json:"user"`
	Token string `json:"token"`
}

// ServerStatus represents the current status of an MCP server
type ServerStatus struct {
	ServerID         uuid.UUID `json:"server_id"`
	Status           string    `json:"status"`
	ResponseTimeMs   *int      `json:"response_time_ms,omitempty"`
	UptimePercentage *float64  `json:"uptime_percentage,omitempty"`
	ErrorRate        *float64  `json:"error_rate,omitempty"`
	LastChecked      time.Time `json:"last_checked"`
	Version          *string   `json:"version,omitempty"`
	Capabilities     JSONBArray `json:"capabilities"`
}
