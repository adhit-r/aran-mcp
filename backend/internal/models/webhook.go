package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/radhi1991/aran-mcp-sentinel/internal/database"
)

// Webhook represents a webhook endpoint configuration
type Webhook struct {
	ID               uuid.UUID              `json:"id" db:"id"`
	OrganizationID   uuid.UUID              `json:"organization_id" db:"organization_id"`
	Name             string                 `json:"name" db:"name"`
	URL              string                 `json:"url" db:"url"`
	Description      string                 `json:"description" db:"description"`
	Events           []string               `json:"events" db:"events"`
	Secret           string                 `json:"-" db:"secret"` // Hidden from JSON output
	IsActive         bool                   `json:"is_active" db:"is_active"`
	Headers          map[string]interface{} `json:"headers" db:"headers"`
	RetryConfig      map[string]interface{} `json:"retry_config" db:"retry_config"`
	CreatedBy        *uuid.UUID             `json:"created_by,omitempty" db:"created_by"`
	CreatedAt        time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at" db:"updated_at"`
	LastTriggeredAt  *time.Time             `json:"last_triggered_at,omitempty" db:"last_triggered_at"`
	DeletedAt        *time.Time             `json:"deleted_at,omitempty" db:"deleted_at"`
}

// WebhookDelivery represents a webhook delivery attempt
type WebhookDelivery struct {
	ID             uuid.UUID      `json:"id" db:"id"`
	WebhookID      uuid.UUID      `json:"webhook_id" db:"webhook_id"`
	EventType      string         `json:"event_type" db:"event_type"`
	EventID        uuid.UUID      `json:"event_id" db:"event_id"`
	Payload        database.JSONB `json:"payload" db:"payload"`
	Status         string         `json:"status" db:"status"` // pending, success, failed, retrying
	HTTPStatusCode *int           `json:"http_status_code,omitempty" db:"http_status_code"`
	ResponseBody   string         `json:"response_body,omitempty" db:"response_body"`
	ErrorMessage   string         `json:"error_message,omitempty" db:"error_message"`
	Attempts       int            `json:"attempts" db:"attempts"`
	MaxAttempts    int            `json:"max_attempts" db:"max_attempts"`
	NextRetryAt    *time.Time     `json:"next_retry_at,omitempty" db:"next_retry_at"`
	DeliveredAt    *time.Time     `json:"delivered_at,omitempty" db:"delivered_at"`
	CreatedAt      time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at" db:"updated_at"`
}

// WebhookEvent represents an event that can trigger webhooks
type WebhookEvent struct {
	ID        uuid.UUID              `json:"id"`
	Type      string                 `json:"type"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
}

// CreateWebhookRequest represents the request to create a webhook
type CreateWebhookRequest struct {
	Name        string                 `json:"name" binding:"required"`
	URL         string                 `json:"url" binding:"required,url"`
	Description string                 `json:"description"`
	Events      []string               `json:"events" binding:"required,min=1"`
	IsActive    bool                   `json:"is_active"`
	Headers     map[string]interface{} `json:"headers"`
	RetryConfig map[string]interface{} `json:"retry_config"`
}

// UpdateWebhookRequest represents the request to update a webhook
type UpdateWebhookRequest struct {
	Name        *string                `json:"name,omitempty"`
	URL         *string                `json:"url,omitempty" binding:"omitempty,url"`
	Description *string                `json:"description,omitempty"`
	Events      []string               `json:"events,omitempty" binding:"omitempty,min=1"`
	IsActive    *bool                  `json:"is_active,omitempty"`
	Headers     map[string]interface{} `json:"headers,omitempty"`
	RetryConfig map[string]interface{} `json:"retry_config,omitempty"`
}

// WebhookTestRequest represents the request to test a webhook
type WebhookTestRequest struct {
	EventType string                 `json:"event_type" binding:"required"`
	TestData  map[string]interface{} `json:"test_data"`
}

