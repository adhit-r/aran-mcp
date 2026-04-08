package webhook

import (
	"testing"
	"time"
)

func TestGenerateAndVerifySignature(t *testing.T) {
	secret := "test-secret-key-12345"
	payload := []byte(`{"event":"test.event","data":{"message":"hello"}}`)
	timestamp := time.Now().Unix()

	// Generate signature
	signature := GenerateSignature(secret, timestamp, payload)

	// Verify the signature
	if !VerifySignature(secret, signature, timestamp, payload) {
		t.Error("Signature verification failed for valid signature")
	}

	// Test with wrong secret
	if VerifySignature("wrong-secret", signature, timestamp, payload) {
		t.Error("Signature verification should fail with wrong secret")
	}

	// Test with tampered payload
	tamperedPayload := []byte(`{"event":"test.event","data":{"message":"tampered"}}`)
	if VerifySignature(secret, signature, timestamp, tamperedPayload) {
		t.Error("Signature verification should fail with tampered payload")
	}

	// Test with wrong timestamp
	if VerifySignature(secret, signature, timestamp+1, payload) {
		t.Error("Signature verification should fail with wrong timestamp")
	}
}

func TestGenerateSecret(t *testing.T) {
	secret1, err := GenerateSecret()
	if err != nil {
		t.Fatalf("GenerateSecret failed: %v", err)
	}

	if len(secret1) != 64 { // 32 bytes = 64 hex chars
		t.Errorf("Expected secret length 64, got %d", len(secret1))
	}

	// Generate another secret and ensure they're different
	secret2, err := GenerateSecret()
	if err != nil {
		t.Fatalf("GenerateSecret failed: %v", err)
	}

	if secret1 == secret2 {
		t.Error("Generated secrets should be unique")
	}
}

func TestAllEventTypes(t *testing.T) {
	events := AllEventTypes()
	if len(events) == 0 {
		t.Error("AllEventTypes should return at least one event type")
	}

	// Check for expected events
	expectedEvents := []EventType{
		EventServerCreated,
		EventServerStatusDown,
		EventAlertCreated,
		EventSecurityScanCompleted,
	}

	eventSet := make(map[EventType]bool)
	for _, e := range events {
		eventSet[e] = true
	}

	for _, expected := range expectedEvents {
		if !eventSet[expected] {
			t.Errorf("Expected event type %s not found", expected)
		}
	}
}

func TestRetryDelays(t *testing.T) {
	if len(RetryDelays) != 5 {
		t.Errorf("Expected 5 retry delays, got %d", len(RetryDelays))
	}

	// Ensure delays are increasing
	for i := 1; i < len(RetryDelays); i++ {
		if RetryDelays[i] <= RetryDelays[i-1] {
			t.Errorf("Retry delays should be increasing: %v <= %v at index %d",
				RetryDelays[i], RetryDelays[i-1], i)
		}
	}
}

func TestWebhookToResponse(t *testing.T) {
	webhook := &Webhook{
		ID:             [16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16},
		OrganizationID: [16]byte{16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1},
		Name:           "Test Webhook",
		URL:            "https://example.com/webhook",
		Secret:         "secret-should-not-appear",
		Events:         []string{"server.created", "alert.created"},
		Headers:        JSONB{"Authorization": "Bearer token"},
		IsActive:       true,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	response := webhookToResponse(webhook)

	if response.Name != webhook.Name {
		t.Errorf("Expected name %s, got %s", webhook.Name, response.Name)
	}

	if response.Secret != "" {
		t.Error("Secret should not be included in response")
	}

	if response.URL != webhook.URL {
		t.Errorf("Expected URL %s, got %s", webhook.URL, response.URL)
	}
}

func TestConvertHeaders(t *testing.T) {
	headers := map[string]string{
		"Authorization": "Bearer token",
		"X-Custom":      "value",
	}

	jsonb := convertHeaders(headers)

	if jsonb["Authorization"] != "Bearer token" {
		t.Error("Header conversion failed")
	}

	// Test nil headers
	nilHeaders := convertHeaders(nil)
	if nilHeaders != nil {
		t.Error("Nil headers should return nil JSONB")
	}
}

func TestDeliveryStatusConstants(t *testing.T) {
	statuses := []DeliveryStatus{
		DeliveryStatusPending,
		DeliveryStatusSuccess,
		DeliveryStatusFailed,
		DeliveryStatusRetrying,
	}

	for _, s := range statuses {
		if s == "" {
			t.Error("Delivery status should not be empty")
		}
	}
}
