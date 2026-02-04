# Webhook Testing Guide

This guide helps you test the webhook implementation locally.

## Quick Start

### 1. Start a Local Webhook Receiver

Use one of these methods to create a test webhook endpoint:

#### Option A: Using webhook.site (Easiest)
1. Go to https://webhook.site
2. Copy the unique URL provided
3. Use this URL when creating a webhook in Aran MCP Sentinel

#### Option B: Using Request Bin (Alternative)
1. Go to https://requestbin.com
2. Create a new bin
3. Use the provided URL for your webhook

#### Option C: Local Server (For Development)

Create a simple webhook receiver:

**Node.js/Express:**
```javascript
// webhook-receiver.js
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
  console.log('\n=== Webhook Received ===');
  console.log('Headers:', req.headers);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  // Verify signature (optional for testing)
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET || 'test-secret';
  const payload = JSON.stringify(req.body);
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  console.log('Signature valid:', signature === expectedSignature);
  
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Webhook receiver listening on http://localhost:${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
});
```

Run it:
```bash
node webhook-receiver.js
```

**Python/Flask:**
```python
# webhook_receiver.py
from flask import Flask, request
import hmac
import hashlib
import json
import os

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    print('\n=== Webhook Received ===')
    print('Headers:', dict(request.headers))
    print('Body:', json.dumps(request.json, indent=2))
    
    # Verify signature (optional for testing)
    signature = request.headers.get('X-Webhook-Signature')
    secret = os.environ.get('WEBHOOK_SECRET', 'test-secret')
    payload = request.get_data()
    
    expected_signature = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    print('Signature valid:', signature == expected_signature)
    
    return 'OK', 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3001))
    print(f'Webhook receiver listening on http://localhost:{port}')
    print(f'Webhook URL: http://localhost:{port}/webhook')
    app.run(port=port, debug=True)
```

Run it:
```bash
python webhook_receiver.py
```

### 2. Expose Local Server (If Using Local Option)

If testing locally, you need to expose your local server to the internet:

**Using ngrok:**
```bash
ngrok http 3001
```

Copy the HTTPS URL provided (e.g., `https://abc123.ngrok.io`)

### 3. Create a Webhook in Aran MCP Sentinel

#### Using the UI:
1. Navigate to `/webhooks` in the web interface
2. Click "Create Webhook"
3. Fill in the form:
   - **Name**: Test Webhook
   - **URL**: Your webhook endpoint URL
   - **Events**: Select events you want to test (e.g., `server.status.changed`)
   - **Active**: Checked
4. Click "Create Webhook"

#### Using the API:
```bash
curl -X POST http://localhost:8081/api/v1/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Webhook",
    "url": "https://webhook.site/your-unique-id",
    "events": [
      "server.status.changed",
      "alert.triggered"
    ],
    "is_active": true
  }'
```

### 4. Test the Webhook

#### Using the Test Button in UI:
1. Go to the webhooks list page
2. Click the "Play" icon on your webhook
3. Check your webhook receiver for the test event

#### Using the API:
```bash
curl -X POST http://localhost:8081/api/v1/webhooks/{webhook-id}/test \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "test.event",
    "test_data": {
      "message": "This is a test webhook"
    }
  }'
```

### 5. Trigger Real Events

To test with real events, perform actions that trigger webhook events:

#### Server Status Change:
```bash
# Update a server status
curl -X PUT http://localhost:8081/api/v1/mcp/servers/{server-id} \
  -H "Content-Type: application/json" \
  -d '{
    "status": "offline"
  }'
```

#### Create an Alert:
```bash
# Create a test alert
curl -X POST http://localhost:8081/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "server_id": "{server-id}",
    "type": "health",
    "severity": "high",
    "message": "Test alert"
  }'
```

## Verifying Webhook Deliveries

### Check Delivery History:

#### In the UI:
1. Click on your webhook to view details
2. Scroll down to "Delivery History"
3. Click on any delivery to see full details including:
   - HTTP status code
   - Response body
   - Error messages (if any)
   - Retry attempts

#### Using the API:
```bash
curl http://localhost:8081/api/v1/webhooks/{webhook-id}/deliveries
```

## Testing Retry Logic

To test the retry mechanism:

1. Create a webhook with an invalid URL or a URL that returns errors
2. Trigger an event
3. Watch the delivery history to see retry attempts
4. Observe exponential backoff between retries

Example invalid URL:
```json
{
  "name": "Test Retry Webhook",
  "url": "https://httpstat.us/500",
  "events": ["test.event"],
  "is_active": true,
  "retry_config": {
    "max_attempts": 3,
    "backoff_multiplier": 2,
    "initial_delay_seconds": 5
  }
}
```

## Testing Signature Verification

If using a local server, add signature verification:

```javascript
function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

The webhook secret is stored in the database but not returned in API responses for security. To get the secret for testing:
1. Check the database directly
2. Or use the signature provided in the `X-Webhook-Signature` header as the expected value

## Common Issues

### Webhook Not Firing
**Problem**: Event occurs but webhook doesn't trigger

**Solutions**:
- Verify webhook is active (green status badge)
- Check event type matches subscribed events exactly
- Review application logs for errors

### Delivery Fails Immediately
**Problem**: All delivery attempts fail instantly

**Solutions**:
- Verify URL is accessible from the internet
- Check HTTPS certificate is valid
- Ensure endpoint responds within 30 seconds
- Check firewall/network settings

### Signature Verification Fails
**Problem**: Signature doesn't match

**Solutions**:
- Use raw request body (before JSON parsing)
- Verify HMAC algorithm is SHA256
- Ensure secret matches (check database)
- Compare hex-encoded strings

### Webhook Times Out
**Problem**: Delivery attempts timeout

**Solutions**:
- Reduce processing time in webhook endpoint
- Return 200 status immediately
- Process webhook data asynchronously
- Check network connectivity

## Load Testing

To test webhook performance under load:

```bash
# Create multiple test webhooks
for i in {1..10}; do
  curl -X POST http://localhost:8081/api/v1/webhooks \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Load Test Webhook $i\",
      \"url\": \"https://webhook.site/your-id\",
      \"events\": [\"test.event\"],
      \"is_active\": true
    }"
done

# Trigger events rapidly
for i in {1..100}; do
  curl -X POST http://localhost:8081/api/v1/webhooks/{webhook-id}/test \
    -H "Content-Type: application/json" \
    -d '{
      "event_type": "test.event",
      "test_data": {"iteration": '$i'}
    }' &
done
wait
```

## Cleanup

After testing, remove test webhooks:

#### In the UI:
Click the trash icon on each test webhook

#### Using the API:
```bash
curl -X DELETE http://localhost:8081/api/v1/webhooks/{webhook-id}
```

## Next Steps

After successful testing:

1. Document your webhook integration
2. Set up monitoring for webhook failures
3. Implement proper signature verification
4. Configure production retry policies
5. Add logging and alerting for critical events

## Support

For issues or questions:
- Check the main webhook documentation: `docs/WEBHOOKS.md`
- Review delivery history for detailed error messages
- Check application logs: `backend/logs/`
- Open an issue on GitHub with:
  - Webhook configuration
  - Delivery history
  - Error messages
  - Steps to reproduce
