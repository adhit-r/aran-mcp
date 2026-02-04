package webhook

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/radhi1991/aran-mcp-sentinel/internal/models"
	"go.uber.org/zap"
)

// Service handles webhook operations
type Service struct {
	db     *sqlx.DB
	logger *zap.Logger
	client *http.Client
}

// NewService creates a new webhook service
func NewService(db *sqlx.DB, logger *zap.Logger) *Service {
	return &Service{
		db:     db,
		logger: logger,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// CreateWebhook creates a new webhook
func (s *Service) CreateWebhook(ctx context.Context, orgID uuid.UUID, userID *uuid.UUID, req *models.CreateWebhookRequest) (*models.Webhook, error) {
	webhook := &models.Webhook{
		ID:             uuid.New(),
		OrganizationID: orgID,
		Name:           req.Name,
		URL:            req.URL,
		Description:    req.Description,
		Events:         req.Events,
		Secret:         generateSecret(),
		IsActive:       req.IsActive,
		Headers:        req.Headers,
		RetryConfig:    req.RetryConfig,
		CreatedBy:      userID,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	// Set default retry config if not provided
	if webhook.RetryConfig == nil {
		webhook.RetryConfig = map[string]interface{}{
			"max_attempts":          3,
			"backoff_multiplier":    2,
			"initial_delay_seconds": 5,
		}
	}

	// Set default headers if not provided
	if webhook.Headers == nil {
		webhook.Headers = make(map[string]interface{})
	}

	query := `
		INSERT INTO webhooks (
			id, organization_id, name, url, description, events, secret, 
			is_active, headers, retry_config, created_by, created_at, updated_at
		) VALUES (
			:id, :organization_id, :name, :url, :description, :events, :secret,
			:is_active, :headers, :retry_config, :created_by, :created_at, :updated_at
		)
		RETURNING *
	`

	rows, err := s.db.NamedQueryContext(ctx, query, webhook)
	if err != nil {
		return nil, fmt.Errorf("failed to create webhook: %w", err)
	}
	defer rows.Close()

	if rows.Next() {
		if err := rows.StructScan(webhook); err != nil {
			return nil, fmt.Errorf("failed to scan webhook: %w", err)
		}
	}

	s.logger.Info("Webhook created",
		zap.String("webhook_id", webhook.ID.String()),
		zap.String("name", webhook.Name),
		zap.String("url", webhook.URL))

	return webhook, nil
}

// GetWebhook retrieves a webhook by ID
func (s *Service) GetWebhook(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*models.Webhook, error) {
	var webhook models.Webhook
	query := `
		SELECT * FROM webhooks 
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`

	err := s.db.GetContext(ctx, &webhook, query, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to get webhook: %w", err)
	}

	return &webhook, nil
}

// ListWebhooks retrieves all webhooks for an organization
func (s *Service) ListWebhooks(ctx context.Context, orgID uuid.UUID) ([]*models.Webhook, error) {
	var webhooks []*models.Webhook
	query := `
		SELECT * FROM webhooks 
		WHERE organization_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
	`

	err := s.db.SelectContext(ctx, &webhooks, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list webhooks: %w", err)
	}

	return webhooks, nil
}

// UpdateWebhook updates a webhook
func (s *Service) UpdateWebhook(ctx context.Context, id uuid.UUID, orgID uuid.UUID, req *models.UpdateWebhookRequest) (*models.Webhook, error) {
	// First, get the existing webhook
	webhook, err := s.GetWebhook(ctx, id, orgID)
	if err != nil {
		return nil, err
	}

	// Update fields if provided
	if req.Name != nil {
		webhook.Name = *req.Name
	}
	if req.URL != nil {
		webhook.URL = *req.URL
	}
	if req.Description != nil {
		webhook.Description = *req.Description
	}
	if req.Events != nil {
		webhook.Events = req.Events
	}
	if req.IsActive != nil {
		webhook.IsActive = *req.IsActive
	}
	if req.Headers != nil {
		webhook.Headers = req.Headers
	}
	if req.RetryConfig != nil {
		webhook.RetryConfig = req.RetryConfig
	}

	webhook.UpdatedAt = time.Now()

	query := `
		UPDATE webhooks SET
			name = :name,
			url = :url,
			description = :description,
			events = :events,
			is_active = :is_active,
			headers = :headers,
			retry_config = :retry_config,
			updated_at = :updated_at
		WHERE id = :id AND organization_id = :organization_id AND deleted_at IS NULL
		RETURNING *
	`

	rows, err := s.db.NamedQueryContext(ctx, query, webhook)
	if err != nil {
		return nil, fmt.Errorf("failed to update webhook: %w", err)
	}
	defer rows.Close()

	if rows.Next() {
		if err := rows.StructScan(webhook); err != nil {
			return nil, fmt.Errorf("failed to scan updated webhook: %w", err)
		}
	}

	s.logger.Info("Webhook updated",
		zap.String("webhook_id", webhook.ID.String()),
		zap.String("name", webhook.Name))

	return webhook, nil
}

// DeleteWebhook soft deletes a webhook
func (s *Service) DeleteWebhook(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error {
	query := `
		UPDATE webhooks 
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`

	result, err := s.db.ExecContext(ctx, query, id, orgID)
	if err != nil {
		return fmt.Errorf("failed to delete webhook: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("webhook not found")
	}

	s.logger.Info("Webhook deleted",
		zap.String("webhook_id", id.String()))

	return nil
}

// TriggerEvent triggers webhooks for a specific event
func (s *Service) TriggerEvent(ctx context.Context, orgID uuid.UUID, event *models.WebhookEvent) error {
	// Get all active webhooks that subscribe to this event type
	webhooks, err := s.getActiveWebhooksForEvent(ctx, orgID, event.Type)
	if err != nil {
		return fmt.Errorf("failed to get webhooks for event: %w", err)
	}

	if len(webhooks) == 0 {
		s.logger.Debug("No webhooks found for event",
			zap.String("event_type", event.Type),
			zap.String("org_id", orgID.String()))
		return nil
	}

	// Create deliveries for each webhook
	for _, webhook := range webhooks {
		if err := s.createDelivery(ctx, webhook, event); err != nil {
			s.logger.Error("Failed to create delivery",
				zap.Error(err),
				zap.String("webhook_id", webhook.ID.String()),
				zap.String("event_type", event.Type))
			continue
		}

		// Update last triggered timestamp
		if err := s.updateLastTriggered(ctx, webhook.ID); err != nil {
			s.logger.Error("Failed to update last triggered",
				zap.Error(err),
				zap.String("webhook_id", webhook.ID.String()))
		}
	}

	s.logger.Info("Event triggered",
		zap.String("event_type", event.Type),
		zap.Int("webhook_count", len(webhooks)))

	return nil
}

// DeliverWebhook delivers a webhook immediately
func (s *Service) DeliverWebhook(ctx context.Context, deliveryID uuid.UUID) error {
	// Get delivery details
	delivery, webhook, err := s.getDeliveryWithWebhook(ctx, deliveryID)
	if err != nil {
		return fmt.Errorf("failed to get delivery: %w", err)
	}

	// Prepare payload
	payload, err := json.Marshal(delivery.Payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", webhook.URL, bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Add headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Webhook-ID", webhook.ID.String())
	req.Header.Set("X-Event-Type", delivery.EventType)
	req.Header.Set("X-Delivery-ID", delivery.ID.String())
	req.Header.Set("User-Agent", "Aran-MCP-Webhook/1.0")

	// Add custom headers
	for key, value := range webhook.Headers {
		if strValue, ok := value.(string); ok {
			req.Header.Set(key, strValue)
		}
	}

	// Generate and add signature
	signature := generateSignature(payload, webhook.Secret)
	req.Header.Set("X-Webhook-Signature", signature)

	// Send request
	resp, err := s.client.Do(req)
	
	delivery.Attempts++
	delivery.UpdatedAt = time.Now()

	if err != nil {
		// Network error
		delivery.Status = "failed"
		delivery.ErrorMessage = err.Error()
		
		// Check if we should retry
		if delivery.Attempts < delivery.MaxAttempts {
			delivery.Status = "retrying"
			delivery.NextRetryAt = s.calculateNextRetry(delivery.Attempts, webhook.RetryConfig)
		}

		s.updateDelivery(ctx, delivery)
		return fmt.Errorf("failed to send webhook: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, _ := io.ReadAll(resp.Body)
	delivery.HTTPStatusCode = &resp.StatusCode
	delivery.ResponseBody = string(body)

	// Check response status
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		delivery.Status = "success"
		now := time.Now()
		delivery.DeliveredAt = &now
		s.logger.Info("Webhook delivered successfully",
			zap.String("webhook_id", webhook.ID.String()),
			zap.String("delivery_id", delivery.ID.String()),
			zap.Int("status_code", resp.StatusCode))
	} else {
		delivery.Status = "failed"
		delivery.ErrorMessage = fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(body))

		// Check if we should retry
		if delivery.Attempts < delivery.MaxAttempts {
			delivery.Status = "retrying"
			delivery.NextRetryAt = s.calculateNextRetry(delivery.Attempts, webhook.RetryConfig)
		}

		s.logger.Warn("Webhook delivery failed",
			zap.String("webhook_id", webhook.ID.String()),
			zap.String("delivery_id", delivery.ID.String()),
			zap.Int("status_code", resp.StatusCode))
	}

	return s.updateDelivery(ctx, delivery)
}

// RetryPendingDeliveries retries all pending deliveries that are ready for retry
func (s *Service) RetryPendingDeliveries(ctx context.Context) error {
	query := `
		SELECT * FROM webhook_deliveries
		WHERE status = 'retrying'
		AND next_retry_at <= NOW()
		ORDER BY next_retry_at ASC
		LIMIT 100
	`

	var deliveries []*models.WebhookDelivery
	err := s.db.SelectContext(ctx, &deliveries, query)
	if err != nil {
		return fmt.Errorf("failed to get pending deliveries: %w", err)
	}

	s.logger.Info("Retrying pending deliveries", zap.Int("count", len(deliveries)))

	for _, delivery := range deliveries {
		if err := s.DeliverWebhook(ctx, delivery.ID); err != nil {
			s.logger.Error("Failed to retry delivery",
				zap.Error(err),
				zap.String("delivery_id", delivery.ID.String()))
		}
	}

	return nil
}

// GetDeliveryHistory retrieves delivery history for a webhook
func (s *Service) GetDeliveryHistory(ctx context.Context, webhookID uuid.UUID, limit int, offset int) ([]*models.WebhookDelivery, error) {
	var deliveries []*models.WebhookDelivery
	query := `
		SELECT * FROM webhook_deliveries
		WHERE webhook_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	err := s.db.SelectContext(ctx, &deliveries, query, webhookID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get delivery history: %w", err)
	}

	return deliveries, nil
}

// Helper functions

func (s *Service) getActiveWebhooksForEvent(ctx context.Context, orgID uuid.UUID, eventType string) ([]*models.Webhook, error) {
	var webhooks []*models.Webhook
	query := `
		SELECT * FROM webhooks
		WHERE organization_id = $1
		AND is_active = true
		AND deleted_at IS NULL
		AND $2 = ANY(events)
	`

	err := s.db.SelectContext(ctx, &webhooks, query, orgID, eventType)
	if err != nil {
		return nil, fmt.Errorf("failed to get webhooks: %w", err)
	}

	return webhooks, nil
}

func (s *Service) createDelivery(ctx context.Context, webhook *models.Webhook, event *models.WebhookEvent) error {
	// Get max attempts from retry config
	maxAttempts := 3
	if webhook.RetryConfig != nil {
		if ma, ok := webhook.RetryConfig["max_attempts"].(float64); ok {
			maxAttempts = int(ma)
		}
	}

	delivery := &models.WebhookDelivery{
		ID:          uuid.New(),
		WebhookID:   webhook.ID,
		EventType:   event.Type,
		EventID:     event.ID,
		Payload:     event.Data,
		Status:      "pending",
		Attempts:    0,
		MaxAttempts: maxAttempts,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	query := `
		INSERT INTO webhook_deliveries (
			id, webhook_id, event_type, event_id, payload, status,
			attempts, max_attempts, created_at, updated_at
		) VALUES (
			:id, :webhook_id, :event_type, :event_id, :payload, :status,
			:attempts, :max_attempts, :created_at, :updated_at
		)
	`

	_, err := s.db.NamedExecContext(ctx, query, delivery)
	if err != nil {
		return fmt.Errorf("failed to create delivery: %w", err)
	}

	// Trigger immediate delivery in background goroutine
	// Note: This is a fire-and-forget delivery. For production use with high volumes,
	// consider using a message queue or worker pool for better control and monitoring.
	go func() {
		bgCtx := context.Background()
		if err := s.DeliverWebhook(bgCtx, delivery.ID); err != nil {
			s.logger.Error("Failed to deliver webhook",
				zap.Error(err),
				zap.String("delivery_id", delivery.ID.String()))
		}
	}()

	return nil
}

func (s *Service) updateDelivery(ctx context.Context, delivery *models.WebhookDelivery) error {
	query := `
		UPDATE webhook_deliveries SET
			status = :status,
			http_status_code = :http_status_code,
			response_body = :response_body,
			error_message = :error_message,
			attempts = :attempts,
			next_retry_at = :next_retry_at,
			delivered_at = :delivered_at,
			updated_at = :updated_at
		WHERE id = :id
	`

	_, err := s.db.NamedExecContext(ctx, query, delivery)
	if err != nil {
		return fmt.Errorf("failed to update delivery: %w", err)
	}

	return nil
}

func (s *Service) getDeliveryWithWebhook(ctx context.Context, deliveryID uuid.UUID) (*models.WebhookDelivery, *models.Webhook, error) {
	var delivery models.WebhookDelivery
	query := `SELECT * FROM webhook_deliveries WHERE id = $1`

	err := s.db.GetContext(ctx, &delivery, query, deliveryID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get delivery: %w", err)
	}

	var webhook models.Webhook
	query = `SELECT * FROM webhooks WHERE id = $1`

	err = s.db.GetContext(ctx, &webhook, query, delivery.WebhookID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get webhook: %w", err)
	}

	return &delivery, &webhook, nil
}

func (s *Service) updateLastTriggered(ctx context.Context, webhookID uuid.UUID) error {
	query := `
		UPDATE webhooks 
		SET last_triggered_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`

	_, err := s.db.ExecContext(ctx, query, webhookID)
	return err
}

func (s *Service) calculateNextRetry(attempts int, retryConfig map[string]interface{}) *time.Time {
	initialDelay := 5
	backoffMultiplier := 2

	if retryConfig != nil {
		if id, ok := retryConfig["initial_delay_seconds"].(float64); ok {
			initialDelay = int(id)
		}
		if bm, ok := retryConfig["backoff_multiplier"].(float64); ok {
			backoffMultiplier = int(bm)
		}
	}

	// Exponential backoff: initialDelay * (backoffMultiplier ^ attempts)
	delay := initialDelay
	for i := 0; i < attempts; i++ {
		delay *= backoffMultiplier
	}

	nextRetry := time.Now().Add(time.Duration(delay) * time.Second)
	return &nextRetry
}

func generateSecret() string {
	// Generate a cryptographically secure random 32-byte secret
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to using UUID if crypto/rand fails
		return strings.ReplaceAll(uuid.New().String(), "-", "")
	}
	return hex.EncodeToString(bytes)
}

func generateSignature(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}
