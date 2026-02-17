package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client is the API client for aran-mcp
type Client struct {
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
}

// NewClient creates a new API client
func NewClient(baseURL, apiKey string, timeout int) *Client {
	return &Client{
		BaseURL: baseURL,
		APIKey:  apiKey,
		HTTPClient: &http.Client{
			Timeout: time.Duration(timeout) * time.Second,
		},
	}
}

// Response wraps API responses
type Response struct {
	StatusCode int
	Body       []byte
	Data       interface{}
}

// Server represents an MCP server
type Server struct {
	ID               string     `json:"id"`
	OrganizationID   string     `json:"organization_id"`
	Name             string     `json:"name"`
	URL              string     `json:"url"`
	Description      *string    `json:"description"`
	Type             string     `json:"type"`
	Status           string     `json:"status"`
	Version          *string    `json:"version"`
	Capabilities     []string   `json:"capabilities"`
	LastCheckedAt    *time.Time `json:"last_checked_at"`
	ResponseTimeMs   *int       `json:"response_time_ms"`
	UptimePercentage *float64   `json:"uptime_percentage"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// ServerListResponse represents the server list response
type ServerListResponse struct {
	Servers []*Server `json:"servers"`
	Count   int       `json:"count"`
}

// CreateServerRequest represents a request to create a server
type CreateServerRequest struct {
	Name        string `json:"name"`
	URL         string `json:"url"`
	Description string `json:"description,omitempty"`
	Type        string `json:"type"`
}

// SearchRequest represents a search request
type SearchRequest struct {
	Query     string   `json:"query,omitempty"`
	Status    []string `json:"status,omitempty"`
	Type      []string `json:"type,omitempty"`
	SortBy    string   `json:"sort_by,omitempty"`
	SortOrder string   `json:"sort_order,omitempty"`
	Limit     int      `json:"limit,omitempty"`
	Offset    int      `json:"offset,omitempty"`
}

// SearchResponse represents a search response
type SearchResponse struct {
	Results    []SearchResult `json:"results"`
	Total      int            `json:"total"`
	TotalPages int            `json:"total_pages"`
	Page       int            `json:"page"`
}

// SearchResult represents a single search result
type SearchResult struct {
	Server        *Server `json:"server"`
	Relevance     float64 `json:"relevance"`
	HighlightName string  `json:"highlight_name"`
	HighlightDesc string  `json:"highlight_desc"`
}

// Alert represents an alert
type Alert struct {
	ID         string     `json:"id"`
	ServerID   *string    `json:"server_id"`
	Type       string     `json:"type"`
	Severity   string     `json:"severity"`
	Title      string     `json:"title"`
	Message    string     `json:"message"`
	IsRead     bool       `json:"is_read"`
	ResolvedAt *time.Time `json:"resolved_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

// AlertListResponse represents the alerts list response
type AlertListResponse struct {
	Alerts []*Alert `json:"alerts"`
	Count  int      `json:"count"`
}

// HealthResponse represents a health check response
type HealthResponse struct {
	Status  string                 `json:"status"`
	Message string                 `json:"message"`
	Checks  map[string]interface{} `json:"checks,omitempty"`
}

// doRequest performs an HTTP request
func (c *Client) doRequest(ctx context.Context, method, path string, body interface{}) (*Response, error) {
	url := c.BaseURL + path

	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		req.Header.Set("X-API-Key", c.APIKey)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	return &Response{
		StatusCode: resp.StatusCode,
		Body:       respBody,
	}, nil
}

// Health checks the API health
func (c *Client) Health(ctx context.Context) (*HealthResponse, error) {
	resp, err := c.doRequest(ctx, "GET", "/health", nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("health check failed with status %d: %s", resp.StatusCode, string(resp.Body))
	}

	var health HealthResponse
	if err := json.Unmarshal(resp.Body, &health); err != nil {
		return nil, fmt.Errorf("failed to parse health response: %w", err)
	}

	return &health, nil
}

// ListServers lists all MCP servers
func (c *Client) ListServers(ctx context.Context) ([]*Server, error) {
	resp, err := c.doRequest(ctx, "GET", "/api/v1/mcp/servers", nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to list servers: %s", string(resp.Body))
	}

	// Try different response formats
	var servers []*Server
	if err := json.Unmarshal(resp.Body, &servers); err != nil {
		// Try wrapped response
		var listResp ServerListResponse
		if err := json.Unmarshal(resp.Body, &listResp); err != nil {
			return nil, fmt.Errorf("failed to parse servers: %w", err)
		}
		servers = listResp.Servers
	}

	return servers, nil
}

// GetServer gets a server by ID
func (c *Client) GetServer(ctx context.Context, id string) (*Server, error) {
	resp, err := c.doRequest(ctx, "GET", "/api/v1/mcp/servers/"+id, nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("server not found: %s", id)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get server: %s", string(resp.Body))
	}

	var server Server
	if err := json.Unmarshal(resp.Body, &server); err != nil {
		return nil, fmt.Errorf("failed to parse server: %w", err)
	}

	return &server, nil
}

// CreateServer creates a new MCP server
func (c *Client) CreateServer(ctx context.Context, req *CreateServerRequest) (*Server, error) {
	resp, err := c.doRequest(ctx, "POST", "/api/v1/mcp/servers", req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to create server: %s", string(resp.Body))
	}

	var server Server
	if err := json.Unmarshal(resp.Body, &server); err != nil {
		return nil, fmt.Errorf("failed to parse server: %w", err)
	}

	return &server, nil
}

// DeleteServer deletes an MCP server
func (c *Client) DeleteServer(ctx context.Context, id string) error {
	resp, err := c.doRequest(ctx, "DELETE", "/api/v1/mcp/servers/"+id, nil)
	if err != nil {
		return err
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("failed to delete server: %s", string(resp.Body))
	}

	return nil
}

// SearchServers searches for MCP servers
func (c *Client) SearchServers(ctx context.Context, req *SearchRequest) (*SearchResponse, error) {
	resp, err := c.doRequest(ctx, "POST", "/api/v1/servers/search", req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("search failed: %s", string(resp.Body))
	}

	var searchResp SearchResponse
	if err := json.Unmarshal(resp.Body, &searchResp); err != nil {
		return nil, fmt.Errorf("failed to parse search response: %w", err)
	}

	return &searchResp, nil
}

// ListAlerts lists all alerts
func (c *Client) ListAlerts(ctx context.Context) ([]*Alert, error) {
	resp, err := c.doRequest(ctx, "GET", "/api/v1/alerts", nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to list alerts: %s", string(resp.Body))
	}

	var alertResp AlertListResponse
	if err := json.Unmarshal(resp.Body, &alertResp); err != nil {
		// Try unwrapped array
		var alerts []*Alert
		if err := json.Unmarshal(resp.Body, &alerts); err != nil {
			return nil, fmt.Errorf("failed to parse alerts: %w", err)
		}
		return alerts, nil
	}

	return alertResp.Alerts, nil
}

// GetStats gets API statistics
func (c *Client) GetStats(ctx context.Context) (map[string]interface{}, error) {
	resp, err := c.doRequest(ctx, "GET", "/api/v1/stats", nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get stats: %s", string(resp.Body))
	}

	var stats map[string]interface{}
	if err := json.Unmarshal(resp.Body, &stats); err != nil {
		return nil, fmt.Errorf("failed to parse stats: %w", err)
	}

	return stats, nil
}

// DiscoverServer discovers capabilities of an MCP server
func (c *Client) DiscoverServer(ctx context.Context, url string) (map[string]interface{}, error) {
	resp, err := c.doRequest(ctx, "POST", "/api/v1/mcp/discover", map[string]string{"url": url})
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("discovery failed: %s", string(resp.Body))
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp.Body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse discovery result: %w", err)
	}

	return result, nil
}
