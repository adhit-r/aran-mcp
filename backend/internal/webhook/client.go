package webhook

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"
)

// Client provides methods for verifying incoming webhooks and sending webhook-style requests
type Client struct {
	secret string
}

// NewClient creates a new webhook client for verification
func NewClient(secret string) *Client {
	return &Client{secret: secret}
}

// VerifyRequest verifies an incoming webhook request
func (c *Client) VerifyRequest(r *http.Request) error {
	signature := r.Header.Get("X-Webhook-Signature")
	timestampStr := r.Header.Get("X-Webhook-Timestamp")

	if signature == "" || timestampStr == "" {
		return fmt.Errorf("missing signature or timestamp headers")
	}

	timestamp, err := strconv.ParseInt(timestampStr, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid timestamp: %w", err)
	}

	// Check timestamp is within 5 minutes (replay attack prevention)
	age := time.Since(time.Unix(timestamp, 0))
	if age > 5*time.Minute || age < -5*time.Minute {
		return fmt.Errorf("timestamp too old or too far in the future: %v", age)
	}

	// Read body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return fmt.Errorf("failed to read body: %w", err)
	}
	// Restore body for downstream handlers
	r.Body = io.NopCloser(bytes.NewReader(body))

	// Verify signature
	if !VerifySignature(c.secret, signature, timestamp, body) {
		return fmt.Errorf("signature verification failed")
	}

	return nil
}

// VerifyMiddleware returns an HTTP middleware that verifies webhook signatures
func (c *Client) VerifyMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := c.VerifyRequest(r); err != nil {
			http.Error(w, fmt.Sprintf("Webhook verification failed: %v", err), http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ParsePayload parses the webhook payload from the request
func ParsePayload(r *http.Request) (*WebhookPayload, error) {
	var payload WebhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("failed to decode payload: %w", err)
	}
	return &payload, nil
}

// SignRequest signs an outgoing webhook request
func SignRequest(secret string, req *http.Request, body []byte) {
	timestamp := time.Now().Unix()
	signature := GenerateSignature(secret, timestamp, body)

	req.Header.Set("X-Webhook-Signature", signature)
	req.Header.Set("X-Webhook-Timestamp", strconv.FormatInt(timestamp, 10))
}

// ComputeSignature computes a webhook signature for a payload
// This is useful for implementing custom webhook sending
func ComputeSignature(secret string, payload []byte) (signature string, timestamp int64) {
	timestamp = time.Now().Unix()
	data := fmt.Sprintf("%d.%s", timestamp, string(payload))
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(data))
	signature = "sha256=" + hex.EncodeToString(h.Sum(nil))
	return
}

// Example verification code for webhook receivers:
/*
package main

import (
	"fmt"
	"net/http"
	
	"github.com/radhi1991/aran-mcp-sentinel/internal/webhook"
)

func main() {
	secret := "your-webhook-secret"
	client := webhook.NewClient(secret)

	http.HandleFunc("/webhook", func(w http.ResponseWriter, r *http.Request) {
		// Verify the webhook signature
		if err := client.VerifyRequest(r); err != nil {
			http.Error(w, "Invalid signature", http.StatusUnauthorized)
			return
		}

		// Parse the payload
		payload, err := webhook.ParsePayload(r)
		if err != nil {
			http.Error(w, "Invalid payload", http.StatusBadRequest)
			return
		}

		// Handle the event
		fmt.Printf("Received event: %s\n", payload.Event)
		fmt.Printf("Data: %+v\n", payload.Data)

		w.WriteHeader(http.StatusOK)
	})

	http.ListenAndServe(":8080", nil)
}
*/
