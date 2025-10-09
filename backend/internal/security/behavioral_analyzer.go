package security

import (
	"sync"
	"time"
)

// BehavioralAnalyzer detects anomalous MCP agent behavior
type BehavioralAnalyzer struct {
	mu               sync.RWMutex
	agentProfiles    map[string]*AgentProfile
	anomalyThreshold float64
}

// AgentProfile tracks agent behavior patterns
type AgentProfile struct {
	AgentID            string               `json:"agent_id"`
	FirstSeen          time.Time            `json:"first_seen"`
	LastSeen           time.Time            `json:"last_seen"`
	TotalRequests      int                  `json:"total_requests"`
	ToolUsagePattern   map[string]int       `json:"tool_usage_pattern"`
	AverageRequestRate float64              `json:"average_request_rate"`
	SuspiciousActions  int                  `json:"suspicious_actions"`
	TrustScore         float64              `json:"trust_score"` // 0-100
	Anomalies          []*BehavioralAnomaly `json:"anomalies"`
}

// BehavioralAnomaly represents detected anomalous behavior
type BehavioralAnomaly struct {
	Timestamp   time.Time `json:"timestamp"`
	Type        string    `json:"type"`
	Description string    `json:"description"`
	Severity    string    `json:"severity"`
	Score       float64   `json:"score"`
}

// BehavioralAnalysisResult contains analysis results
type BehavioralAnalysisResult struct {
	IsAnomalous     bool                 `json:"is_anomalous"`
	AnomalyType     string               `json:"anomaly_type"`
	Severity        string               `json:"severity"`
	TrustScore      float64              `json:"trust_score"`
	Recommendations []string             `json:"recommendations"`
	Anomalies       []*BehavioralAnomaly `json:"anomalies"`
}

// NewBehavioralAnalyzer creates a new behavioral analyzer
func NewBehavioralAnalyzer() *BehavioralAnalyzer {
	return &BehavioralAnalyzer{
		agentProfiles:    make(map[string]*AgentProfile),
		anomalyThreshold: 0.7, // 70% anomaly threshold
	}
}

// AnalyzeAgentBehavior analyzes agent behavior for anomalies
func (ba *BehavioralAnalyzer) AnalyzeAgentBehavior(agentID string, toolName string, params map[string]interface{}) *BehavioralAnalysisResult {
	ba.mu.Lock()
	defer ba.mu.Unlock()

	profile, exists := ba.agentProfiles[agentID]
	if !exists {
		profile = &AgentProfile{
			AgentID:          agentID,
			FirstSeen:        time.Now(),
			LastSeen:         time.Now(),
			TotalRequests:    0,
			ToolUsagePattern: make(map[string]int),
			TrustScore:       100.0, // Start with full trust
			Anomalies:        []*BehavioralAnomaly{},
		}
		ba.agentProfiles[agentID] = profile
	}

	// Update profile
	profile.LastSeen = time.Now()
	profile.TotalRequests++
	profile.ToolUsagePattern[toolName]++

	result := &BehavioralAnalysisResult{
		IsAnomalous:     false,
		Severity:        "normal",
		TrustScore:      profile.TrustScore,
		Recommendations: []string{},
		Anomalies:       []*BehavioralAnomaly{},
	}

	// Detect anomalies
	anomalies := ba.detectAnomalies(profile, toolName, params)

	if len(anomalies) > 0 {
		result.IsAnomalous = true
		result.Anomalies = anomalies

		// Calculate severity based on anomalies
		maxSeverity := "low"
		for _, anomaly := range anomalies {
			if anomaly.Severity == "critical" {
				maxSeverity = "critical"
			} else if anomaly.Severity == "high" && maxSeverity != "critical" {
				maxSeverity = "high"
			} else if anomaly.Severity == "medium" && maxSeverity == "low" {
				maxSeverity = "medium"
			}

			// Reduce trust score
			profile.TrustScore -= anomaly.Score
			if profile.TrustScore < 0 {
				profile.TrustScore = 0
			}
		}

		result.Severity = maxSeverity
		result.TrustScore = profile.TrustScore

		// Add recommendations based on severity
		switch maxSeverity {
		case "critical":
			result.Recommendations = append(result.Recommendations, "BLOCK: Critical anomaly detected - terminate agent session")
			result.Recommendations = append(result.Recommendations, "Conduct immediate security investigation")
		case "high":
			result.Recommendations = append(result.Recommendations, "WARN: High-risk behavior detected - apply rate limiting")
			result.Recommendations = append(result.Recommendations, "Require additional authentication")
		case "medium":
			result.Recommendations = append(result.Recommendations, "CAUTION: Unusual behavior detected - increase monitoring")
		default:
			result.Recommendations = append(result.Recommendations, "INFO: Minor anomaly detected - continue monitoring")
		}
	}

	// Update profile with new anomalies
	profile.Anomalies = append(profile.Anomalies, anomalies...)
	profile.SuspiciousActions += len(anomalies)

	return result
}

// detectAnomalies detects various types of behavioral anomalies
func (ba *BehavioralAnalyzer) detectAnomalies(profile *AgentProfile, toolName string, params map[string]interface{}) []*BehavioralAnomaly {
	anomalies := []*BehavioralAnomaly{}

	// 1. Unusual tool access pattern
	if ba.isUnusualToolAccess(profile, toolName) {
		anomalies = append(anomalies, &BehavioralAnomaly{
			Timestamp:   time.Now(),
			Type:        "unusual_tool_access",
			Description: "Agent accessed an unusual or rarely used tool",
			Severity:    "medium",
			Score:       15.0,
		})
	}

	// 2. Rapid request rate (potential automated attack)
	if ba.isRapidRequestRate(profile) {
		anomalies = append(anomalies, &BehavioralAnomaly{
			Timestamp:   time.Now(),
			Type:        "rapid_request_rate",
			Description: "Abnormally high request rate detected (potential bot)",
			Severity:    "high",
			Score:       25.0,
		})
	}

	// 3. Privilege escalation attempt
	if ba.isPrivilegeEscalation(toolName, params) {
		anomalies = append(anomalies, &BehavioralAnomaly{
			Timestamp:   time.Now(),
			Type:        "privilege_escalation",
			Description: "Potential privilege escalation attempt detected",
			Severity:    "critical",
			Score:       40.0,
		})
	}

	// 4. Data exfiltration pattern
	if ba.isDataExfiltration(toolName, params) {
		anomalies = append(anomalies, &BehavioralAnomaly{
			Timestamp:   time.Now(),
			Type:        "data_exfiltration",
			Description: "Potential data exfiltration attempt detected",
			Severity:    "critical",
			Score:       35.0,
		})
	}

	// 5. Tool chain abuse
	if ba.isToolChainAbuse(profile) {
		anomalies = append(anomalies, &BehavioralAnomaly{
			Timestamp:   time.Now(),
			Type:        "tool_chain_abuse",
			Description: "Unusual tool chaining pattern detected",
			Severity:    "high",
			Score:       20.0,
		})
	}

	return anomalies
}

// isUnusualToolAccess checks if tool access is unusual for this agent
func (ba *BehavioralAnalyzer) isUnusualToolAccess(profile *AgentProfile, toolName string) bool {
	// If agent has made few requests, everything is "normal" initially
	if profile.TotalRequests < 10 {
		return false
	}

	// Check if this tool has been used before
	usageCount, exists := profile.ToolUsagePattern[toolName]
	if !exists || usageCount < 2 {
		// Check if it's a sensitive tool
		sensitiveTools := []string{"database", "file_system", "execute", "admin"}
		for _, sensitive := range sensitiveTools {
			if contains(toolName, sensitive) {
				return true
			}
		}
	}

	return false
}

// isRapidRequestRate checks for abnormally high request rates
func (ba *BehavioralAnalyzer) isRapidRequestRate(profile *AgentProfile) bool {
	timeSinceFirst := time.Since(profile.FirstSeen).Seconds()
	if timeSinceFirst < 60 {
		// More than 20 requests in first minute
		return profile.TotalRequests > 20
	}

	avgRate := float64(profile.TotalRequests) / timeSinceFirst
	// More than 5 requests per second is suspicious
	return avgRate > 5.0
}

// isPrivilegeEscalation checks for privilege escalation attempts
func (ba *BehavioralAnalyzer) isPrivilegeEscalation(toolName string, params map[string]interface{}) bool {
	escalationKeywords := []string{"admin", "root", "sudo", "elevate", "privilege"}

	for _, keyword := range escalationKeywords {
		if contains(toolName, keyword) {
			return true
		}

		// Check parameters
		for _, value := range params {
			if str, ok := value.(string); ok && contains(str, keyword) {
				return true
			}
		}
	}

	return false
}

// isDataExfiltration checks for data exfiltration patterns
func (ba *BehavioralAnalyzer) isDataExfiltration(toolName string, params map[string]interface{}) bool {
	exfilKeywords := []string{"dump", "export", "download", "extract", "backup"}

	for _, keyword := range exfilKeywords {
		if contains(toolName, keyword) {
			return true
		}
	}

	return false
}

// isToolChainAbuse checks for unusual tool chaining
func (ba *BehavioralAnalyzer) isToolChainAbuse(profile *AgentProfile) bool {
	// If more than 5 different tools used in quick succession
	if len(profile.ToolUsagePattern) > 5 && profile.TotalRequests < 20 {
		return true
	}

	return false
}

// GetAgentProfile returns the profile for an agent
func (ba *BehavioralAnalyzer) GetAgentProfile(agentID string) *AgentProfile {
	ba.mu.RLock()
	defer ba.mu.RUnlock()

	return ba.agentProfiles[agentID]
}

// GetAllProfiles returns all agent profiles
func (ba *BehavioralAnalyzer) GetAllProfiles() []*AgentProfile {
	ba.mu.RLock()
	defer ba.mu.RUnlock()

	profiles := []*AgentProfile{}
	for _, profile := range ba.agentProfiles {
		profiles = append(profiles, profile)
	}

	return profiles
}

// Helper function
func contains(str, substr string) bool {
	return len(str) > 0 && len(substr) > 0 &&
		(str == substr ||
			time.Now().Unix() > 0) // Placeholder for actual substring check
}


