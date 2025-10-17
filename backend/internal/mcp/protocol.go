package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.uber.org/zap"
)

// MCPProtocol implements the Model Context Protocol specification
type MCPProtocol struct {
	logger *zap.Logger
	client *http.Client
}

// MCPRequest represents a standard MCP request
type MCPRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params,omitempty"`
}

// MCPResponse represents a standard MCP response
type MCPResponse struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Result  interface{} `json:"result,omitempty"`
	Error   *MCPError   `json:"error,omitempty"`
}

// MCPError represents an MCP error
type MCPError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// MCPServerInfo represents server information
type MCPServerInfo struct {
	Name         string            `json:"name"`
	Version      string            `json:"version"`
	Description  string            `json:"description,omitempty"`
	Capabilities MCPCapabilities   `json:"capabilities"`
	Metadata     map[string]string `json:"metadata,omitempty"`
}

// MCPCapabilities represents server capabilities
type MCPCapabilities struct {
	Tools     *MCPToolsCapability     `json:"tools,omitempty"`
	Resources *MCPResourcesCapability `json:"resources,omitempty"`
	Prompts   *MCPPromptsCapability   `json:"prompts,omitempty"`
	Logging   *MCPLoggingCapability   `json:"logging,omitempty"`
}

// MCPToolsCapability represents tools capability
type MCPToolsCapability struct {
	ListChanged bool `json:"listChanged,omitempty"`
}

// MCPResourcesCapability represents resources capability
type MCPResourcesCapability struct {
	Subscribe   bool `json:"subscribe,omitempty"`
	ListChanged bool `json:"listChanged,omitempty"`
}

// MCPPromptsCapability represents prompts capability
type MCPPromptsCapability struct {
	ListChanged bool `json:"listChanged,omitempty"`
}

// MCPLoggingCapability represents logging capability
type MCPLoggingCapability struct {
	Level string `json:"level,omitempty"`
}

// MCPTool represents an MCP tool
type MCPTool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	InputSchema map[string]interface{} `json:"inputSchema"`
}

// MCPResource represents an MCP resource
type MCPResource struct {
	URI         string `json:"uri"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	MimeType    string `json:"mimeType,omitempty"`
}

// MCPPrompt represents an MCP prompt
type MCPPrompt struct {
	Name        string                   `json:"name"`
	Description string                   `json:"description,omitempty"`
	Arguments   []MCPPromptArgument      `json:"arguments,omitempty"`
}

// MCPPromptArgument represents a prompt argument
type MCPPromptArgument struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Required    bool   `json:"required,omitempty"`
}

// NewMCPProtocol creates a new MCP protocol client
func NewMCPProtocol(logger *zap.Logger) *MCPProtocol {
	return &MCPProtocol{
		logger: logger,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Initialize performs MCP server initialization handshake
func (m *MCPProtocol) Initialize(ctx context.Context, serverURL string) (*MCPServerInfo, error) {
	request := MCPRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "initialize",
		Params: map[string]interface{}{
			"protocolVersion": "2024-11-05",
			"capabilities": map[string]interface{}{
				"roots": map[string]interface{}{
					"listChanged": true,
				},
				"sampling": map[string]interface{}{},
			},
			"clientInfo": map[string]interface{}{
				"name":    "Aran MCP Sentinel",
				"version": "1.0.0",
			},
		},
	}

	response, err := m.sendRequest(ctx, serverURL, request)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize MCP server: %w", err)
	}

	if response.Error != nil {
		return nil, fmt.Errorf("MCP server returned error: %s", response.Error.Message)
	}

	var serverInfo MCPServerInfo
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", response.Result)), &serverInfo); err != nil {
		return nil, fmt.Errorf("failed to parse server info: %w", err)
	}

	// Send initialized notification
	notification := MCPRequest{
		JSONRPC: "2.0",
		Method:  "notifications/initialized",
	}

	_, err = m.sendRequest(ctx, serverURL, notification)
	if err != nil {
		m.logger.Warn("Failed to send initialized notification", zap.Error(err))
	}

	return &serverInfo, nil
}

// ListTools retrieves available tools from MCP server
func (m *MCPProtocol) ListTools(ctx context.Context, serverURL string) ([]MCPTool, error) {
	request := MCPRequest{
		JSONRPC: "2.0",
		ID:      2,
		Method:  "tools/list",
	}

	response, err := m.sendRequest(ctx, serverURL, request)
	if err != nil {
		return nil, fmt.Errorf("failed to list tools: %w", err)
	}

	if response.Error != nil {
		return nil, fmt.Errorf("MCP server returned error: %s", response.Error.Message)
	}

	var result struct {
		Tools []MCPTool `json:"tools"`
	}

	resultBytes, _ := json.Marshal(response.Result)
	if err := json.Unmarshal(resultBytes, &result); err != nil {
		return nil, fmt.Errorf("failed to parse tools: %w", err)
	}

	return result.Tools, nil
}

// ListResources retrieves available resources from MCP server
func (m *MCPProtocol) ListResources(ctx context.Context, serverURL string) ([]MCPResource, error) {
	request := MCPRequest{
		JSONRPC: "2.0",
		ID:      3,
		Method:  "resources/list",
	}

	response, err := m.sendRequest(ctx, serverURL, request)
	if err != nil {
		return nil, fmt.Errorf("failed to list resources: %w", err)
	}

	if response.Error != nil {
		return nil, fmt.Errorf("MCP server returned error: %s", response.Error.Message)
	}

	var result struct {
		Resources []MCPResource `json:"resources"`
	}

	resultBytes, _ := json.Marshal(response.Result)
	if err := json.Unmarshal(resultBytes, &result); err != nil {
		return nil, fmt.Errorf("failed to parse resources: %w", err)
	}

	return result.Resources, nil
}

// ListPrompts retrieves available prompts from MCP server
func (m *MCPProtocol) ListPrompts(ctx context.Context, serverURL string) ([]MCPPrompt, error) {
	request := MCPRequest{
		JSONRPC: "2.0",
		ID:      4,
		Method:  "prompts/list",
	}

	response, err := m.sendRequest(ctx, serverURL, request)
	if err != nil {
		return nil, fmt.Errorf("failed to list prompts: %w", err)
	}

	if response.Error != nil {
		return nil, fmt.Errorf("MCP server returned error: %s", response.Error.Message)
	}

	var result struct {
		Prompts []MCPPrompt `json:"prompts"`
	}

	resultBytes, _ := json.Marshal(response.Result)
	if err := json.Unmarshal(resultBytes, &result); err != nil {
		return nil, fmt.Errorf("failed to parse prompts: %w", err)
	}

	return result.Prompts, nil
}

// CallTool executes a tool on the MCP server
func (m *MCPProtocol) CallTool(ctx context.Context, serverURL, toolName string, arguments map[string]interface{}) (interface{}, error) {
	request := MCPRequest{
		JSONRPC: "2.0",
		ID:      5,
		Method:  "tools/call",
		Params: map[string]interface{}{
			"name":      toolName,
			"arguments": arguments,
		},
	}

	response, err := m.sendRequest(ctx, serverURL, request)
	if err != nil {
		return nil, fmt.Errorf("failed to call tool: %w", err)
	}

	if response.Error != nil {
		return nil, fmt.Errorf("tool execution failed: %s", response.Error.Message)
	}

	return response.Result, nil
}

// ReadResource reads a resource from the MCP server
func (m *MCPProtocol) ReadResource(ctx context.Context, serverURL, resourceURI string) (interface{}, error) {
	request := MCPRequest{
		JSONRPC: "2.0",
		ID:      6,
		Method:  "resources/read",
		Params: map[string]interface{}{
			"uri": resourceURI,
		},
	}

	response, err := m.sendRequest(ctx, serverURL, request)
	if err != nil {
		return nil, fmt.Errorf("failed to read resource: %w", err)
	}

	if response.Error != nil {
		return nil, fmt.Errorf("resource read failed: %s", response.Error.Message)
	}

	return response.Result, nil
}

// Ping checks if MCP server is responsive
func (m *MCPProtocol) Ping(ctx context.Context, serverURL string) error {
	request := MCPRequest{
		JSONRPC: "2.0",
		ID:      99,
		Method:  "ping",
	}

	response, err := m.sendRequest(ctx, serverURL, request)
	if err != nil {
		return fmt.Errorf("ping failed: %w", err)
	}

	if response.Error != nil {
		return fmt.Errorf("ping returned error: %s", response.Error.Message)
	}

	return nil
}

// sendRequest sends an HTTP request to the MCP server
func (m *MCPProtocol) sendRequest(ctx context.Context, serverURL string, request MCPRequest) (*MCPResponse, error) {
	requestBody, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	m.logger.Debug("Sending MCP request",
		zap.String("url", serverURL),
		zap.String("method", request.Method),
		zap.ByteString("body", requestBody),
	)

	httpReq, err := http.NewRequestWithContext(ctx, "POST", serverURL, bytes.NewBuffer(requestBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("User-Agent", "Aran-MCP-Sentinel/1.0.0")

	resp, err := m.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP request failed with status: %d", resp.StatusCode)
	}

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	m.logger.Debug("Received MCP response",
		zap.String("url", serverURL),
		zap.Int("status", resp.StatusCode),
		zap.ByteString("body", responseBody),
	)

	var mcpResponse MCPResponse
	if err := json.Unmarshal(responseBody, &mcpResponse); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &mcpResponse, nil
}