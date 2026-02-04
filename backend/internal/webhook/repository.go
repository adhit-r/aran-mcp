package webhook

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Repository handles webhook database operations
type Repository struct {
	db *sqlx.DB
}

// NewRepository creates a new webhook repository
func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

// Create creates a new webhook
func (r *Repository) Create(ctx context.Context, webhook *Webhook) error {
	query := `
		INSERT INTO webhooks (id, organization_id, name, url, secret, events, headers, is_active, description, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err := r.db.ExecContext(ctx, query,
		webhook.ID,
		webhook.OrganizationID,
		webhook.Name,
		webhook.URL,
		webhook.Secret,
		webhook.Events,
		webhook.Headers,
		webhook.IsActive,
		webhook.Description,
		webhook.CreatedBy,
		webhook.CreatedAt,
		webhook.UpdatedAt,
	)
	return err
}

// GetByID retrieves a webhook by ID
func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Webhook, error) {
	var webhook Webhook
	query := `
		SELECT id, organization_id, name, url, secret, events, headers, is_active, description, created_by, created_at, updated_at, deleted_at
		FROM webhooks
		WHERE id = $1 AND deleted_at IS NULL
	`
	err := r.db.GetContext(ctx, &webhook, query, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &webhook, err
}

// GetByOrganization retrieves all webhooks for an organization
func (r *Repository) GetByOrganization(ctx context.Context, orgID uuid.UUID) ([]Webhook, error) {
	var webhooks []Webhook
	query := `
		SELECT id, organization_id, name, url, secret, events, headers, is_active, description, created_by, created_at, updated_at, deleted_at
		FROM webhooks
		WHERE organization_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
	`
	err := r.db.SelectContext(ctx, &webhooks, query, orgID)
	return webhooks, err
}

// GetActiveByEvent retrieves all active webhooks subscribed to an event
func (r *Repository) GetActiveByEvent(ctx context.Context, orgID uuid.UUID, event EventType) ([]Webhook, error) {
	var webhooks []Webhook
	query := `
		SELECT id, organization_id, name, url, secret, events, headers, is_active, description, created_by, created_at, updated_at, deleted_at
		FROM webhooks
		WHERE organization_id = $1 
		  AND is_active = true 
		  AND deleted_at IS NULL
		  AND events @> $2::jsonb
		ORDER BY created_at ASC
	`
	// Convert event to JSON array element for containment check
	eventJSON := fmt.Sprintf(`["%s"]`, event)
	err := r.db.SelectContext(ctx, &webhooks, query, orgID, eventJSON)
	return webhooks, err
}

// Update updates a webhook
func (r *Repository) Update(ctx context.Context, webhook *Webhook) error {
	query := `
		UPDATE webhooks
		SET name = $2, url = $3, events = $4, headers = $5, is_active = $6, description = $7, updated_at = $8
		WHERE id = $1 AND deleted_at IS NULL
	`
	_, err := r.db.ExecContext(ctx, query,
		webhook.ID,
		webhook.Name,
		webhook.URL,
		webhook.Events,
		webhook.Headers,
		webhook.IsActive,
		webhook.Description,
		webhook.UpdatedAt,
	)
	return err
}

// Delete soft-deletes a webhook
func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE webhooks SET deleted_at = $2, updated_at = $2 WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.db.ExecContext(ctx, query, id, time.Now())
	return err
}

// RotateSecret generates and sets a new secret for a webhook
func (r *Repository) RotateSecret(ctx context.Context, id uuid.UUID, newSecret string) error {
	query := `UPDATE webhooks SET secret = $2, updated_at = $3 WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.db.ExecContext(ctx, query, id, newSecret, time.Now())
	return err
}

// CreateDelivery creates a new webhook delivery record
func (r *Repository) CreateDelivery(ctx context.Context, delivery *WebhookDelivery) error {
	query := `
		INSERT INTO webhook_deliveries (id, webhook_id, event, payload, status, attempts, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.ExecContext(ctx, query,
		delivery.ID,
		delivery.WebhookID,
		delivery.Event,
		delivery.Payload,
		delivery.Status,
		delivery.Attempts,
		delivery.CreatedAt,
		delivery.UpdatedAt,
	)
	return err
}

// UpdateDelivery updates a webhook delivery
func (r *Repository) UpdateDelivery(ctx context.Context, delivery *WebhookDelivery) error {
	query := `
		UPDATE webhook_deliveries
		SET status = $2, status_code = $3, response = $4, error_message = $5, attempts = $6, 
		    next_retry_at = $7, delivered_at = $8, duration_ms = $9, updated_at = $10
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query,
		delivery.ID,
		delivery.Status,
		delivery.StatusCode,
		delivery.Response,
		delivery.ErrorMessage,
		delivery.Attempts,
		delivery.NextRetryAt,
		delivery.DeliveredAt,
		delivery.DurationMs,
		delivery.UpdatedAt,
	)
	return err
}

// GetDeliveryByID retrieves a delivery by ID
func (r *Repository) GetDeliveryByID(ctx context.Context, id uuid.UUID) (*WebhookDelivery, error) {
	var delivery WebhookDelivery
	query := `
		SELECT id, webhook_id, event, payload, status, status_code, response, error_message, 
		       attempts, next_retry_at, delivered_at, duration_ms, created_at, updated_at
		FROM webhook_deliveries
		WHERE id = $1
	`
	err := r.db.GetContext(ctx, &delivery, query, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &delivery, err
}

// GetDeliveriesByWebhook retrieves deliveries for a webhook
func (r *Repository) GetDeliveriesByWebhook(ctx context.Context, webhookID uuid.UUID, limit int) ([]WebhookDelivery, error) {
	var deliveries []WebhookDelivery
	query := `
		SELECT id, webhook_id, event, payload, status, status_code, response, error_message, 
		       attempts, next_retry_at, delivered_at, duration_ms, created_at, updated_at
		FROM webhook_deliveries
		WHERE webhook_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`
	err := r.db.SelectContext(ctx, &deliveries, query, webhookID, limit)
	return deliveries, err
}

// GetPendingRetries retrieves deliveries that need to be retried
func (r *Repository) GetPendingRetries(ctx context.Context, limit int) ([]WebhookDelivery, error) {
	var deliveries []WebhookDelivery
	query := `
		SELECT id, webhook_id, event, payload, status, status_code, response, error_message, 
		       attempts, next_retry_at, delivered_at, duration_ms, created_at, updated_at
		FROM webhook_deliveries
		WHERE status IN ('pending', 'retrying') 
		  AND (next_retry_at IS NULL OR next_retry_at <= NOW())
		  AND attempts < 5
		ORDER BY created_at ASC
		LIMIT $1
	`
	err := r.db.SelectContext(ctx, &deliveries, query, limit)
	return deliveries, err
}

// GetDeliveryStats retrieves delivery statistics for a webhook
func (r *Repository) GetDeliveryStats(ctx context.Context, webhookID uuid.UUID, since time.Time) (*DeliveryStats, error) {
	var stats DeliveryStats
	query := `
		SELECT 
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'success') as successful,
			COUNT(*) FILTER (WHERE status = 'failed') as failed,
			COUNT(*) FILTER (WHERE status IN ('pending', 'retrying')) as pending,
			AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_duration_ms
		FROM webhook_deliveries
		WHERE webhook_id = $1 AND created_at >= $2
	`
	err := r.db.GetContext(ctx, &stats, query, webhookID, since)
	return &stats, err
}

// DeliveryStats represents webhook delivery statistics
type DeliveryStats struct {
	Total         int      `db:"total" json:"total"`
	Successful    int      `db:"successful" json:"successful"`
	Failed        int      `db:"failed" json:"failed"`
	Pending       int      `db:"pending" json:"pending"`
	AvgDurationMs *float64 `db:"avg_duration_ms" json:"avg_duration_ms,omitempty"`
}
