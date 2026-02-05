package webhook

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/radhi1991/aran-mcp-sentinel/internal/models"
	"go.uber.org/zap"
)

// EventType constants for common webhook events
const (
	// Server events
	EventServerStatusChanged = "server.status.changed"
	EventServerHealthAlert   = "server.health.alert"
	EventServerCreated       = "server.created"
	EventServerUpdated       = "server.updated"
	EventServerDeleted       = "server.deleted"

	// Alert events
	EventAlertTriggered = "alert.triggered"
	EventAlertResolved  = "alert.resolved"

	// Security events
	EventSecurityTestCompleted = "security.test.completed"

	// Discovery events
	EventDiscoveryScanCompleted = "discovery.scan.completed"
)

// Helper functions to create common webhook events

// NewServerStatusChangedEvent creates a server status change event
func NewServerStatusChangedEvent(serverID uuid.UUID, serverName string, oldStatus, newStatus string) *models.WebhookEvent {
	return &models.WebhookEvent{
		ID:   uuid.New(),
		Type: EventServerStatusChanged,
		Data: map[string]interface{}{
			"server_id":   serverID.String(),
			"server_name": serverName,
			"old_status":  oldStatus,
			"new_status":  newStatus,
			"timestamp":   time.Now(),
		},
		Timestamp: time.Now(),
	}
}

// NewServerHealthAlertEvent creates a server health alert event
func NewServerHealthAlertEvent(serverID uuid.UUID, serverName string, severity, message string) *models.WebhookEvent {
	return &models.WebhookEvent{
		ID:   uuid.New(),
		Type: EventServerHealthAlert,
		Data: map[string]interface{}{
			"server_id":   serverID.String(),
			"server_name": serverName,
			"severity":    severity,
			"message":     message,
			"timestamp":   time.Now(),
		},
		Timestamp: time.Now(),
	}
}

// NewAlertTriggeredEvent creates an alert triggered event
func NewAlertTriggeredEvent(alertID uuid.UUID, alertType, severity, message string) *models.WebhookEvent {
	return &models.WebhookEvent{
		ID:   uuid.New(),
		Type: EventAlertTriggered,
		Data: map[string]interface{}{
			"alert_id":  alertID.String(),
			"type":      alertType,
			"severity":  severity,
			"message":   message,
			"timestamp": time.Now(),
		},
		Timestamp: time.Now(),
	}
}

// NewAlertResolvedEvent creates an alert resolved event
func NewAlertResolvedEvent(alertID uuid.UUID, alertType string, resolvedBy string) *models.WebhookEvent {
	return &models.WebhookEvent{
		ID:   uuid.New(),
		Type: EventAlertResolved,
		Data: map[string]interface{}{
			"alert_id":    alertID.String(),
			"type":        alertType,
			"resolved_by": resolvedBy,
			"timestamp":   time.Now(),
		},
		Timestamp: time.Now(),
	}
}

// NewServerCreatedEvent creates a server created event
func NewServerCreatedEvent(serverID uuid.UUID, serverName, serverURL string) *models.WebhookEvent {
	return &models.WebhookEvent{
		ID:   uuid.New(),
		Type: EventServerCreated,
		Data: map[string]interface{}{
			"server_id":   serverID.String(),
			"server_name": serverName,
			"server_url":  serverURL,
			"timestamp":   time.Now(),
		},
		Timestamp: time.Now(),
	}
}

// NewServerUpdatedEvent creates a server updated event
func NewServerUpdatedEvent(serverID uuid.UUID, serverName string, changes map[string]interface{}) *models.WebhookEvent {
	data := map[string]interface{}{
		"server_id":   serverID.String(),
		"server_name": serverName,
		"timestamp":   time.Now(),
	}
	
	// Add changes to data
	if changes != nil {
		data["changes"] = changes
	}
	
	return &models.WebhookEvent{
		ID:        uuid.New(),
		Type:      EventServerUpdated,
		Data:      data,
		Timestamp: time.Now(),
	}
}

// NewServerDeletedEvent creates a server deleted event
func NewServerDeletedEvent(serverID uuid.UUID, serverName string) *models.WebhookEvent {
	return &models.WebhookEvent{
		ID:   uuid.New(),
		Type: EventServerDeleted,
		Data: map[string]interface{}{
			"server_id":   serverID.String(),
			"server_name": serverName,
			"timestamp":   time.Now(),
		},
		Timestamp: time.Now(),
	}
}

// NewSecurityTestCompletedEvent creates a security test completed event
func NewSecurityTestCompletedEvent(testID uuid.UUID, testName string, result string, score int) *models.WebhookEvent {
	return &models.WebhookEvent{
		ID:   uuid.New(),
		Type: EventSecurityTestCompleted,
		Data: map[string]interface{}{
			"test_id":   testID.String(),
			"test_name": testName,
			"result":    result,
			"score":     score,
			"timestamp": time.Now(),
		},
		Timestamp: time.Now(),
	}
}

// NewDiscoveryScanCompletedEvent creates a discovery scan completed event
func NewDiscoveryScanCompletedEvent(serversFound int, duration time.Duration) *models.WebhookEvent {
	return &models.WebhookEvent{
		ID:   uuid.New(),
		Type: EventDiscoveryScanCompleted,
		Data: map[string]interface{}{
			"servers_found":   serversFound,
			"duration_ms":     duration.Milliseconds(),
			"timestamp":       time.Now(),
		},
		Timestamp: time.Now(),
	}
}

// TriggerWebhookAsync is a helper to trigger webhooks without blocking
// This is useful when you want to send webhooks but don't want to wait for them
func (s *Service) TriggerWebhookAsync(orgID uuid.UUID, event *models.WebhookEvent) {
	go func() {
		ctx := context.Background()
		if err := s.TriggerEvent(ctx, orgID, event); err != nil {
			s.logger.Error("Failed to trigger webhook",
				zap.String("event_type", event.Type),
				zap.String("org_id", orgID.String()),
				zap.Error(err))
		}
	}()
}
