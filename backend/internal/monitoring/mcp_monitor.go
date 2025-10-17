package monitoring

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/radhi1991/aran-mcp-sentinel/internal/mcp"
	"go.uber.org/zap"
)

// MCPMonitor provides comprehensive monitoring for MCP servers
type MCPMonitor struct {
	db       *sql.DB
	logger   *zap.Logger
	protocol *mcp.MCPProtocol
	monitors map[string]*ServerMonitor
	mu       sync.RWMutex
}

// ServerMonitor tracks monitoring state for a single server
type ServerMonitor struct {
	ServerID     uuid.UUID
	URL          string
	Name         string
	Status       string
	LastCheck    time.Time
	ResponseTime time.Duration
	ErrorCount   int
	UptimeStart  time.Time
	Metrics      *ServerMetrics
	cancel       context.CancelFunc
}

// ServerMetrics holds detailed metrics for a server
type ServerMetrics struct {
	TotalRequests    int64         `json:"total_requests"`
	SuccessfulReqs   int64         `json:"successful_requests"`
	FailedRequests   int64         `json:"failed_requests"`
	AverageResponse  time.Duration `json:"average_response_time"`
	UptimePercentage float64       `json:"uptime_percentage"`
	LastError        string        `json:"last_error,omitempty"`
	ToolsCount       int           `json:"tools_count"`
	ResourcesCount   int           `json:"resources_count"`
	PromptsCount     int           `json:"prompts_count"`
}

// HealthCheckResult represents the result of a health check
type HealthCheckResult struct {
	ServerID     uuid.UUID     `json:"server_id"`
	URL          string        `json:"url"`
	Status       string        `json:"status"`
	ResponseTime time.Duration `json:"response_time"`
	Error        string        `json:"error,omitempty"`
	Timestamp    time.Time     `json:"timestamp"`
	Details      interface{}   `json:"details,omitempty"`
}

// AlertLevel represents the severity of an alert
type AlertLevel string

const (
	AlertLevelInfo     AlertLevel = "info"
	AlertLevelWarning  AlertLevel = "warning"
	AlertLevelCritical AlertLevel = "critical"
)

// Alert represents a monitoring alert
type Alert struct {
	ID        uuid.UUID  `json:"id"`
	ServerID  uuid.UUID  `json:"server_id"`
	Level     AlertLevel `json:"level"`
	Message   string     `json:"message"`
	Details   string     `json:"details"`
	Timestamp time.Time  `json:"timestamp"`
	Resolved  bool       `json:"resolved"`
}

// NewMCPMonitor creates a new MCP monitor
func NewMCPMonitor(db *sql.DB, logger *zap.Logger) *MCPMonitor {
	return &MCPMonitor{
		db:       db,
		logger:   logger,
		protocol: mcp.NewMCPProtocol(logger),
		monitors: make(map[string]*ServerMonitor),
	}
}

// StartMonitoring begins monitoring an MCP server
func (m *MCPMonitor) StartMonitoring(serverID uuid.UUID, url, name string, interval time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Stop existing monitor if any
	if existing, exists := m.monitors[url]; exists {
		existing.cancel()
	}

	ctx, cancel := context.WithCancel(context.Background())
	
	monitor := &ServerMonitor{
		ServerID:    serverID,
		URL:         url,
		Name:        name,
		Status:      "unknown",
		UptimeStart: time.Now(),
		Metrics:     &ServerMetrics{},
		cancel:      cancel,
	}

	m.monitors[url] = monitor

	// Start monitoring goroutine
	go m.monitorServer(ctx, monitor, interval)

	m.logger.Info("Started monitoring MCP server",
		zap.String("server_id", serverID.String()),
		zap.String("url", url),
		zap.String("name", name),
		zap.Duration("interval", interval),
	)

	return nil
}

// StopMonitoring stops monitoring an MCP server
func (m *MCPMonitor) StopMonitoring(url string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if monitor, exists := m.monitors[url]; exists {
		monitor.cancel()
		delete(m.monitors, url)
		
		m.logger.Info("Stopped monitoring MCP server",
			zap.String("url", url),
		)
	}
}

// GetServerStatus returns the current status of a monitored server
func (m *MCPMonitor) GetServerStatus(url string) (*ServerMonitor, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	monitor, exists := m.monitors[url]
	return monitor, exists
}

// GetAllStatuses returns status for all monitored servers
func (m *MCPMonitor) GetAllStatuses() []*ServerMonitor {
	m.mu.RLock()
	defer m.mu.RUnlock()

	statuses := make([]*ServerMonitor, 0, len(m.monitors))
	for _, monitor := range m.monitors {
		statuses = append(statuses, monitor)
	}

	return statuses
}

// monitorServer performs continuous monitoring of a single server
func (m *MCPMonitor) monitorServer(ctx context.Context, monitor *ServerMonitor, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Perform initial check
	m.performHealthCheck(ctx, monitor)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			m.performHealthCheck(ctx, monitor)
		}
	}
}

// performHealthCheck executes a comprehensive health check
func (m *MCPMonitor) performHealthCheck(ctx context.Context, monitor *ServerMonitor) {
	checkCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	start := time.Now()
	result := &HealthCheckResult{
		ServerID:  monitor.ServerID,
		URL:       monitor.URL,
		Timestamp: start,
	}

	// Update request count
	monitor.Metrics.TotalRequests++

	// Perform MCP ping
	err := m.protocol.Ping(checkCtx, monitor.URL)
	responseTime := time.Since(start)
	
	if err != nil {
		// Server is down or unresponsive
		monitor.Status = "offline"
		monitor.ErrorCount++
		monitor.Metrics.FailedRequests++
		monitor.Metrics.LastError = err.Error()
		
		result.Status = "offline"
		result.Error = err.Error()
		
		m.logger.Warn("MCP server health check failed",
			zap.String("url", monitor.URL),
			zap.Error(err),
			zap.Duration("response_time", responseTime),
		)

		// Generate alert for server down
		m.generateAlert(monitor, AlertLevelCritical, "Server offline", err.Error())
	} else {
		// Server is responsive
		previousStatus := monitor.Status
		monitor.Status = "online"
		monitor.ErrorCount = 0
		monitor.Metrics.SuccessfulReqs++
		
		result.Status = "online"
		
		// If server was previously down, generate recovery alert
		if previousStatus == "offline" {
			m.generateAlert(monitor, AlertLevelInfo, "Server recovered", "Server is back online")
		}

		// Perform detailed capability check
		details, err := m.performDetailedCheck(checkCtx, monitor)
		if err != nil {
			m.logger.Warn("Detailed check failed", zap.String("url", monitor.URL), zap.Error(err))
		} else {
			result.Details = details
		}
	}

	// Update metrics
	monitor.LastCheck = time.Now()
	monitor.ResponseTime = responseTime
	result.ResponseTime = responseTime

	// Calculate uptime percentage
	totalTime := time.Since(monitor.UptimeStart)
	if monitor.Metrics.TotalRequests > 0 {
		monitor.Metrics.UptimePercentage = float64(monitor.Metrics.SuccessfulReqs) / float64(monitor.Metrics.TotalRequests) * 100
	}

	// Update average response time
	if monitor.Metrics.SuccessfulReqs > 0 {
		// Simple moving average (could be improved with exponential moving average)
		monitor.Metrics.AverageResponse = (monitor.Metrics.AverageResponse*time.Duration(monitor.Metrics.SuccessfulReqs-1) + responseTime) / time.Duration(monitor.Metrics.SuccessfulReqs)
	}

	// Store result in database
	m.storeHealthCheckResult(result)

	// Check for performance alerts
	m.checkPerformanceAlerts(monitor)
}

// performDetailedCheck performs detailed capability and tool checks
func (m *MCPMonitor) performDetailedCheck(ctx context.Context, monitor *ServerMonitor) (map[string]interface{}, error) {
	details := make(map[string]interface{})

	// Initialize server to get capabilities
	serverInfo, err := m.protocol.Initialize(ctx, monitor.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize: %w", err)
	}

	details["server_info"] = serverInfo

	// Check tools
	if serverInfo.Capabilities.Tools != nil {
		tools, err := m.protocol.ListTools(ctx, monitor.URL)
		if err != nil {
			details["tools_error"] = err.Error()
		} else {
			details["tools"] = tools
			monitor.Metrics.ToolsCount = len(tools)
		}
	}

	// Check resources
	if serverInfo.Capabilities.Resources != nil {
		resources, err := m.protocol.ListResources(ctx, monitor.URL)
		if err != nil {
			details["resources_error"] = err.Error()
		} else {
			details["resources"] = resources
			monitor.Metrics.ResourcesCount = len(resources)
		}
	}

	// Check prompts
	if serverInfo.Capabilities.Prompts != nil {
		prompts, err := m.protocol.ListPrompts(ctx, monitor.URL)
		if err != nil {
			details["prompts_error"] = err.Error()
		} else {
			details["prompts"] = prompts
			monitor.Metrics.PromptsCount = len(prompts)
		}
	}

	return details, nil
}

// checkPerformanceAlerts checks for performance-related alerts
func (m *MCPMonitor) checkPerformanceAlerts(monitor *ServerMonitor) {
	// Alert if response time is too high
	if monitor.ResponseTime > 5*time.Second {
		m.generateAlert(monitor, AlertLevelWarning, "High response time", 
			fmt.Sprintf("Response time: %v", monitor.ResponseTime))
	}

	// Alert if uptime is low
	if monitor.Metrics.UptimePercentage < 95.0 && monitor.Metrics.TotalRequests > 10 {
		m.generateAlert(monitor, AlertLevelWarning, "Low uptime", 
			fmt.Sprintf("Uptime: %.2f%%", monitor.Metrics.UptimePercentage))
	}

	// Alert if error rate is high
	if monitor.Metrics.TotalRequests > 0 {
		errorRate := float64(monitor.Metrics.FailedRequests) / float64(monitor.Metrics.TotalRequests) * 100
		if errorRate > 10.0 {
			m.generateAlert(monitor, AlertLevelCritical, "High error rate", 
				fmt.Sprintf("Error rate: %.2f%%", errorRate))
		}
	}
}

// generateAlert creates and stores an alert
func (m *MCPMonitor) generateAlert(monitor *ServerMonitor, level AlertLevel, message, details string) {
	alert := &Alert{
		ID:        uuid.New(),
		ServerID:  monitor.ServerID,
		Level:     level,
		Message:   message,
		Details:   details,
		Timestamp: time.Now(),
		Resolved:  false,
	}

	err := m.storeAlert(alert)
	if err != nil {
		m.logger.Error("Failed to store alert", zap.Error(err))
	}

	m.logger.Info("Generated alert",
		zap.String("server_id", monitor.ServerID.String()),
		zap.String("level", string(level)),
		zap.String("message", message),
	)
}

// storeHealthCheckResult stores a health check result in the database
func (m *MCPMonitor) storeHealthCheckResult(result *HealthCheckResult) error {
	query := `
		INSERT INTO server_status_history (server_id, status, response_time_ms, error_message, checked_at)
		VALUES ($1, $2, $3, $4, $5)
	`

	var responseTimeMs *int
	if result.ResponseTime > 0 {
		ms := int(result.ResponseTime.Milliseconds())
		responseTimeMs = &ms
	}

	var errorMsg *string
	if result.Error != "" {
		errorMsg = &result.Error
	}

	_, err := m.db.Exec(query, result.ServerID, result.Status, responseTimeMs, errorMsg, result.Timestamp)
	if err != nil {
		m.logger.Error("Failed to store health check result", zap.Error(err))
		return err
	}

	// Update server status in main table
	updateQuery := `
		UPDATE mcp_servers 
		SET status = $1, last_checked_at = $2, response_time_ms = $3
		WHERE id = $4
	`

	_, err = m.db.Exec(updateQuery, result.Status, result.Timestamp, responseTimeMs, result.ServerID)
	if err != nil {
		m.logger.Error("Failed to update server status", zap.Error(err))
	}

	return err
}

// storeAlert stores an alert in the database
func (m *MCPMonitor) storeAlert(alert *Alert) error {
	query := `
		INSERT INTO alerts (id, server_id, type, severity, title, message, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	metadata := map[string]interface{}{
		"details": alert.Details,
	}
	metadataJSON, _ := json.Marshal(metadata)

	_, err := m.db.Exec(query, 
		alert.ID, 
		alert.ServerID, 
		"monitoring", 
		string(alert.Level), 
		alert.Message, 
		alert.Details,
		metadataJSON,
		alert.Timestamp,
	)

	return err
}

// GetServerMetrics returns detailed metrics for a server
func (m *MCPMonitor) GetServerMetrics(url string) (*ServerMetrics, error) {
	monitor, exists := m.GetServerStatus(url)
	if !exists {
		return nil, fmt.Errorf("server not monitored: %s", url)
	}

	return monitor.Metrics, nil
}

// GetRecentAlerts returns recent alerts for all servers
func (m *MCPMonitor) GetRecentAlerts(limit int) ([]*Alert, error) {
	query := `
		SELECT id, server_id, severity, title, message, created_at, resolved_at IS NOT NULL as resolved
		FROM alerts 
		WHERE type = 'monitoring'
		ORDER BY created_at DESC 
		LIMIT $1
	`

	rows, err := m.db.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var alerts []*Alert
	for rows.Next() {
		alert := &Alert{}
		err := rows.Scan(
			&alert.ID,
			&alert.ServerID,
			&alert.Level,
			&alert.Message,
			&alert.Details,
			&alert.Timestamp,
			&alert.Resolved,
		)
		if err != nil {
			continue
		}
		alerts = append(alerts, alert)
	}

	return alerts, nil
}