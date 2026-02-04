// Webhook Integration for main.go
// 
// Add this import to the imports section:
//   "github.com/radhi1991/aran-mcp-sentinel/internal/webhook"
//
// Add this code after alertsHandler.RegisterRoutes(protected):

// Webhook initialization code:
/*
	// Initialize webhook service
	webhookRepo := webhook.NewRepository(dbConn.DB)
	webhookService := webhook.NewService(webhookRepo, logger)
	webhookHandler := webhook.NewHandler(webhookService, logger)
	webhookHandler.RegisterRoutes(protected)

	// Start webhook retry processor
	webhookCtx, webhookCancel := context.WithCancel(context.Background())
	defer webhookCancel()
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-webhookCtx.Done():
				return
			case <-ticker.C:
				if err := webhookService.ProcessRetries(webhookCtx); err != nil {
					logger.Error("Failed to process webhook retries", zap.Error(err))
				}
			}
		}
	}()
	logger.Info("Started webhook retry processor", zap.Duration("interval", 1*time.Minute))
*/

// Example usage from other services to trigger webhooks:
/*
	// In monitoring/alerts handler when an alert is created:
	webhookService.TriggerEvent(ctx, orgID, webhook.EventAlertCreated, map[string]interface{}{
		"alert_id": alert.ID,
		"title":    alert.Title,
		"severity": alert.Severity,
		"message":  alert.Message,
	})

	// In MCP handler when a server status changes:
	webhookService.TriggerEvent(ctx, orgID, webhook.EventServerStatusDown, map[string]interface{}{
		"server_id":   server.ID,
		"server_name": server.Name,
		"status":      "down",
		"error":       errorMsg,
	})

	// In security handler when a scan completes:
	webhookService.TriggerEvent(ctx, orgID, webhook.EventSecurityScanCompleted, map[string]interface{}{
		"scan_id":        scan.ID,
		"vulnerabilities": vulnerabilityCount,
		"score":          securityScore,
	})
*/
