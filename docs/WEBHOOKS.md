# Webhook Support Documentation

## Overview
Aran MCP Sentinel now supports webhooks for event notifications, enabling integrations with external systems like SIEM platforms, chat applications, monitoring tools, and custom automation systems.

## Features

### Core Capabilities
- **Event-driven Notifications**: Subscribe to specific MCP server and system events
- **Reliable Delivery**: Built-in retry mechanism with exponential backoff
- **Security**: HMAC-SHA256 signature verification for webhook authenticity
- **Delivery Tracking**: Complete history of all webhook deliveries
- **Flexible Configuration**: Custom headers, retry policies, and event subscriptions
- **Real-time Testing**: Test webhook endpoints before deployment

### Supported Event Types

The following event types can trigger webhooks:

#### Server Events
- `server.status.changed` - Server status changes (online, offline, error)
- `server.health.alert` - Server health deteriorates
- `server.created` - New MCP server registered
- `server.updated` - Server configuration updated
- `server.deleted` - Server removed

#### Alert Events
- `alert.triggered` - New alert created
- `alert.resolved` - Alert marked as resolved

#### Security Events
- `security.test.completed` - Security test finishes

#### Discovery Events
- `discovery.scan.completed` - Server discovery scan completes

## API Endpoints

All webhook endpoints are under `/api/v1/webhooks` and require authentication.

### Create Webhook
```http
POST /api/v1/webhooks
Content-Type: application/json

{
  "name": "My Webhook",
  "url": "https://example.com/webhook",
  "description": "Webhook for monitoring alerts",
  "events": [
    "server.status.changed",
    "alert.triggered"
  ],
  "is_active": true,
  "headers": {
    "X-Custom-Header": "value"
  },
  "retry_config": {
    "max_attempts": 3,
    "backoff_multiplier": 2,
    "initial_delay_seconds": 5
  }
}
```

### List Webhooks
```http
GET /api/v1/webhooks
```

### Get Webhook
```http
GET /api/v1/webhooks/:id
```

### Update Webhook
```http
PUT /api/v1/webhooks/:id
Content-Type: application/json

{
  "name": "Updated Webhook",
  "is_active": true
}
```

### Delete Webhook
```http
DELETE /api/v1/webhooks/:id
```

### Test Webhook
```http
POST /api/v1/webhooks/:id/test
Content-Type: application/json

{
  "event_type": "test.event",
  "test_data": {
    "message": "This is a test"
  }
}
```

### Get Delivery History
```http
GET /api/v1/webhooks/:id/deliveries?limit=50&offset=0
```

## Webhook Payload Format

All webhook deliveries use the following payload format:

```json
{
  "id": "event-uuid",
  "type": "server.status.changed",
  "data": {
    "server_id": "server-uuid",
    "server_name": "Production Server",
    "old_status": "online",
    "new_status": "offline",
    "timestamp": "2026-02-04T16:00:00Z"
  },
  "timestamp": "2026-02-04T16:00:00Z"
}
```

## Webhook Headers

Every webhook request includes the following headers:

- `Content-Type: application/json` - Always JSON payload
- `User-Agent: Aran-MCP-Webhook/1.0` - Identifies webhook source
- `X-Webhook-ID: <webhook-uuid>` - Unique webhook identifier
- `X-Event-Type: <event-type>` - Type of event triggering the webhook
- `X-Delivery-ID: <delivery-uuid>` - Unique delivery attempt identifier
- `X-Webhook-Signature: <hmac-signature>` - HMAC-SHA256 signature for verification

Custom headers configured in the webhook will also be included.

## Security

### Signature Verification

Every webhook includes an `X-Webhook-Signature` header containing an HMAC-SHA256 signature of the payload. To verify:

```javascript
// Node.js example
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

// In your webhook handler
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  if (verifyWebhook(payload, signature, process.env.WEBHOOK_SECRET)) {
    // Process webhook
    res.status(200).send('OK');
  } else {
    res.status(401).send('Invalid signature');
  }
});
```

```python
# Python example
import hmac
import hashlib

def verify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    expected_signature = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected_signature)

# In your webhook handler (Flask example)
@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data()
    
    if verify_webhook(payload, signature, os.environ['WEBHOOK_SECRET']):
        # Process webhook
        return 'OK', 200
    else:
        return 'Invalid signature', 401
```

```go
// Go example
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "io"
    "net/http"
)

func verifyWebhook(payload []byte, signature string, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    expectedSignature := hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    signature := r.Header.Get("X-Webhook-Signature")
    payload, err := io.ReadAll(r.Body)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        return
    }
    
    if verifyWebhook(payload, signature, os.Getenv("WEBHOOK_SECRET")) {
        // Process webhook
        w.WriteHeader(http.StatusOK)
    } else {
        w.WriteHeader(http.StatusUnauthorized)
    }
}
```

## Retry Logic

Webhooks implement automatic retry with exponential backoff:

1. **Initial Delivery**: Immediate delivery attempt
2. **First Retry**: After `initial_delay_seconds` (default: 5 seconds)
3. **Second Retry**: After `initial_delay × backoff_multiplier` (default: 10 seconds)
4. **Third Retry**: After `initial_delay × backoff_multiplier²` (default: 20 seconds)

After `max_attempts` (default: 3), the delivery is marked as failed.

### Customizing Retry Behavior

```json
{
  "retry_config": {
    "max_attempts": 5,
    "backoff_multiplier": 3,
    "initial_delay_seconds": 10
  }
}
```

## Integration Examples

### Slack Integration

```javascript
// Example webhook endpoint for Slack
app.post('/webhook-to-slack', async (req, res) => {
  const { type, data } = req.body;
  
  let message = `*${type}*\n`;
  
  if (type === 'server.status.changed') {
    message += `Server ${data.server_name} changed from ${data.old_status} to ${data.new_status}`;
  } else if (type === 'alert.triggered') {
    message += `New alert: ${data.message}`;
  }
  
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message })
  });
  
  res.status(200).send('OK');
});
```

### Discord Integration

```javascript
app.post('/webhook-to-discord', async (req, res) => {
  const { type, data } = req.body;
  
  const embed = {
    title: type,
    description: JSON.stringify(data, null, 2),
    color: type.includes('error') || type.includes('alert') ? 0xff0000 : 0x00ff00,
    timestamp: new Date().toISOString()
  };
  
  await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] })
  });
  
  res.status(200).send('OK');
});
```

### Custom Automation

```python
# Example: Trigger incident response on critical alerts
@app.route('/webhook', methods=['POST'])
def handle_webhook():
    event = request.json
    
    if event['type'] == 'alert.triggered':
        severity = event['data'].get('severity')
        
        if severity == 'critical':
            # Create PagerDuty incident
            create_pagerduty_incident(event['data'])
            
            # Send email to on-call team
            send_alert_email(event['data'])
            
            # Log to SIEM
            log_to_siem(event)
    
    return 'OK', 200
```

## Best Practices

1. **Verify Signatures**: Always verify webhook signatures to ensure authenticity
2. **Respond Quickly**: Return 2xx status code within 5 seconds to avoid retries
3. **Process Asynchronously**: Queue webhook processing for time-consuming operations
4. **Monitor Failures**: Track failed deliveries and investigate causes
5. **Use HTTPS**: Only use HTTPS endpoints for security
6. **Handle Retries**: Design endpoints to be idempotent (safe to process multiple times)
7. **Log Everything**: Maintain detailed logs of webhook processing for debugging
8. **Test Thoroughly**: Use the test endpoint to verify your integration before going live

## Troubleshooting

### Webhook Not Firing
- Check webhook is active (`is_active: true`)
- Verify event type matches subscribed events
- Check delivery history for error messages

### Delivery Failures
- Ensure endpoint is accessible from internet
- Verify HTTPS certificate is valid
- Check endpoint responds within 30 seconds
- Review error messages in delivery history

### Signature Verification Fails
- Ensure using raw request body (not parsed JSON)
- Verify secret matches webhook configuration
- Check HMAC algorithm is SHA256
- Ensure comparing hex-encoded strings

## UI Features

The webhook management UI provides:

- **List View**: Overview of all configured webhooks
- **Create/Edit Modal**: Easy webhook configuration
- **Test Button**: Send test events to verify integration
- **Toggle Active**: Quickly enable/disable webhooks
- **Delivery History**: View all delivery attempts with details
- **Status Indicators**: Visual feedback on webhook health

## API Event Triggering

To trigger webhooks from your code:

```go
// Import webhook service
import "github.com/radhi1991/aran-mcp-sentinel/internal/webhook"

// Get organization ID and create event
orgID := uuid.MustParse("org-uuid")
event := &models.WebhookEvent{
    ID:   uuid.New(),
    Type: "server.status.changed",
    Data: map[string]interface{}{
        "server_id": serverID,
        "server_name": "Production Server",
        "old_status": "online",
        "new_status": "offline",
        "timestamp": time.Now(),
    },
}

// Trigger webhooks
err := webhookService.TriggerEvent(ctx, orgID, event)
if err != nil {
    log.Error("Failed to trigger webhooks", zap.Error(err))
}
```

## Support

For issues or questions about webhook integration:
- Check the delivery history for error details
- Review server logs for webhook processing errors
- Consult the API documentation
- Open an issue on the GitHub repository
