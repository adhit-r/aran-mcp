package security

import (
	"context"
	"fmt"

	"go.uber.org/zap"
)

// DetectionPipeline chains security analyzers for MCP tool responses
type DetectionPipeline struct {
	logger             *zap.Logger
	promptDetector     *PromptInjectionDetector
	credentialScanner  *CredentialScanner
	behavioralAnalyzer *BehavioralAnalyzer
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

// NewDetectionPipeline creates a new detection pipeline
func NewDetectionPipeline(logger *zap.Logger) *DetectionPipeline {
	return &DetectionPipeline{
		logger:             logger,
		promptDetector:     NewPromptInjectionDetector(),
		credentialScanner:  NewCredentialScanner(),
		behavioralAnalyzer: NewBehavioralAnalyzer(),
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
				Confidence: 0.8, // High confidence for pattern matches
			}
			result.Alerts = append(result.Alerts, alert)
			if exposure.Severity == "high" || exposure.Severity == "critical" {
				result.Passed = false
			}
		}
	}

	// Run behavioral analysis (using agent ID from metadata if available)
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
			Message:    fmt.Sprintf("Behavioral anomaly detected: %s", behaviorResult.AnomalyType),
			Details:    map[string]interface{}{"trust_score": behaviorResult.TrustScore, "anomalies": behaviorResult.Anomalies},
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
