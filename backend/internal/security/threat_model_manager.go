package security

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// ThreatModelManager manages threat modeling operations
type ThreatModelManager struct {
	logger     *zap.Logger
	tactics    []ThreatTactic
	techniques []ThreatTechnique
	mitigations []ThreatMitigation
}

// NewThreatModelManager creates a new threat model manager
func NewThreatModelManager(logger *zap.Logger) *ThreatModelManager {
	return &ThreatModelManager{
		logger:      logger,
		tactics:     GetDefaultTactics(),
		techniques:  GetDefaultTechniques(),
		mitigations: GetDefaultMitigations(),
	}
}

// GetTactics returns all threat tactics
func (m *ThreatModelManager) GetTactics(ctx context.Context) []ThreatTactic {
	return m.tactics
}

// GetTacticByID returns a specific tactic by ID
func (m *ThreatModelManager) GetTacticByID(ctx context.Context, id string) (*ThreatTactic, error) {
	for _, tactic := range m.tactics {
		if tactic.ID == id {
			return &tactic, nil
		}
	}
	return nil, fmt.Errorf("tactic not found: %s", id)
}

// GetTechniques returns all threat techniques
func (m *ThreatModelManager) GetTechniques(ctx context.Context) []ThreatTechnique {
	return m.techniques
}

// GetTechniqueByID returns a specific technique by ID
func (m *ThreatModelManager) GetTechniqueByID(ctx context.Context, id string) (*ThreatTechnique, error) {
	for _, technique := range m.techniques {
		if technique.ID == id {
			return &technique, nil
		}
	}
	return nil, fmt.Errorf("technique not found: %s", id)
}

// GetTechniquesByTactic returns techniques for a specific tactic
func (m *ThreatModelManager) GetTechniquesByTactic(ctx context.Context, tacticID string) []ThreatTechnique {
	var results []ThreatTechnique
	for _, technique := range m.techniques {
		if technique.TacticID == tacticID {
			results = append(results, technique)
		}
	}
	return results
}

// GetMitigations returns all mitigations
func (m *ThreatModelManager) GetMitigations(ctx context.Context) []ThreatMitigation {
	return m.mitigations
}

// GetMitigationByID returns a specific mitigation by ID
func (m *ThreatModelManager) GetMitigationByID(ctx context.Context, id string) (*ThreatMitigation, error) {
	for _, mitigation := range m.mitigations {
		if mitigation.ID == id {
			return &mitigation, nil
		}
	}
	return nil, fmt.Errorf("mitigation not found: %s", id)
}

// GetMitigationsForTechnique returns mitigations for a specific technique
func (m *ThreatModelManager) GetMitigationsForTechnique(ctx context.Context, techniqueID string) []ThreatMitigation {
	var results []ThreatMitigation
	for _, mitigation := range m.mitigations {
		for _, tid := range mitigation.TechniqueIDs {
			if tid == techniqueID {
				results = append(results, mitigation)
				break
			}
		}
	}
	return results
}

// DetectThreats performs threat detection based on evidence
func (m *ThreatModelManager) DetectThreats(ctx context.Context, serverID uuid.UUID, evidence map[string]interface{}) ([]ThreatDetection, error) {
	m.logger.Info("Performing threat detection",
		zap.String("server_id", serverID.String()),
	)

	var detections []ThreatDetection

	// Check for tool poisoning indicators
	if toolPoisoningDetected(evidence) {
		detection := ThreatDetection{
			ID:          uuid.New(),
			ServerID:    serverID,
			TechniqueID: "SAFE-T1001",
			Confidence:  0.85,
			Severity:    "CRITICAL",
			Status:      "DETECTED",
			Evidence:    evidence,
			Indicators:  extractIndicators(evidence),
			DetectedAt:  time.Now(),
			UpdatedAt:   time.Now(),
		}
		detections = append(detections, detection)
	}

	// Check for prompt injection indicators
	if promptInjectionDetected(evidence) {
		detection := ThreatDetection{
			ID:          uuid.New(),
			ServerID:    serverID,
			TechniqueID: "SAFE-T1102",
			Confidence:  0.75,
			Severity:    "CRITICAL",
			Status:      "DETECTED",
			Evidence:    evidence,
			Indicators:  extractIndicators(evidence),
			DetectedAt:  time.Now(),
			UpdatedAt:   time.Now(),
		}
		detections = append(detections, detection)
	}

	// Check for credential access attempts
	if credentialAccessDetected(evidence) {
		detection := ThreatDetection{
			ID:          uuid.New(),
			ServerID:    serverID,
			TechniqueID: "SAFE-T1501",
			Confidence:  0.70,
			Severity:    "HIGH",
			Status:      "DETECTED",
			Evidence:    evidence,
			Indicators:  extractIndicators(evidence),
			DetectedAt:  time.Now(),
			UpdatedAt:   time.Now(),
		}
		detections = append(detections, detection)
	}

	m.logger.Info("Threat detection completed",
		zap.Int("detections", len(detections)),
	)

	return detections, nil
}

// AssessRisk performs risk assessment for a server
func (m *ThreatModelManager) AssessRisk(ctx context.Context, serverID uuid.UUID, detections []ThreatDetection) (*RiskAssessment, error) {
	m.logger.Info("Performing risk assessment",
		zap.String("server_id", serverID.String()),
	)

	assessment := &RiskAssessment{
		ID:          uuid.New(),
		ServerID:    serverID,
		ThreatCount: len(detections),
		AssessedAt:  time.Now(),
	}

	// Calculate risk score based on detections
	riskScore := 0
	for _, detection := range detections {
		switch detection.Severity {
		case "CRITICAL":
			riskScore += 25
		case "HIGH":
			riskScore += 15
		case "MEDIUM":
			riskScore += 10
		case "LOW":
			riskScore += 5
		}
	}

	// Cap at 100
	if riskScore > 100 {
		riskScore = 100
	}

	assessment.RiskScore = riskScore

	// Determine overall risk level
	switch {
	case riskScore >= 75:
		assessment.OverallRisk = "CRITICAL"
	case riskScore >= 50:
		assessment.OverallRisk = "HIGH"
	case riskScore >= 25:
		assessment.OverallRisk = "MEDIUM"
	default:
		assessment.OverallRisk = "LOW"
	}

	// Calculate mitigation coverage
	assessment.MitigationCount = m.countAppliedMitigations(detections)
	assessment.CoverageScore = m.calculateCoverageScore(assessment.ThreatCount, assessment.MitigationCount)

	// Generate recommendations
	assessment.Recommendations = m.generateRecommendations(detections)

	// Add detailed information
	assessment.Details = map[string]interface{}{
		"critical_threats": m.countBySeverity(detections, "CRITICAL"),
		"high_threats":     m.countBySeverity(detections, "HIGH"),
		"medium_threats":   m.countBySeverity(detections, "MEDIUM"),
		"low_threats":      m.countBySeverity(detections, "LOW"),
	}

	m.logger.Info("Risk assessment completed",
		zap.String("overall_risk", assessment.OverallRisk),
		zap.Int("risk_score", assessment.RiskScore),
	)

	return assessment, nil
}

// CreateAlert creates a security alert from a detection
func (m *ThreatModelManager) CreateAlert(ctx context.Context, detection ThreatDetection) (*ThreatAlert, error) {
	technique, err := m.GetTechniqueByID(ctx, detection.TechniqueID)
	if err != nil {
		return nil, err
	}

	alert := &ThreatAlert{
		ID:          uuid.New(),
		DetectionID: detection.ID,
		Title:       fmt.Sprintf("%s detected", technique.Name),
		Description: fmt.Sprintf("Threat technique %s (%s) detected with confidence %.2f", technique.ID, technique.Name, detection.Confidence),
		Severity:    detection.Severity,
		Status:      "OPEN",
		Priority:    m.determinePriority(detection.Severity),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	m.logger.Info("Created threat alert",
		zap.String("alert_id", alert.ID.String()),
		zap.String("technique", detection.TechniqueID),
	)

	return alert, nil
}

// Helper functions

func toolPoisoningDetected(evidence map[string]interface{}) bool {
	// Check for hidden characters, suspicious patterns in tool descriptions
	if desc, ok := evidence["tool_description"].(string); ok {
		// Check for HTML comments
		if containsHTMLComments(desc) {
			return true
		}
		// Check for zero-width characters
		if containsZeroWidthChars(desc) {
			return true
		}
	}
	return false
}

func promptInjectionDetected(evidence map[string]interface{}) bool {
	// Check for prompt injection patterns
	if prompt, ok := evidence["prompt"].(string); ok {
		// Look for common injection patterns
		injectionPatterns := []string{
			"ignore previous instructions",
			"disregard all",
			"system:",
			"<!-- ",
		}
		for _, pattern := range injectionPatterns {
			if containsPattern(prompt, pattern) {
				return true
			}
		}
	}
	return false
}

func credentialAccessDetected(evidence map[string]interface{}) bool {
	// Check for credential access patterns
	if accessed, ok := evidence["accessed_files"].([]string); ok {
		sensitiveFiles := []string{".env", "credentials", "secrets", "id_rsa"}
		for _, file := range accessed {
			for _, sensitive := range sensitiveFiles {
				if containsPattern(file, sensitive) {
					return true
				}
			}
		}
	}
	return false
}

func extractIndicators(evidence map[string]interface{}) []string {
	var indicators []string
	for key, value := range evidence {
		indicators = append(indicators, fmt.Sprintf("%s: %v", key, value))
	}
	return indicators
}

func containsHTMLComments(s string) bool {
	return containsPattern(s, "<!--")
}

func containsZeroWidthChars(s string) bool {
	zeroWidthChars := []rune{'\u200B', '\u200C', '\u200D', '\uFEFF'}
	for _, char := range s {
		for _, zwc := range zeroWidthChars {
			if char == zwc {
				return true
			}
		}
	}
	return false
}

func containsPattern(s, pattern string) bool {
	// Simple case-insensitive contains check
	return len(s) > 0 && len(pattern) > 0 && 
		(s == pattern || containsSubstring(s, pattern))
}

func containsSubstring(s, substr string) bool {
	// Basic substring search
	if len(substr) > len(s) {
		return false
	}
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func (m *ThreatModelManager) countAppliedMitigations(detections []ThreatDetection) int {
	mitigationSet := make(map[string]bool)
	for _, detection := range detections {
		for _, mitID := range detection.Mitigations {
			mitigationSet[mitID] = true
		}
	}
	return len(mitigationSet)
}

func (m *ThreatModelManager) calculateCoverageScore(threatCount, mitigationCount int) float64 {
	if threatCount == 0 {
		return 1.0
	}
	score := float64(mitigationCount) / float64(threatCount*2) // Assume 2 mitigations per threat is ideal
	if score > 1.0 {
		score = 1.0
	}
	return score
}

func (m *ThreatModelManager) generateRecommendations(detections []ThreatDetection) []string {
	recommendations := []string{}
	
	for _, detection := range detections {
		switch detection.TechniqueID {
		case "SAFE-T1001":
			recommendations = append(recommendations, "Implement cryptographic integrity checking for tool descriptions (SAFE-M-2)")
			recommendations = append(recommendations, "Enable AI-powered content analysis (SAFE-M-3)")
		case "SAFE-T1102":
			recommendations = append(recommendations, "Implement control/data flow separation (SAFE-M-1)")
			recommendations = append(recommendations, "Enable prompt validation and context isolation")
		case "SAFE-T1501":
			recommendations = append(recommendations, "Implement schema validation (SAFE-M-38)")
			recommendations = append(recommendations, "Enable metadata sanitization (SAFE-M-37)")
		}
	}
	
	return recommendations
}

func (m *ThreatModelManager) countBySeverity(detections []ThreatDetection, severity string) int {
	count := 0
	for _, detection := range detections {
		if detection.Severity == severity {
			count++
		}
	}
	return count
}

func (m *ThreatModelManager) determinePriority(severity string) string {
	switch severity {
	case "CRITICAL":
		return "P0"
	case "HIGH":
		return "P1"
	case "MEDIUM":
		return "P2"
	case "LOW":
		return "P3"
	default:
		return "P4"
	}
}
