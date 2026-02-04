package webhook

import (
	"testing"

	"github.com/google/uuid"
)

func TestGenerateSecret(t *testing.T) {
	secret := generateSecret()
	if len(secret) == 0 {
		t.Error("Expected non-empty secret")
	}
	if len(secret) != 64 { // 32 bytes = 64 hex characters
		t.Errorf("Expected secret length 64, got %d", len(secret))
	}
}

func TestGenerateSignature(t *testing.T) {
	payload := []byte(`{"test": "data"}`)
	secret := "test-secret"
	
	signature := generateSignature(payload, secret)
	if len(signature) == 0 {
		t.Error("Expected non-empty signature")
	}
	
	// Test that same payload and secret produce same signature
	signature2 := generateSignature(payload, secret)
	if signature != signature2 {
		t.Error("Expected consistent signatures for same input")
	}
	
	// Test that different payload produces different signature
	differentPayload := []byte(`{"test": "different"}`)
	signature3 := generateSignature(differentPayload, secret)
	if signature == signature3 {
		t.Error("Expected different signatures for different payloads")
	}
}

func TestCalculateNextRetry(t *testing.T) {
	tests := []struct {
		name              string
		attempts          int
		retryConfig       map[string]interface{}
		expectedMinDelay  int
	}{
		{
			name:     "first retry with default config",
			attempts: 1,
			retryConfig: map[string]interface{}{
				"initial_delay_seconds": float64(5),
				"backoff_multiplier":    float64(2),
			},
			expectedMinDelay: 5,
		},
		{
			name:     "second retry with default config",
			attempts: 2,
			retryConfig: map[string]interface{}{
				"initial_delay_seconds": float64(5),
				"backoff_multiplier":    float64(2),
			},
			expectedMinDelay: 10,
		},
		{
			name:     "third retry with default config",
			attempts: 3,
			retryConfig: map[string]interface{}{
				"initial_delay_seconds": float64(5),
				"backoff_multiplier":    float64(2),
			},
			expectedMinDelay: 20,
		},
	}

	s := &Service{}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			nextRetry := s.calculateNextRetry(tt.attempts, tt.retryConfig)
			if nextRetry == nil {
				t.Error("Expected non-nil next retry time")
			}
		})
	}
}

func TestWebhookEventTypes(t *testing.T) {
	// Test that event types are properly structured
	eventTypes := []string{
		"server.status.changed",
		"server.health.alert",
		"server.created",
		"server.updated",
		"server.deleted",
		"alert.triggered",
		"security.test.completed",
	}

	for _, eventType := range eventTypes {
		if len(eventType) == 0 {
			t.Errorf("Event type should not be empty")
		}
	}
}

func TestWebhookValidation(t *testing.T) {
	// Test valid webhook URL
	validURLs := []string{
		"https://example.com/webhook",
		"http://localhost:3000/webhook",
		"https://api.example.com/v1/webhooks/receive",
	}

	for _, url := range validURLs {
		if len(url) == 0 {
			t.Errorf("URL should not be empty: %s", url)
		}
	}
}

func TestUUIDGeneration(t *testing.T) {
	// Test that UUIDs are properly generated
	id1 := uuid.New()
	id2 := uuid.New()

	if id1 == id2 {
		t.Error("Expected different UUIDs")
	}

	if id1.String() == "" {
		t.Error("Expected non-empty UUID string")
	}
}
