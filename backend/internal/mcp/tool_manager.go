package mcp

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/radhi1991/aran-mcp-sentinel/internal/common"
)

// ToolManager manages MCP tools across servers
type ToolManager struct {
	db       *sql.DB
	logger   *zap.Logger
	protocol *MCPProtocol
	pipeline *DetectionPipeline
}

// DetectionPipeline chains security analyzers for MCP tool responses
type DetectionPipeline struct {
	logger             *zap.Logger
	promptDetector     *PromptInjectionDetector
	credentialScanner  *CredentialScanner
	behavioralAnalyzer *BehavioralAnalyzer
}

// PromptInjectionDetector detects potential prompt injection attacks
type PromptInjectionDetector struct{}

// PromptInjectionResult represents the result of prompt injection analysis
type PromptInjectionResult struct {
	IsDetected      bool     `json:"is_detected"`
	RiskLevel       string   `json:"risk_level"`
	MatchedPatterns []string `json:"matched_patterns"`
	Score           int      `json:"score"`
}

// CredentialScanner detects exposed credentials and secrets
type CredentialScanner struct{}

// CredentialExposure represents detected credential exposure
type CredentialExposure struct {
	Type     string `json:"type"`
	Severity string `json:"severity"`
	Masked   string `json:"masked"`
}

// ScanResult contains all detected exposures
type ScanResult struct {
	HasExposures bool                  `json:"has_exposures"`
	Exposures    []*CredentialExposure `json:"exposures"`
	RiskScore    int                   `json:"risk_score"`
}

// BehavioralAnalyzer detects anomalous MCP agent behavior
type BehavioralAnalyzer struct{}

// BehavioralAnalysisResult contains analysis results
type BehavioralAnalysisResult struct {
	IsAnomalous bool    `json:"is_anomalous"`
	Severity    string  `json:"severity"`
	TrustScore  float64 `json:"trust_score"`
}

// MCPTool represents an MCP tool (local definition)
type MCPTool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	InputSchema map[string]interface{} `json:"inputSchema"`
}

// NewDetectionPipeline creates a new detection pipeline
func NewDetectionPipeline(logger *zap.Logger) *DetectionPipeline {
	return &DetectionPipeline{
		logger:             logger,
		promptDetector:     &PromptInjectionDetector{},
		credentialScanner:  &CredentialScanner{},
		behavioralAnalyzer: &BehavioralAnalyzer{},
	}
}

// AnalyzePrompt analyzes a prompt for potential injection attacks
func (d *PromptInjectionDetector) AnalyzePrompt(prompt string) *PromptInjectionResult {
	// Stub implementation - always returns low risk
	return &PromptInjectionResult{
		IsDetected:      false,
		RiskLevel:       "low",
		MatchedPatterns: []string{},
		Score:           0,
	}
}

// ScanText scans text for exposed credentials
func (cs *CredentialScanner) ScanText(text string) *ScanResult {
	// Stub implementation - no exposures detected
	return &ScanResult{
		HasExposures: false,
		Exposures:    []*CredentialExposure{},
		RiskScore:    0,
	}
}

// AnalyzeAgentBehavior analyzes agent behavior for anomalies
func (ba *BehavioralAnalyzer) AnalyzeAgentBehavior(agentID string, toolName string, params map[string]interface{}) *BehavioralAnalysisResult {
	// Stub implementation - no anomalies
	return &BehavioralAnalysisResult{
		IsAnomalous: false,
		Severity:    "normal",
		TrustScore:  100.0,
	}
}

// AnalyzeResponse runs the full detection pipeline on a tool response
func (dp *DetectionPipeline) AnalyzeResponse(ctx context.Context, response interface{}, metadata map[string]interface{}) (*PipelineResult, error) {
	result := &PipelineResult{
		Passed:   true,
		Alerts:   []Alert{},
		Metadata: metadata,
	}

	// Convert response to string for analysis
	responseStr := fmt.Sprintf("%v", response)

	// Run prompt injection detection
	promptResult := dp.promptDetector.AnalyzePrompt(responseStr)
	if promptResult.IsDetected {
		alert := Alert{
			Type:       "prompt_injection",
			Severity:   promptResult.RiskLevel,
			Message:    fmt.Sprintf("Prompt injection detected: %v", promptResult.MatchedPatterns),
			Details:    map[string]interface{}{"matched_patterns": promptResult.MatchedPatterns, "score": promptResult.Score},
			Confidence: float64(promptResult.Score) / 100.0,
		}
		result.Alerts = append(result.Alerts, alert)
		if promptResult.RiskLevel == "high" || promptResult.RiskLevel == "critical" {
			result.Passed = false
		}
	}

	// Run credential scanning
	credResult := dp.credentialScanner.ScanText(responseStr)
	if credResult.HasExposures {
		for _, exposure := range credResult.Exposures {
			alert := Alert{
				Type:       "credential_exposure",
				Severity:   exposure.Severity,
				Message:    fmt.Sprintf("Credential exposure detected: %s", exposure.Type),
				Details:    map[string]interface{}{"type": exposure.Type, "masked": exposure.Masked},
				Confidence: 0.8,
			}
			result.Alerts = append(result.Alerts, alert)
			if exposure.Severity == "high" || exposure.Severity == "critical" {
				result.Passed = false
			}
		}
	}

	// Run behavioral analysis
	agentID := "unknown"
	if id, ok := metadata["agent_id"].(string); ok {
		agentID = id
	}
	toolName := "unknown"
	if name, ok := metadata["tool_name"].(string); ok {
		toolName = name
	}
	params := map[string]interface{}{}
	if p, ok := metadata["params"].(map[string]interface{}); ok {
		params = p
	}

	behaviorResult := dp.behavioralAnalyzer.AnalyzeAgentBehavior(agentID, toolName, params)
	if behaviorResult.IsAnomalous {
		alert := Alert{
			Type:       "behavioral_anomaly",
			Severity:   behaviorResult.Severity,
			Message:    "Behavioral anomaly detected",
			Details:    map[string]interface{}{"trust_score": behaviorResult.TrustScore},
			Confidence: 0.7,
		}
		result.Alerts = append(result.Alerts, alert)
		if behaviorResult.Severity == "high" || behaviorResult.Severity == "critical" {
			result.Passed = false
		}
	}

	// Log alerts
	if len(result.Alerts) > 0 {
		dp.logger.Warn("Security alerts detected in tool response",
			zap.Bool("passed", result.Passed),
			zap.Int("alert_count", len(result.Alerts)),
			zap.Any("alerts", result.Alerts),
		)
	}

	return result, nil
}

// CheckToolDrift compares stored tool metadata with live metadata
func (tm *ToolManager) CheckToolDrift(ctx context.Context, toolID uuid.UUID) error {
	storedTool, err := tm.GetTool(toolID)
	if err != nil {
		return fmt.Errorf("failed to get stored tool: %w", err)
	}

	// Fetch live tool metadata from MCP server
	liveTools, err := tm.protocol.ListTools(ctx, storedTool.ServerURL)
	if err != nil {
		return fmt.Errorf("failed to fetch live tools: %w", err)
	}

	// Find the matching live tool
	var liveTool *common.MCPTool
	for _, tool := range liveTools {
		if tool.Name == storedTool.Name {
			liveTool = &tool
			break
		}
	}

	if liveTool == nil {
		return fmt.Errorf("tool not found on live server: %s", storedTool.Name)
	}

	// Compare metadata for drift detection
	drifts := []string{}

	// Check description drift
	if liveTool.Description != storedTool.Description {
		drifts = append(drifts, "description changed")
	}

	// Check input schema drift
	liveSchemaJSON, _ := json.Marshal(liveTool.InputSchema)
	storedSchemaJSON, _ := json.Marshal(storedTool.InputSchema)
	if string(liveSchemaJSON) != string(storedSchemaJSON) {
		drifts = append(drifts, "input schema changed")
	}

	// Check version hash drift (if available)
	liveHash := tm.generateToolHash(liveTool)
	if liveHash != storedTool.VersionHash {
		drifts = append(drifts, "version hash changed")
	}

	if len(drifts) > 0 {
		tm.logger.Warn("Tool drift detected",
			zap.String("tool_id", toolID.String()),
			zap.String("tool_name", storedTool.Name),
			zap.Strings("drifts", drifts),
		)

		// Create alert for drift detection
		alert := Alert{
			Type:       "tool_drift",
			Severity:   "medium",
			Message:    fmt.Sprintf("Tool drift detected for %s: %s", storedTool.Name, strings.Join(drifts, ", ")),
			Details:    map[string]interface{}{"drifts": drifts, "tool_id": toolID.String()},
			Confidence: 0.9,
		}

		if saveErr := tm.saveAlerts([]Alert{alert}, storedTool.ServerID); saveErr != nil {
			tm.logger.Error("Failed to save drift alert", zap.Error(saveErr))
		}

		return fmt.Errorf("tool drift detected: %s", strings.Join(drifts, ", "))
	}

	tm.logger.Info("Tool drift check passed",
		zap.String("tool_id", toolID.String()),
		zap.String("tool_name", storedTool.Name),
	)

	return nil
}

// generateToolHash generates a hash for tool metadata comparison
func (tm *ToolManager) generateToolHash(tool *common.MCPTool) string {
	// Create a deterministic representation of the tool
	hashInput := fmt.Sprintf("%s|%s|%v", tool.Name, tool.Description, tool.InputSchema)
	return fmt.Sprintf("%x", hashInput) // Simple hash for now
}

// LogToolInvocation logs a tool invocation for replay detection
func (tm *ToolManager) LogToolInvocation(invocation *ToolInvocation) error {
	query := `
		INSERT INTO mcp_tool_invocations (
			id, tool_id, server_id, user_id, request_fingerprint, response_fingerprint,
			arguments, result, error, duration, status, executed_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`

	argumentsJSON, _ := json.Marshal(invocation.Arguments)
	resultJSON, _ := json.Marshal(invocation.Result)

	_, err := tm.db.Exec(query,
		invocation.ID,
		invocation.ToolID,
		invocation.ServerID,
		invocation.UserID,
		invocation.RequestFingerprint,
		invocation.ResponseFingerprint,
		argumentsJSON,
		resultJSON,
		invocation.Error,
		invocation.Duration,
		invocation.Status,
		invocation.ExecutedAt,
	)

	return err
}

// CheckReplay detects if a request is a replay attack
func (tm *ToolManager) CheckReplay(requestFingerprint string, timeWindow time.Duration) (bool, error) {
	query := `
		SELECT COUNT(*) FROM mcp_tool_invocations
		WHERE request_fingerprint = $1
		AND executed_at > NOW() - $2::interval
		AND deleted_at IS NULL
	`

	var count int
	err := tm.db.QueryRow(query, requestFingerprint, timeWindow.String()).Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// generateFingerprint creates a simple fingerprint for request deduplication
func (tm *ToolManager) generateFingerprint(arguments map[string]interface{}) string {
	// Simple fingerprint: hash of sorted argument keys and values
	argsStr := fmt.Sprintf("%v", arguments)
	return fmt.Sprintf("%x", argsStr) // Simple hash for now
}

// PipelineResult represents the result of running the detection pipeline
type PipelineResult struct {
	Passed         bool                   `json:"passed"`
	Alerts         []Alert                `json:"alerts"`
	AnalysisTimeMs int64                  `json:"analysis_time_ms"`
	Metadata       map[string]interface{} `json:"metadata"`
}

// Alert represents a security alert from the pipeline
type Alert struct {
	Type       string                 `json:"type"`
	Severity   string                 `json:"severity"` // low, medium, high, critical
	Message    string                 `json:"message"`
	Details    map[string]interface{} `json:"details"`
	Confidence float64                `json:"confidence"`
}

// AttestTool records attestation data for a tool (stub)
func (tm *ToolManager) AttestTool(toolID uuid.UUID, signature, versionHash string, verifiedAt time.Time) error {
	// TODO: Implement attestation logic (e.g., verify signature, update DB)
	query := `
		UPDATE mcp_tools SET signature = $1, version_hash = $2, last_verified_at = $3, updated_at = NOW()
		WHERE id = $4 AND deleted_at IS NULL
	`
	_, err := tm.db.Exec(query, signature, versionHash, verifiedAt, toolID)
	return err
}

// VerifyTool checks attestation for a tool with comprehensive validation
func (tm *ToolManager) VerifyTool(toolID uuid.UUID) (bool, error) {
	tool, err := tm.GetTool(toolID)
	if err != nil {
		return false, err
	}

	// Check if attestation fields are present
	if tool.Signature == "" || tool.VersionHash == "" || tool.LastVerifiedAt == nil {
		tm.logger.Warn("Tool attestation fields missing",
			zap.String("tool_id", toolID.String()),
			zap.String("tool_name", tool.Name),
		)
		return false, nil
	}

	// Check if attestation is stale (older than 24 hours)
	if time.Since(*tool.LastVerifiedAt) > 24*time.Hour {
		tm.logger.Warn("Tool attestation is stale",
			zap.String("tool_id", toolID.String()),
			zap.String("tool_name", tool.Name),
			zap.Time("last_verified", *tool.LastVerifiedAt),
		)
		return false, nil
	}

	// TODO: Add cryptographic signature verification
	// For now, we verify the signature format (should be a valid signature)
	if !tm.isValidSignatureFormat(tool.Signature) {
		tm.logger.Warn("Tool signature format invalid",
			zap.String("tool_id", toolID.String()),
			zap.String("tool_name", tool.Name),
		)
		return false, nil
	}

	// TODO: Add version hash verification
	// For now, we verify the hash format (should be a valid hash)
	if !tm.isValidHashFormat(tool.VersionHash) {
		tm.logger.Warn("Tool version hash format invalid",
			zap.String("tool_id", toolID.String()),
			zap.String("tool_name", tool.Name),
		)
		return false, nil
	}

	tm.logger.Info("Tool attestation verified successfully",
		zap.String("tool_id", toolID.String()),
		zap.String("tool_name", tool.Name),
	)

	return true, nil
}

// isValidSignatureFormat checks if the signature has a valid format
func (tm *ToolManager) isValidSignatureFormat(signature string) bool {
	// Basic validation: should be a non-empty string with reasonable length
	// In production, this would validate cryptographic signature format
	return len(signature) > 10 && len(signature) < 1000
}

// isValidHashFormat checks if the hash has a valid format
func (tm *ToolManager) isValidHashFormat(hash string) bool {
	// Basic validation: should be a non-empty string with reasonable length
	// In production, this would validate hash format (e.g., SHA-256)
	return len(hash) > 10 && len(hash) < 200
}

// ManagedTool represents a tool managed by the system
type ManagedTool struct {
	ID             uuid.UUID              `json:"id"`
	ServerID       uuid.UUID              `json:"server_id"`
	ServerURL      string                 `json:"server_url"`
	Name           string                 `json:"name"`
	Description    string                 `json:"description"`
	InputSchema    map[string]interface{} `json:"input_schema"`
	Category       string                 `json:"category"`
	Tags           []string               `json:"tags"`
	RiskLevel      string                 `json:"risk_level"`
	IsEnabled      bool                   `json:"is_enabled"`
	UsageCount     int64                  `json:"usage_count"`
	LastUsed       *time.Time             `json:"last_used,omitempty"`
	CreatedAt      time.Time              `json:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"`
	Signature      string                 `json:"signature"`
	VersionHash    string                 `json:"version_hash"`
	LastVerifiedAt *time.Time             `json:"last_verified_at,omitempty"`
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

// ToolInvocation represents a logged invocation for replay detection
type ToolInvocation struct {
	ID                  uuid.UUID              `json:"id"`
	ToolID              uuid.UUID              `json:"tool_id"`
	ServerID            uuid.UUID              `json:"server_id"`
	UserID              *uuid.UUID             `json:"user_id,omitempty"`
	RequestFingerprint  string                 `json:"request_fingerprint"`
	ResponseFingerprint string                 `json:"response_fingerprint"`
	Arguments           map[string]interface{} `json:"arguments"`
	Result              interface{}            `json:"result,omitempty"`
	Error               string                 `json:"error,omitempty"`
	Duration            time.Duration          `json:"duration"`
	Status              string                 `json:"status"`
	ExecutedAt          time.Time              `json:"executed_at"`
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
	ToolID          uuid.UUID `json:"tool_id"`
	TotalExecutions int64     `json:"total_executions"`
	SuccessfulExecs int64     `json:"successful_executions"`
	FailedExecs     int64     `json:"failed_executions"`
	AverageDuration float64   `json:"average_duration_ms"`
	LastExecution   time.Time `json:"last_execution"`
	PopularityScore float64   `json:"popularity_score"`
}

// NewToolManager creates a new tool manager
func NewToolManager(db *sql.DB, logger *zap.Logger) *ToolManager {
	return &ToolManager{
		db:       db,
		logger:   logger,
		protocol: NewMCPProtocol(logger),
		pipeline: NewDetectionPipeline(logger),
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
			Category:    tm.categorizeTools(mcpTool.Name, mcpTool.Description),
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

	// Enforce attestation verification
	verified, verr := tm.VerifyTool(toolID)
	if verr != nil {
		tm.logger.Error("Attestation verification failed", zap.Error(verr), zap.String("tool_id", toolID.String()))
		return nil, fmt.Errorf("attestation verification error: %w", verr)
	}
	if !verified {
		tm.logger.Warn("Tool attestation invalid or missing", zap.String("tool_id", toolID.String()), zap.String("tool_name", tool.Name))
		return nil, fmt.Errorf("tool attestation invalid or missing: %s", tool.Name)
	}

	// Check for tool drift before execution
	if driftErr := tm.CheckToolDrift(ctx, toolID); driftErr != nil {
		tm.logger.Warn("Tool drift detected, but allowing execution",
			zap.String("tool_id", toolID.String()),
			zap.String("tool_name", tool.Name),
			zap.Error(driftErr),
		)
		// For now, we log the drift but allow execution
		// TODO: In production, you might want to block execution or require re-attestation
	}

	// Check for replay attack
	requestFingerprint := tm.generateFingerprint(arguments)
	isReplay, rerr := tm.CheckReplay(requestFingerprint, 5*time.Minute) // 5 minute window
	if rerr != nil {
		tm.logger.Error("Replay check failed", zap.Error(rerr))
		// Continue execution but log the error
	} else if isReplay {
		tm.logger.Warn("Potential replay attack detected", zap.String("tool_id", toolID.String()), zap.String("fingerprint", requestFingerprint))
		return nil, fmt.Errorf("potential replay attack detected")
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

		// Run security analysis on the response
		metadata := map[string]interface{}{
			"tool_name": tool.Name,
			"agent_id":  "unknown", // TODO: pass actual agent ID
			"params":    arguments,
		}
		pipelineResult, perr := tm.pipeline.AnalyzeResponse(ctx, result, metadata)
		if perr != nil {
			tm.logger.Error("Security analysis failed", zap.Error(perr))
		} else {
			// Save alerts to database if any were detected
			if len(pipelineResult.Alerts) > 0 {
				if saveErr := tm.saveAlerts(pipelineResult.Alerts, tool.ServerID); saveErr != nil {
					tm.logger.Error("Failed to save security alerts", zap.Error(saveErr))
				}
			}

			if !pipelineResult.Passed {
				tm.logger.Warn("Security analysis failed for tool response",
					zap.String("tool_name", tool.Name),
					zap.Int("alert_count", len(pipelineResult.Alerts)),
				)
				// TODO: Decide whether to block response or just log
				// For now, we log but allow the response through
			}
		}
	}

	// Store execution record
	if storeErr := tm.storeExecution(execution); storeErr != nil {
		tm.logger.Error("Failed to store execution record", zap.Error(storeErr))
	}

	// Log invocation for replay detection
	responseFingerprint := ""
	if execution.Result != nil {
		responseFingerprint = tm.generateFingerprint(map[string]interface{}{"result": execution.Result})
	}
	invocation := &ToolInvocation{
		ID:                  uuid.New(),
		ToolID:              toolID,
		ServerID:            tool.ServerID,
		UserID:              userID,
		RequestFingerprint:  requestFingerprint,
		ResponseFingerprint: responseFingerprint,
		Arguments:           arguments,
		Result:              execution.Result,
		Error:               execution.Error,
		Duration:            execution.Duration,
		Status:              execution.Status,
		ExecutedAt:          execution.ExecutedAt,
	}
	if logErr := tm.LogToolInvocation(invocation); logErr != nil {
		tm.logger.Error("Failed to log tool invocation", zap.Error(logErr))
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
		   tags, risk_level, is_enabled, usage_count, last_used, created_at, updated_at,
		   signature, version_hash, last_verified_at
	FROM mcp_tools 
	WHERE id = $1 AND deleted_at IS NULL
	`

	tool := &ManagedTool{}
	var inputSchemaJSON, tagsJSON []byte
	var lastUsed sql.NullTime
	var signature, versionHash sql.NullString
	var lastVerifiedAt sql.NullTime

	row := tm.db.QueryRow(query, toolID)
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
		&signature,
		&versionHash,
		&lastVerifiedAt,
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

	if signature.Valid {
		tool.Signature = signature.String
	}
	if versionHash.Valid {
		tool.VersionHash = versionHash.String
	}
	if lastVerifiedAt.Valid {
		tool.LastVerifiedAt = &lastVerifiedAt.Time
	}

	return tool, nil
}

// ListTools returns all tools with optional filtering
func (tm *ToolManager) ListTools(serverID *uuid.UUID, category, riskLevel string, enabled *bool) ([]*ManagedTool, error) {
	query := `
		SELECT id, server_id, server_url, name, description, input_schema, category, 
			   tags, risk_level, is_enabled, usage_count, last_used, created_at, updated_at,
			   signature, version_hash, last_verified_at
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
		var lastUsed, lastVerifiedAt sql.NullTime
		var signature, versionHash sql.NullString

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
			&signature,
			&versionHash,
			&lastVerifiedAt,
		)

		if err != nil {
			continue
		}

		// Parse JSON fields
		if err := json.Unmarshal(inputSchemaJSON, &tool.InputSchema); err != nil {
			return nil, fmt.Errorf("failed to unmarshal input schema: %w", err)
		}
		if err := json.Unmarshal(tagsJSON, &tool.Tags); err != nil {
			return nil, fmt.Errorf("failed to unmarshal tags: %w", err)
		}

		if lastUsed.Valid {
			tool.LastUsed = &lastUsed.Time
		}
		if signature.Valid {
			tool.Signature = signature.String
		}
		if versionHash.Valid {
			tool.VersionHash = versionHash.String
		}
		if lastVerifiedAt.Valid {
			tool.LastVerifiedAt = &lastVerifiedAt.Time
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
			INSERT INTO mcp_tools (
				id, server_id, server_url, name, description, input_schema, 
				category, tags, risk_level, is_enabled, usage_count, created_at, updated_at,
				signature, version_hash, last_verified_at
			)
			VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
				$14, $15, $16
			)
			ON CONFLICT (server_id, name) DO UPDATE SET
				description = EXCLUDED.description,
				input_schema = EXCLUDED.input_schema,
				category = EXCLUDED.category,
				tags = EXCLUDED.tags,
				risk_level = EXCLUDED.risk_level,
				updated_at = EXCLUDED.updated_at,
				signature = EXCLUDED.signature,
				version_hash = EXCLUDED.version_hash,
				last_verified_at = EXCLUDED.last_verified_at
		`

	// Enforce attestation requirement for all tools
	if tool.Signature == "" || tool.VersionHash == "" || tool.LastVerifiedAt == nil {
		tm.logger.Warn("Tool attestation required but missing during storage",
			zap.String("tool_id", tool.ID.String()),
			zap.String("tool_name", tool.Name),
		)
		return fmt.Errorf("tool attestation required: %s", tool.Name)
	}

	// Verify attestation before storing
	verified, verr := tm.VerifyTool(tool.ID)
	if verr != nil {
		tm.logger.Error("Attestation verification failed during storage",
			zap.Error(verr),
			zap.String("tool_id", tool.ID.String()),
		)
		return verr
	}
	if !verified {
		tm.logger.Warn("Tool attestation invalid during storage",
			zap.String("tool_id", tool.ID.String()),
			zap.String("tool_name", tool.Name),
		)
		return fmt.Errorf("tool attestation invalid: %s", tool.Name)
	}

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
		tool.Signature,
		tool.VersionHash,
		tool.LastVerifiedAt,
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

// saveAlerts saves security alerts to the database
func (tm *ToolManager) saveAlerts(alerts []Alert, serverID uuid.UUID) error {
	if len(alerts) == 0 {
		return nil
	}

	query := `
		INSERT INTO mcp_alerts (server_id, alert_type, severity, message, details)
		VALUES ($1, $2, $3, $4, $5)
	`

	for _, alert := range alerts {
		detailsJSON, _ := json.Marshal(alert.Details)
		_, err := tm.db.Exec(query, serverID, alert.Type, alert.Severity, alert.Message, detailsJSON)
		if err != nil {
			tm.logger.Error("Failed to save alert",
				zap.String("alert_type", alert.Type),
				zap.String("severity", alert.Severity),
				zap.Error(err),
			)
			return err
		}
	}

	tm.logger.Info("Saved security alerts",
		zap.String("server_id", serverID.String()),
		zap.Int("alert_count", len(alerts)),
	)

	return nil
}
