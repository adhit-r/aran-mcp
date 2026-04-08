package webhook

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// EventType represents the type of webhook event
type EventType string

const (
	// Server events
	EventServerCreated     EventType = "server.created"
	EventServerUpdated     EventType = "server.updated"
	EventServerDeleted     EventType = "server.deleted"
	EventServerStatusUp    EventType = "server.status.up"
	EventServerStatusDown  EventType = "server.status.down"

	// Alert events
	EventAlertCreated      EventType = "alert.created"
	EventAlertResolved     EventType = "alert.resolved"

	// Security events
	EventSecurityScanStarted   EventType = "security.scan.started"
	EventSecurityScanCompleted EventType = "security.scan.completed"
	EventVulnerabilityFound    EventType = "security.vulnerability.found"

	// Discovery events
	EventDiscoveryStarted   EventType = "discovery.started"
	EventDiscoveryCompleted EventType = "discovery.completed"
	EventServerDiscovered   EventType = "discovery.server.found"
)

// AllEventTypes returns all available event types
func AllEventTypes() []EventType {
	return []EventType{
		EventServerCreated,
		EventServerUpdated,
		EventServerDeleted,
		EventServerStatusUp,
		EventServerStatusDown,
		EventAlertCreated,
		EventAlertResolved,
		EventSecurityScanStarted,
		EventSecurityScanCompleted,
		EventVulnerabilityFound,
		EventDiscoveryStarted,
		EventDiscoveryCompleted,
		EventServerDiscovered,
	}
}

// DeliveryStatus represents the status of a webhook delivery
type DeliveryStatus string

const (
	DeliveryStatusPending   DeliveryStatus = "pending"
	DeliveryStatusSuccess   DeliveryStatus = "success"
	DeliveryStatusFailed    DeliveryStatus = "failed"
	DeliveryStatusRetrying  DeliveryStatus = "retrying"
)

// StringArray is a helper type for PostgreSQL text arrays
type StringArray []string

func (a StringArray) Value() (driver.Value, error) {
	if a == nil {
		return nil, nil
	}
	return json.Marshal(a)
}

func (a *StringArray) Scan(value interface{}) error {
	if value == nil {
		*a = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), a)
	}
	return json.Unmarshal(bytes, a)
}

// Webhook represents a webhook configuration
type Webhook struct {
	ID             uuid.UUID   `db:"id" json:"id"`
	OrganizationID uuid.UUID   `db:"organization_id" json:"organization_id"`
	Name           string      `db:"name" json:"name"`
	URL            string      `db:"url" json:"url"`
	Secret         string      `db:"secret" json:"-"` // Never expose in JSON
	Events         StringArray `db:"events" json:"events"`
	Headers        JSONB       `db:"headers" json:"headers,omitempty"`
	IsActive       bool        `db:"is_active" json:"is_active"`
	Description    *string     `db:"description" json:"description,omitempty"`
	CreatedBy      *uuid.UUID  `db:"created_by" json:"created_by,omitempty"`
	CreatedAt      time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time   `db:"updated_at" json:"updated_at"`
	DeletedAt      *time.Time  `db:"deleted_at" json:"deleted_at,omitempty"`
}

// WebhookDelivery represents a single webhook delivery attempt
type WebhookDelivery struct {
	ID              uuid.UUID       `db:"id" json:"id"`
	WebhookID       uuid.UUID       `db:"webhook_id" json:"webhook_id"`
	Event           string          `db:"event" json:"event"`
	Payload         JSONB           `db:"payload" json:"payload"`
	Status          DeliveryStatus  `db:"status" json:"status"`
	StatusCode      *int            `db:"status_code" json:"status_code,omitempty"`
	Response        *string         `db:"response" json:"response,omitempty"`
	ErrorMessage    *string         `db:"error_message" json:"error_message,omitempty"`
	Attempts        int             `db:"attempts" json:"attempts"`
	NextRetryAt     *time.Time      `db:"next_retry_at" json:"next_retry_at,omitempty"`
	DeliveredAt     *time.Time      `db:"delivered_at" json:"delivered_at,omitempty"`
	DurationMs      *int            `db:"duration_ms" json:"duration_ms,omitempty"`
	CreatedAt       time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time       `db:"updated_at" json:"updated_at"`
}

// JSONB represents a JSONB field
type JSONB map[string]interface{}

func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

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

// CreateWebhookRequest represents the request to create a webhook
type CreateWebhookRequest struct {
	Name        string            `json:"name" validate:"required,min=1,max=255"`
	URL         string            `json:"url" validate:"required,url"`
	Events      []string          `json:"events" validate:"required,min=1"`
	Headers     map[string]string `json:"headers,omitempty"`
	Description *string           `json:"description,omitempty"`
	IsActive    *bool             `json:"is_active,omitempty"`
}

// UpdateWebhookRequest represents the request to update a webhook
type UpdateWebhookRequest struct {
	Name        *string           `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
	URL         *string           `json:"url,omitempty" validate:"omitempty,url"`
	Events      []string          `json:"events,omitempty"`
	Headers     map[string]string `json:"headers,omitempty"`
	Description *string           `json:"description,omitempty"`
	IsActive    *bool             `json:"is_active,omitempty"`
}

// WebhookResponse represents the API response for a webhook
type WebhookResponse struct {
	ID             uuid.UUID         `json:"id"`
	OrganizationID uuid.UUID         `json:"organization_id"`
	Name           string            `json:"name"`
	URL            string            `json:"url"`
	Events         []string          `json:"events"`
	Headers        map[string]string `json:"headers,omitempty"`
	IsActive       bool              `json:"is_active"`
	Description    *string           `json:"description,omitempty"`
	CreatedAt      time.Time         `json:"created_at"`
	UpdatedAt      time.Time         `json:"updated_at"`
	// Include secret only once on creation
	Secret         string            `json:"secret,omitempty"`
}

// WebhookPayload represents the payload sent to webhooks
type WebhookPayload struct {
	ID        string                 `json:"id"`
	Event     EventType              `json:"event"`
	Timestamp time.Time              `json:"timestamp"`
	Data      map[string]interface{} `json:"data"`
}

// WebhookTestRequest represents a test webhook request
type WebhookTestRequest struct {
	Event EventType              `json:"event,omitempty"`
	Data  map[string]interface{} `json:"data,omitempty"`
}
