package monitoring

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"go.uber.org/zap"
)

// EnhancedHealthMonitor provides comprehensive health monitoring
type EnhancedHealthMonitor struct {
	logger *zap.Logger
	client *http.Client
}

// HealthMetrics represents comprehensive health metrics
type HealthMetrics struct {
	ServerID      string                 `json:"server_id"`
	Status        string                 `json:"status"`
	ResponseTime  int64                  `json:"response_time_ms"`
	LastChecked   time.Time              `json:"last_checked"`
	Uptime        float64                `json:"uptime_percentage"`
	ErrorRate     float64                `json:"error_rate"`
	MemoryUsage   *MemoryUsage           `json:"memory_usage,omitempty"`
	CPUUsage      *CPUUsage              `json:"cpu_usage,omitempty"`
	NetworkStats  *NetworkStats          `json:"network_stats,omitempty"`
	Version       string                 `json:"version,omitempty"`
	Capabilities  []string               `json:"capabilities,omitempty"`
	HealthScore   int                    `json:"health_score"` // 0-100
	Alerts        []HealthAlert          `json:"alerts,omitempty"`
	CustomMetrics map[string]interface{} `json:"custom_metrics,omitempty"`
}

type MemoryUsage struct {
	Used       int64   `json:"used_bytes"`
	Total      int64   `json:"total_bytes"`
	Percentage float64 `json:"percentage"`
}

type CPUUsage struct {
	Percentage float64 `json:"percentage"`
	LoadAvg    float64 `json:"load_average"`
}

type NetworkStats struct {
	BytesIn     int64 `json:"bytes_in"`
	BytesOut    int64 `json:"bytes_out"`
	Connections int   `json:"active_connections"`
}

type HealthAlert struct {
	Type      string    `json:"type"`
	Severity  string    `json:"severity"` // low, medium, high, critical
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
	Resolved  bool      `json:"resolved"`
}

// NewEnhancedHealthMonitor creates a new enhanced health monitor
func NewEnhancedHealthMonitor(logger *zap.Logger) *EnhancedHealthMonitor {
	return &EnhancedHealthMonitor{
		logger: logger,
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// PerformComprehensiveHealthCheck performs a comprehensive health check
func (ehm *EnhancedHealthMonitor) PerformComprehensiveHealthCheck(ctx context.Context, serverURL string, serverID string) (*HealthMetrics, error) {
	startTime := time.Now()

	metrics := &HealthMetrics{
		ServerID:      serverID,
		LastChecked:   startTime,
		Status:        "unknown",
		Alerts:        []HealthAlert{},
		CustomMetrics: make(map[string]interface{}),
	}

	// Basic connectivity check
	responseTime, err := ehm.checkConnectivity(ctx, serverURL)
	if err != nil {
		metrics.Status = "offline"
		metrics.HealthScore = 0
		metrics.Alerts = append(metrics.Alerts, HealthAlert{
			Type:      "connectivity",
			Severity:  "critical",
			Message:   fmt.Sprintf("Server unreachable: %v", err),
			Timestamp: startTime,
		})
		return metrics, nil
	}

	metrics.ResponseTime = responseTime
	metrics.Status = "online"

	// Check various health endpoints
	ehm.checkHealthEndpoints(ctx, serverURL, metrics)

	// Check server capabilities
	ehm.checkServerCapabilities(ctx, serverURL, metrics)

	// Check performance metrics
	ehm.checkPerformanceMetrics(ctx, serverURL, metrics)

	// Calculate health score
	ehm.calculateHealthScore(metrics)

	// Check for alerts
	ehm.checkForAlerts(metrics)

	return metrics, nil
}

// checkConnectivity performs basic connectivity check
func (ehm *EnhancedHealthMonitor) checkConnectivity(ctx context.Context, serverURL string) (int64, error) {
	start := time.Now()

	req, err := http.NewRequestWithContext(ctx, "GET", serverURL, nil)
	if err != nil {
		return 0, err
	}

	resp, err := ehm.client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	responseTime := time.Since(start).Milliseconds()

	if resp.StatusCode >= 400 {
		return responseTime, fmt.Errorf("server returned status %d", resp.StatusCode)
	}

	return responseTime, nil
}

// checkHealthEndpoints checks various health endpoints
func (ehm *EnhancedHealthMonitor) checkHealthEndpoints(ctx context.Context, serverURL string, metrics *HealthMetrics) {
	endpoints := []string{
		"/health",
		"/status",
		"/ping",
		"/api/health",
		"/api/v1/health",
		"/metrics",
		"/info",
	}

	for _, endpoint := range endpoints {
		url := serverURL + endpoint
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			continue
		}

		resp, err := ehm.client.Do(req)
		if err != nil {
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode == 200 {
			// Parse health response
			ehm.parseHealthResponse(resp, metrics)
			break
		}
	}
}

// parseHealthResponse parses health response data
func (ehm *EnhancedHealthMonitor) parseHealthResponse(resp *http.Response, metrics *HealthMetrics) {
	// Try to parse JSON response
	var healthData map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&healthData); err != nil {
		return
	}

	// Extract version
	if version, ok := healthData["version"].(string); ok {
		metrics.Version = version
	}

	// Extract uptime
	if uptime, ok := healthData["uptime"].(float64); ok {
		metrics.Uptime = uptime
	}

	// Extract memory usage
	if memory, ok := healthData["memory"].(map[string]interface{}); ok {
		metrics.MemoryUsage = &MemoryUsage{}
		if used, ok := memory["used"].(float64); ok {
			metrics.MemoryUsage.Used = int64(used)
		}
		if total, ok := memory["total"].(float64); ok {
			metrics.MemoryUsage.Total = int64(total)
		}
		if metrics.MemoryUsage.Total > 0 {
			metrics.MemoryUsage.Percentage = float64(metrics.MemoryUsage.Used) / float64(metrics.MemoryUsage.Total) * 100
		}
	}

	// Extract CPU usage
	if cpu, ok := healthData["cpu"].(map[string]interface{}); ok {
		metrics.CPUUsage = &CPUUsage{}
		if percentage, ok := cpu["percentage"].(float64); ok {
			metrics.CPUUsage.Percentage = percentage
		}
		if loadAvg, ok := cpu["load_average"].(float64); ok {
			metrics.CPUUsage.LoadAvg = loadAvg
		}
	}

	// Extract network stats
	if network, ok := healthData["network"].(map[string]interface{}); ok {
		metrics.NetworkStats = &NetworkStats{}
		if bytesIn, ok := network["bytes_in"].(float64); ok {
			metrics.NetworkStats.BytesIn = int64(bytesIn)
		}
		if bytesOut, ok := network["bytes_out"].(float64); ok {
			metrics.NetworkStats.BytesOut = int64(bytesOut)
		}
		if connections, ok := network["connections"].(float64); ok {
			metrics.NetworkStats.Connections = int(connections)
		}
	}

	// Extract capabilities
	if capabilities, ok := healthData["capabilities"].([]interface{}); ok {
		for _, cap := range capabilities {
			if capStr, ok := cap.(string); ok {
				metrics.Capabilities = append(metrics.Capabilities, capStr)
			}
		}
	}
}

// checkServerCapabilities checks server capabilities
func (ehm *EnhancedHealthMonitor) checkServerCapabilities(ctx context.Context, serverURL string, metrics *HealthMetrics) {
	// Check for MCP-specific endpoints
	mcpEndpoints := []string{
		"/mcp",
		"/api/mcp",
		"/api/v1/mcp",
		"/mcp/info",
		"/mcp/capabilities",
	}

	for _, endpoint := range mcpEndpoints {
		url := serverURL + endpoint
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			continue
		}

		resp, err := ehm.client.Do(req)
		if err != nil {
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode == 200 {
			// Server supports MCP protocol
			metrics.CustomMetrics["mcp_support"] = true
			metrics.CustomMetrics["mcp_endpoint"] = endpoint
			break
		}
	}
}

// checkPerformanceMetrics checks performance-related metrics
func (ehm *EnhancedHealthMonitor) checkPerformanceMetrics(ctx context.Context, serverURL string, metrics *HealthMetrics) {
	// Perform multiple requests to measure consistency
	var responseTimes []int64
	requests := 3

	for i := 0; i < requests; i++ {
		start := time.Now()
		req, err := http.NewRequestWithContext(ctx, "GET", serverURL, nil)
		if err != nil {
			continue
		}

		resp, err := ehm.client.Do(req)
		if err != nil {
			continue
		}
		resp.Body.Close()

		responseTime := time.Since(start).Milliseconds()
		responseTimes = append(responseTimes, responseTime)
	}

	if len(responseTimes) > 0 {
		// Calculate average response time
		var total int64
		for _, rt := range responseTimes {
			total += rt
		}
		avgResponseTime := total / int64(len(responseTimes))
		metrics.ResponseTime = avgResponseTime

		// Calculate response time variance
		var variance float64
		for _, rt := range responseTimes {
			diff := float64(rt - avgResponseTime)
			variance += diff * diff
		}
		variance /= float64(len(responseTimes))
		metrics.CustomMetrics["response_time_variance"] = variance
	}
}

// calculateHealthScore calculates overall health score
func (ehm *EnhancedHealthMonitor) calculateHealthScore(metrics *HealthMetrics) {
	score := 100

	// Deduct points for high response time
	if metrics.ResponseTime > 5000 { // > 5 seconds
		score -= 30
	} else if metrics.ResponseTime > 2000 { // > 2 seconds
		score -= 15
	} else if metrics.ResponseTime > 1000 { // > 1 second
		score -= 5
	}

	// Deduct points for low uptime
	if metrics.Uptime < 95 {
		score -= 25
	} else if metrics.Uptime < 99 {
		score -= 10
	}

	// Deduct points for high error rate
	if metrics.ErrorRate > 10 {
		score -= 40
	} else if metrics.ErrorRate > 5 {
		score -= 20
	} else if metrics.ErrorRate > 1 {
		score -= 5
	}

	// Deduct points for high memory usage
	if metrics.MemoryUsage != nil && metrics.MemoryUsage.Percentage > 90 {
		score -= 20
	} else if metrics.MemoryUsage != nil && metrics.MemoryUsage.Percentage > 80 {
		score -= 10
	}

	// Deduct points for high CPU usage
	if metrics.CPUUsage != nil && metrics.CPUUsage.Percentage > 90 {
		score -= 20
	} else if metrics.CPUUsage != nil && metrics.CPUUsage.Percentage > 80 {
		score -= 10
	}

	// Ensure score is between 0 and 100
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	metrics.HealthScore = score
}

// checkForAlerts checks for various alert conditions
func (ehm *EnhancedHealthMonitor) checkForAlerts(metrics *HealthMetrics) {
	// High response time alert
	if metrics.ResponseTime > 5000 {
		metrics.Alerts = append(metrics.Alerts, HealthAlert{
			Type:      "performance",
			Severity:  "high",
			Message:   fmt.Sprintf("High response time: %dms", metrics.ResponseTime),
			Timestamp: time.Now(),
		})
	}

	// Low uptime alert
	if metrics.Uptime < 95 {
		metrics.Alerts = append(metrics.Alerts, HealthAlert{
			Type:      "availability",
			Severity:  "critical",
			Message:   fmt.Sprintf("Low uptime: %.2f%%", metrics.Uptime),
			Timestamp: time.Now(),
		})
	}

	// High error rate alert
	if metrics.ErrorRate > 5 {
		metrics.Alerts = append(metrics.Alerts, HealthAlert{
			Type:      "reliability",
			Severity:  "high",
			Message:   fmt.Sprintf("High error rate: %.2f%%", metrics.ErrorRate),
			Timestamp: time.Now(),
		})
	}

	// Memory usage alert
	if metrics.MemoryUsage != nil && metrics.MemoryUsage.Percentage > 90 {
		metrics.Alerts = append(metrics.Alerts, HealthAlert{
			Type:      "resource",
			Severity:  "high",
			Message:   fmt.Sprintf("High memory usage: %.2f%%", metrics.MemoryUsage.Percentage),
			Timestamp: time.Now(),
		})
	}

	// CPU usage alert
	if metrics.CPUUsage != nil && metrics.CPUUsage.Percentage > 90 {
		metrics.Alerts = append(metrics.Alerts, HealthAlert{
			Type:      "resource",
			Severity:  "high",
			Message:   fmt.Sprintf("High CPU usage: %.2f%%", metrics.CPUUsage.Percentage),
			Timestamp: time.Now(),
		})
	}

	// Low health score alert
	if metrics.HealthScore < 50 {
		metrics.Alerts = append(metrics.Alerts, HealthAlert{
			Type:      "overall",
			Severity:  "critical",
			Message:   fmt.Sprintf("Low health score: %d", metrics.HealthScore),
			Timestamp: time.Now(),
		})
	}
}

