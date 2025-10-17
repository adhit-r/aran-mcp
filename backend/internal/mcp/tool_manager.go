package mcp

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// ToolManager manages MCP tools across servers
type ToolManager struct {
	db       *sql.DB
	logger   *zap.Logger
	protocol *MCPProtocol
}

// ManagedTool represents a tool managed by the system
type ManagedTool struct {
	ID          uuid.UUID              `json:"id"`
	ServerID    uuid.UUID              `json:"server_id"`
	ServerURL   string                 `json:"server_url"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"input_schema"`
	Category    string                 `json:"category"`
	Tags        []string               `json:"tags"`
	RiskLevel   string                 `json:"risk_level"`
	IsEnabled   bool                   `json:"is_enabled"`
	UsageCount  int64                  `json:"usage_count"`
	LastUsed    *time.Time             `json:"last_used,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// ToolExecution represents a tool execution record
type ToolExecution struct {
	ID         uuid.UUID              `json:"id"`
	ToolID     uuid.UUID              `json:"tool_id"`
	ServerID   uuid.UUID              `json:"server_id"`
	UserID     *uuid.UUID             `json:"user_id,omitempty"`
	Arguments  map[string]interface{} `json:"arguments"`
	Result     interface{}            `json:"result,omitempty"`
	Error      string                 `json:"error,omitempty"`
	Duration   time.Duration          `json:"duration"`
	Status     string                 `json:"status"`
	ExecutedAt time.Time              `json:"executed_at"`
}

// ToolCategory represents a tool category
type ToolCategory struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	RiskLevel   string `json:"risk_level"`
	Color       string `json:"color"`
}

// ToolUsageStats represents usage statistics for a tool
type ToolUsageStats struct {
	ToolID           uuid.UUID `json:"tool_id"`
	TotalExecutions  int64     `json:"total_executions"`
	SuccessfulExecs  int64     `json:"successful_executions"`
	FailedExecs      int64     `json:"failed_executions"`
	AverageDuration  float64   `json:"average_duration_ms"`
	LastExecution    time.Time `json:"last_execution"`
	PopularityScore  float64   `json:"popularity_score"`
}

// NewToolManager creates a new tool manager
func NewToolManager(db *sql.DB, logger *zap.Logger) *ToolManager {
	return &ToolManager{
		db:       db,
		logger:   logger,
		protocol: NewMCPProtocol(logger),
	}
}

// DiscoverTools discovers and catalogs tools from an MCP server
func (tm *ToolManager) DiscoverTools(ctx context.Context, serverID uuid.UUID, serverURL string) ([]*ManagedTool, error) {
	tm.logger.Info("Discovering tools from MCP server",
		zap.String("server_id", serverID.String()),
		zap.String("url", serverURL),
	)

	// Initialize connection to server
	_, err := tm.protocol.Initialize(ctx, serverURL)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize MCP server: %w", err)
	}

	// List available tools
	mcpTools, err := tm.protocol.ListTools(ctx, serverURL)
	if err != nil {
		return nil, fmt.Errorf("failed to list tools: %w", err)
	}

	var managedTools []*ManagedTool

	// Process each discovered tool
	for _, mcpTool := range mcpTools {
		managedTool := &ManagedTool{
			ID:          uuid.New(),
			ServerID:    serverID,
			ServerURL:   serverURL,
			Name:        mcpTool.Name,
			Description: mcpTool.Description,
			InputSchema: mcpTool.InputSchema,
			Category:    tm.categorizeTool(mcpTool.Name, mcpTool.Description),
			Tags:        tm.extractTags(mcpTool.Name, mcpTool.Description),
			RiskLevel:   tm.assessRiskLevel(mcpTool.Name, mcpTool.InputSchema),
			IsEnabled:   true,
			UsageCount:  0,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		// Store in database
		err := tm.storeTool(managedTool)
		if err != nil {
			tm.logger.Error("Failed to store tool", 
				zap.String("tool_name", managedTool.Name),
				zap.Error(err),
			)
			continue
		}

		managedTools = append(managedTools, managedTool)

		tm.logger.Info("Discovered and stored tool",
			zap.String("tool_name", managedTool.Name),
			zap.String("category", managedTool.Category),
			zap.String("risk_level", managedTool.RiskLevel),
		)
	}

	return managedTools, nil
}

// ExecuteTool executes a tool on its MCP server
func (tm *ToolManager) ExecuteTool(ctx context.Context, toolID uuid.UUID, arguments map[string]interface{}, userID *uuid.UUID) (*ToolExecution, error) {
	// Get tool information
	tool, err := tm.GetTool(toolID)
	if err != nil {
		return nil, fmt.Errorf("tool not found: %w", err)
	}

	if !tool.IsEnabled {
		return nil, fmt.Errorf("tool is disabled: %s", tool.Name)
	}

	// Validate arguments against schema
	if err := tm.validateArguments(arguments, tool.InputSchema); err != nil {
		return nil, fmt.Errorf("invalid arguments: %w", err)
	}

	// Create execution record
	execution := &ToolExecution{
		ID:         uuid.New(),
		ToolID:     toolID,
		ServerID:   tool.ServerID,
		UserID:     userID,
		Arguments:  arguments,
		Status:     "running",
		ExecutedAt: time.Now(),
	}

	start := time.Now()

	// Execute tool on MCP server
	result, err := tm.protocol.CallTool(ctx, tool.ServerURL, tool.Name, arguments)
	execution.Duration = time.Since(start)

	if err != nil {
		execution.Status = "failed"
		execution.Error = err.Error()
		tm.logger.Error("Tool execution failed",
			zap.String("tool_name", tool.Name),
			zap.Error(err),
		)
	} else {
		execution.Status = "completed"
		execution.Result = result
		tm.logger.Info("Tool executed successfully",
			zap.String("tool_name", tool.Name),
			zap.Duration("duration", execution.Duration),
		)
	}

	// Store execution record
	if storeErr := tm.storeExecution(execution); storeErr != nil {
		tm.logger.Error("Failed to store execution record", zap.Error(storeErr))
	}

	// Update tool usage statistics
	if updateErr := tm.updateToolUsage(toolID); updateErr != nil {
		tm.logger.Error("Failed to update tool usage", zap.Error(updateErr))
	}

	return execution, err
}

// GetTool retrieves a tool by ID
func (tm *ToolManager) GetTool(toolID uuid.UUID) (*ManagedTool, error) {
	query := `
		SELECT id, server_id, server_url, name, description, input_schema, category, 
		       tags, risk_level, is_enabled, usage_count, last_used, created_at, updated_at
		FROM mcp_tools 
		WHERE id = $1 AND deleted_at IS NULL
	`

	row := tm.db.QueryRow(query, toolID)
	
	tool := &ManagedTool{}
	var inputSchemaJSON, tagsJSON []byte
	var lastUsed sql.NullTime

	err := row.Scan(
		&tool.ID,
		&tool.ServerID,
		&tool.ServerURL,
		&tool.Name,
		&tool.Description,
		&inputSchemaJSON,
		&tool.Category,
		&tagsJSON,
		&tool.RiskLevel,
		&tool.IsEnabled,
		&tool.UsageCount,
		&lastUsed,
		&tool.CreatedAt,
		&tool.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	// Parse JSON fields
	if err := json.Unmarshal(inputSchemaJSON, &tool.InputSchema); err != nil {
		tm.logger.Warn("Failed to parse input schema", zap.Error(err))
	}

	if err := json.Unmarshal(tagsJSON, &tool.Tags); err != nil {
		tm.logger.Warn("Failed to parse tags", zap.Error(err))
	}

	if lastUsed.Valid {
		tool.LastUsed = &lastUsed.Time
	}

	return tool, nil
}

// ListTools returns all tools with optional filtering
func (tm *ToolManager) ListTools(serverID *uuid.UUID, category, riskLevel string, enabled *bool) ([]*ManagedTool, error) {
	query := `
		SELECT id, server_id, server_url, name, description, input_schema, category, 
		       tags, risk_level, is_enabled, usage_count, last_used, created_at, updated_at
		FROM mcp_tools 
		WHERE deleted_at IS NULL
	`
	
	args := []interface{}{}
	argCount := 0

	if serverID != nil {
		argCount++
		query += fmt.Sprintf(" AND server_id = $%d", argCount)
		args = append(args, *serverID)
	}

	if category != "" {
		argCount++
		query += fmt.Sprintf(" AND category = $%d", argCount)
		args = append(args, category)
	}

	if riskLevel != "" {
		argCount++
		query += fmt.Sprintf(" AND risk_level = $%d", argCount)
		args = append(args, riskLevel)
	}

	if enabled != nil {
		argCount++
		query += fmt.Sprintf(" AND is_enabled = $%d", argCount)
		args = append(args, *enabled)
	}

	query += " ORDER BY usage_count DESC, name ASC"

	rows, err := tm.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tools []*ManagedTool
	for rows.Next() {
		tool := &ManagedTool{}
		var inputSchemaJSON, tagsJSON []byte
		var lastUsed sql.NullTime

		err := rows.Scan(
			&tool.ID,
			&tool.ServerID,
			&tool.ServerURL,
			&tool.Name,
			&tool.Description,
			&inputSchemaJSON,
			&tool.Category,
			&tagsJSON,
			&tool.RiskLevel,
			&tool.IsEnabled,
			&tool.UsageCount,
			&lastUsed,
			&tool.CreatedAt,
			&tool.UpdatedAt,
		)

		if err != nil {
			continue
		}

		// Parse JSON fields
		json.Unmarshal(inputSchemaJSON, &tool.InputSchema)
		json.Unmarshal(tagsJSON, &tool.Tags)

		if lastUsed.Valid {
			tool.LastUsed = &lastUsed.Time
		}

		tools = append(tools, tool)
	}

	return tools, nil
}

// GetToolUsageStats returns usage statistics for a tool
func (tm *ToolManager) GetToolUsageStats(toolID uuid.UUID) (*ToolUsageStats, error) {
	query := `
		SELECT 
			COUNT(*) as total_executions,
			COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_execs,
			COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_execs,
			AVG(EXTRACT(EPOCH FROM duration) * 1000) as avg_duration_ms,
			MAX(executed_at) as last_execution
		FROM tool_executions 
		WHERE tool_id = $1
	`

	row := tm.db.QueryRow(query, toolID)
	
	stats := &ToolUsageStats{ToolID: toolID}
	var avgDuration sql.NullFloat64
	var lastExec sql.NullTime

	err := row.Scan(
		&stats.TotalExecutions,
		&stats.SuccessfulExecs,
		&stats.FailedExecs,
		&avgDuration,
		&lastExec,
	)

	if err != nil {
		return nil, err
	}

	if avgDuration.Valid {
		stats.AverageDuration = avgDuration.Float64
	}

	if lastExec.Valid {
		stats.LastExecution = lastExec.Time
	}

	// Calculate popularity score (simple algorithm)
	if stats.TotalExecutions > 0 {
		successRate := float64(stats.SuccessfulExecs) / float64(stats.TotalExecutions)
		recencyFactor := 1.0
		if !lastExec.Time.IsZero() {
			daysSinceLastUse := time.Since(lastExec.Time).Hours() / 24
			recencyFactor = 1.0 / (1.0 + daysSinceLastUse/30) // Decay over 30 days
		}
		stats.PopularityScore = float64(stats.TotalExecutions) * successRate * recencyFactor
	}

	return stats, nil
}

// categorizeTools automatically categorizes a tool based on its name and description
func (tm *ToolManager) categorizeTools(name, description string) string {
	name = strings.ToLower(name)
	description = strings.ToLower(description)

	categories := map[string][]string{
		"filesystem": {"file", "directory", "read", "write", "path", "folder"},
		"database":   {"sql", "query", "database", "table", "select", "insert"},
		"network":    {"http", "request", "api", "url", "fetch", "download"},
		"system":     {"system", "process", "command", "execute", "run", "shell"},
		"security":   {"auth", "token", "password", "encrypt", "decrypt", "hash"},
		"data":       {"json", "xml", "parse", "format", "convert", "transform"},
		"ai":         {"llm", "model", "generate", "prompt", "completion", "chat"},
		"utility":    {"util", "helper", "format", "validate", "check"},
	}

	for category, keywords := range categories {
		for _, keyword := range keywords {
			if strings.Contains(name, keyword) || strings.Contains(description, keyword) {
				return category
			}
		}
	}

	return "other"
}

// assessRiskLevel assesses the risk level of a tool
func (tm *ToolManager) assessRiskLevel(name string, inputSchema map[string]interface{}) string {
	name = strings.ToLower(name)

	// High risk indicators
	highRiskKeywords := []string{
		"delete", "remove", "destroy", "execute", "run", "command", "shell",
		"admin", "root", "sudo", "system", "process", "kill",
	}

	// Medium risk indicators
	mediumRiskKeywords := []string{
		"write", "create", "modify", "update", "change", "edit",
		"network", "http", "request", "api", "fetch",
	}

	for _, keyword := range highRiskKeywords {
		if strings.Contains(name, keyword) {
			return "high"
		}
	}

	for _, keyword := range mediumRiskKeywords {
		if strings.Contains(name, keyword) {
			return "medium"
		}
	}

	// Check input schema for risky parameters
	if tm.hasRiskyParameters(inputSchema) {
		return "medium"
	}

	return "low"
}

// hasRiskyParameters checks if input schema contains risky parameters
func (tm *ToolManager) hasRiskyParameters(schema map[string]interface{}) bool {
	riskyParams := []string{"command", "path", "url", "code", "script", "query"}
	
	// This is a simplified check - in production you'd want more sophisticated analysis
	schemaStr := fmt.Sprintf("%v", schema)
	schemaStr = strings.ToLower(schemaStr)

	for _, param := range riskyParams {
		if strings.Contains(schemaStr, param) {
			return true
		}
	}

	return false
}

// extractTags extracts relevant tags from tool name and description
func (tm *ToolManager) extractTags(name, description string) []string {
	// Simple tag extraction - could be enhanced with NLP
	text := strings.ToLower(name + " " + description)
	
	tagKeywords := map[string]string{
		"file":     "filesystem",
		"database": "data",
		"api":      "network",
		"security": "security",
		"ai":       "artificial-intelligence",
		"util":     "utility",
	}

	var tags []string
	for keyword, tag := range tagKeywords {
		if strings.Contains(text, keyword) {
			tags = append(tags, tag)
		}
	}

	return tags
}

// validateArguments validates tool arguments against schema
func (tm *ToolManager) validateArguments(arguments map[string]interface{}, schema map[string]interface{}) error {
	// Basic validation - in production you'd want JSON Schema validation
	if properties, ok := schema["properties"].(map[string]interface{}); ok {
		if required, ok := schema["required"].([]interface{}); ok {
			for _, req := range required {
				if reqStr, ok := req.(string); ok {
					if _, exists := arguments[reqStr]; !exists {
						return fmt.Errorf("required parameter missing: %s", reqStr)
					}
				}
			}
		}

		// Check for unknown parameters
		for arg := range arguments {
			if _, exists := properties[arg]; !exists {
				return fmt.Errorf("unknown parameter: %s", arg)
			}
		}
	}

	return nil
}

// storeTool stores a tool in the database
func (tm *ToolManager) storeTool(tool *ManagedTool) error {
	query := `
		INSERT INTO mcp_tools (id, server_id, server_url, name, description, input_schema, 
		                      category, tags, risk_level, is_enabled, usage_count, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (server_id, name) DO UPDATE SET
			description = EXCLUDED.description,
			input_schema = EXCLUDED.input_schema,
			category = EXCLUDED.category,
			tags = EXCLUDED.tags,
			risk_level = EXCLUDED.risk_level,
			updated_at = EXCLUDED.updated_at
	`

	inputSchemaJSON, _ := json.Marshal(tool.InputSchema)
	tagsJSON, _ := json.Marshal(tool.Tags)

	_, err := tm.db.Exec(query,
		tool.ID,
		tool.ServerID,
		tool.ServerURL,
		tool.Name,
		tool.Description,
		inputSchemaJSON,
		tool.Category,
		tagsJSON,
		tool.RiskLevel,
		tool.IsEnabled,
		tool.UsageCount,
		tool.CreatedAt,
		tool.UpdatedAt,
	)

	return err
}

// storeExecution stores a tool execution record
func (tm *ToolManager) storeExecution(execution *ToolExecution) error {
	query := `
		INSERT INTO tool_executions (id, tool_id, server_id, user_id, arguments, result, 
		                           error, duration, status, executed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	argumentsJSON, _ := json.Marshal(execution.Arguments)
	resultJSON, _ := json.Marshal(execution.Result)

	_, err := tm.db.Exec(query,
		execution.ID,
		execution.ToolID,
		execution.ServerID,
		execution.UserID,
		argumentsJSON,
		resultJSON,
		execution.Error,
		execution.Duration,
		execution.Status,
		execution.ExecutedAt,
	)

	return err
}

// updateToolUsage updates tool usage statistics
func (tm *ToolManager) updateToolUsage(toolID uuid.UUID) error {
	query := `
		UPDATE mcp_tools 
		SET usage_count = usage_count + 1, last_used = NOW(), updated_at = NOW()
		WHERE id = $1
	`

	_, err := tm.db.Exec(query, toolID)
	return err
}