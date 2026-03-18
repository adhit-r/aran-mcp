package discovery

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/radhi1991/aran-mcp-sentinel/internal/common"
	"go.uber.org/zap"
)

// EndpointScanner performs comprehensive endpoint scanning and analysis
type EndpointScanner struct {
	logger   *zap.Logger
	protocol common.MCPProtocolService
	client   *http.Client
}

// NewEndpointScanner creates a new endpoint scanner
func NewEndpointScanner(logger *zap.Logger, protocol common.MCPProtocolService) *EndpointScanner {
	return &EndpointScanner{
		logger:   logger,
		protocol: protocol,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// ScanResult represents the result of scanning an endpoint
type ScanResult struct {
	URL              string                 `json:"url"`
	Reachable        bool                   `json:"reachable"`
	IsMCPServer      bool                   `json:"is_mcp_server"`
	ResponseTime     time.Duration          `json:"response_time"`
	HTTPStatus       int                    `json:"http_status,omitempty"`
	Version          string                 `json:"version,omitempty"`
	Capabilities     common.MCPCapabilities `json:"capabilities,omitempty"`
	ServerInfo       *common.MCPServerInfo  `json:"server_info,omitempty"`
	Tools            []common.MCPTool       `json:"tools,omitempty"`
	Resources        []common.MCPResource   `json:"resources,omitempty"`
	Prompts          []common.MCPPrompt     `json:"prompts,omitempty"`
	HealthStatus     string                 `json:"health_status,omitempty"`
	DetectedProtocol string                 `json:"detected_protocol,omitempty"`
	Headers          map[string]string      `json:"headers,omitempty"`
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
	Error            string                 `json:"error,omitempty"`
	ScanTimestamp    time.Time              `json:"scan_timestamp"`
}

// ScanEndpoint performs a comprehensive scan of a single endpoint
func (s *EndpointScanner) ScanEndpoint(ctx context.Context, url string) *ScanResult {
	startTime := time.Now()
	result := &ScanResult{
		URL:           url,
		ScanTimestamp: time.Now(),
		Metadata:      make(map[string]interface{}),
		Headers:       make(map[string]string),
	}

	// Normalize URL
	normalizedURL := s.normalizeURL(url)

	// Step 1: Basic reachability check
	if !s.checkReachability(ctx, normalizedURL) {
		result.Reachable = false
		result.Error = "Endpoint not reachable"
		result.ResponseTime = time.Since(startTime)
		return result
	}

	result.Reachable = true

	// Step 2: HTTP endpoint scan
	httpInfo := s.scanHTTPEndpoint(ctx, normalizedURL)
	result.HTTPStatus = httpInfo.StatusCode
	result.ResponseTime = httpInfo.ResponseTime
	result.Headers = httpInfo.Headers
	result.DetectedProtocol = httpInfo.Protocol

	// Step 3: MCP protocol detection
	if s.isMCPProtocol(ctx, normalizedURL) {
		result.IsMCPServer = true
		result.DetectedProtocol = "MCP"

		// Step 4: Initialize MCP connection and get server info
		serverInfo, err := s.protocol.Initialize(ctx, normalizedURL)
		if err != nil {
			s.logger.Warn("Failed to initialize MCP server",
				zap.String("url", normalizedURL),
				zap.Error(err))
			result.Error = fmt.Sprintf("MCP initialization failed: %v", err)
		} else {
			result.ServerInfo = serverInfo
			result.Version = serverInfo.Version
			result.Capabilities = serverInfo.Capabilities
			result.Metadata["server_name"] = serverInfo.Name
			result.Metadata["server_description"] = serverInfo.Description

			// Step 5: Discover capabilities
			s.discoverCapabilities(ctx, normalizedURL, result)
		}
	}

	// Step 6: Health check
	result.HealthStatus = s.checkHealth(ctx, normalizedURL)

	result.ResponseTime = time.Since(startTime)

	s.logger.Info("Endpoint scan completed",
		zap.String("url", normalizedURL),
		zap.Bool("is_mcp", result.IsMCPServer),
		zap.String("version", result.Version),
		zap.Duration("response_time", result.ResponseTime))

	return result
}

// ScanMultipleEndpoints scans multiple endpoints concurrently
func (s *EndpointScanner) ScanMultipleEndpoints(ctx context.Context, urls []string, maxConcurrent int) []*ScanResult {
	if maxConcurrent <= 0 {
		maxConcurrent = 10
	}

	semaphore := make(chan struct{}, maxConcurrent)
	results := make([]*ScanResult, 0, len(urls))
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, url := range urls {
		wg.Add(1)
		go func(u string) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			result := s.ScanEndpoint(ctx, u)

			mu.Lock()
			results = append(results, result)
			mu.Unlock()
		}(url)
	}

	wg.Wait()
	return results
}

// HTTPInfo holds HTTP endpoint information
type HTTPInfo struct {
	StatusCode   int
	ResponseTime time.Duration
	Headers      map[string]string
	Protocol     string
}

// normalizeURL ensures URL has proper scheme
func (s *EndpointScanner) normalizeURL(url string) string {
	url = strings.TrimSpace(url)
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		// Try HTTPS first, fallback to HTTP
		return "http://" + url
	}
	return url
}

// checkReachability performs a quick reachability check
func (s *EndpointScanner) checkReachability(ctx context.Context, url string) bool {
	client := &http.Client{Timeout: 3 * time.Second}
	req, err := http.NewRequestWithContext(ctx, "HEAD", url, nil)
	if err != nil {
		return false
	}

	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode < 500
}

// scanHTTPEndpoint performs HTTP endpoint analysis
func (s *EndpointScanner) scanHTTPEndpoint(ctx context.Context, url string) HTTPInfo {
	startTime := time.Now()
	info := HTTPInfo{
		Headers: make(map[string]string),
	}

	// Try common MCP endpoints
	endpoints := []string{"", "/", "/health", "/status", "/api", "/mcp", "/api/v1/health"}

	for _, endpoint := range endpoints {
		testURL := url + endpoint
		req, err := http.NewRequestWithContext(ctx, "GET", testURL, nil)
		if err != nil {
			continue
		}

		resp, err := s.client.Do(req)
		if err != nil {
			continue
		}

		// Capture first successful response
		if info.StatusCode == 0 && resp.StatusCode < 500 {
			info.StatusCode = resp.StatusCode
			info.ResponseTime = time.Since(startTime)

			// Extract headers
			for key, values := range resp.Header {
				if len(values) > 0 {
					info.Headers[key] = values[0]
				}
			}

			// Detect protocol from headers
			if strings.Contains(resp.Header.Get("Content-Type"), "application/json") {
				info.Protocol = "HTTP/JSON"
			} else if resp.Header.Get("X-MCP-Version") != "" {
				info.Protocol = "MCP"
			}

			resp.Body.Close()
			break
		}

		resp.Body.Close()
	}

	return info
}

// isMCPProtocol checks if endpoint responds to MCP protocol
func (s *EndpointScanner) isMCPProtocol(ctx context.Context, url string) bool {
	// Try to send an MCP initialize request
	_, err := s.protocol.Initialize(ctx, url)
	if err != nil {
		// Check for MCP-specific headers or patterns
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			return false
		}

		resp, err := s.client.Do(req)
		if err != nil {
			return false
		}
		defer resp.Body.Close()

		// Check for MCP headers
		mcpHeaders := []string{
			"X-MCP-Version",
			"X-MCP-Server",
			"X-MCP-Capabilities",
		}

		for _, header := range mcpHeaders {
			if resp.Header.Get(header) != "" {
				return true
			}
		}

		// Check response body for MCP patterns
		body, err := io.ReadAll(resp.Body)
		if err == nil {
			bodyStr := string(body)
			mcpPatterns := []string{
				`"jsonrpc"`,
				`"method"`,
				`"mcp"`,
				`"tools"`,
			}

			for _, pattern := range mcpPatterns {
				if strings.Contains(strings.ToLower(bodyStr), pattern) {
					return true
				}
			}
		}

		return false
	}

	return true
}

// discoverCapabilities discovers all MCP server capabilities
func (s *EndpointScanner) discoverCapabilities(ctx context.Context, url string, result *ScanResult) {
	// Discover tools
	if result.Capabilities.Tools != nil && *result.Capabilities.Tools {
		tools, err := s.protocol.ListTools(ctx, url)
		if err != nil {
			s.logger.Warn("Failed to list tools", zap.String("url", url), zap.Error(err))
		} else {
			result.Tools = tools
			result.Metadata["tools_count"] = len(tools)
		}
	}

	// Discover resources
	if result.Capabilities.Resources != nil && *result.Capabilities.Resources {
		resources, err := s.protocol.ListResources(ctx, url)
		if err != nil {
			s.logger.Warn("Failed to list resources", zap.String("url", url), zap.Error(err))
		} else {
			result.Resources = resources
			result.Metadata["resources_count"] = len(resources)
		}
	}

	// Discover prompts
	if result.Capabilities.Prompts != nil && *result.Capabilities.Prompts {
		prompts, err := s.protocol.ListPrompts(ctx, url)
		if err != nil {
			s.logger.Warn("Failed to list prompts", zap.String("url", url), zap.Error(err))
		} else {
			result.Prompts = prompts
			result.Metadata["prompts_count"] = len(prompts)
		}
	}
}

// checkHealth performs a health check on the endpoint
func (s *EndpointScanner) checkHealth(ctx context.Context, url string) string {
	healthEndpoints := []string{"/health", "/status", "/api/health", "/api/v1/health"}

	for _, endpoint := range healthEndpoints {
		healthURL := url + endpoint
		req, err := http.NewRequestWithContext(ctx, "GET", healthURL, nil)
		if err != nil {
			continue
		}

		resp, err := s.client.Do(req)
		if err != nil {
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			// Try to parse health response
			var healthResp map[string]interface{}
			if err := json.NewDecoder(resp.Body).Decode(&healthResp); err == nil {
				if status, ok := healthResp["status"].(string); ok {
					return status
				}
			}
			return "healthy"
		}
	}

	return "unknown"
}

// ScanPortRange scans a range of ports on a given host
func (s *EndpointScanner) ScanPortRange(ctx context.Context, host string, startPort, endPort int, maxConcurrent int) []*ScanResult {
	if maxConcurrent <= 0 {
		maxConcurrent = 20
	}

	var results []*ScanResult
	semaphore := make(chan struct{}, maxConcurrent)
	var mu sync.Mutex
	var wg sync.WaitGroup

	for port := startPort; port <= endPort; port++ {
		wg.Add(1)
		go func(p int) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			url := fmt.Sprintf("http://%s:%d", host, p)
			result := s.ScanEndpoint(ctx, url)

			// Only include results for reachable endpoints
			if result.Reachable {
				mu.Lock()
				results = append(results, result)
				mu.Unlock()
			}
		}(port)
	}

	wg.Wait()
	return results
}
