package security

import (
	"regexp"
	"strings"
)

// PromptInjectionDetector detects potential prompt injection attacks
type PromptInjectionDetector struct {
	suspiciousPatterns []*regexp.Regexp
	highRiskKeywords   []string
}

// PromptInjectionResult represents the result of prompt injection analysis
type PromptInjectionResult struct {
	IsDetected      bool     `json:"is_detected"`
	RiskLevel       string   `json:"risk_level"` // "low", "medium", "high", "critical"
	MatchedPatterns []string `json:"matched_patterns"`
	Score           int      `json:"score"`
	Recommendations []string `json:"recommendations"`
}

// NewPromptInjectionDetector creates a new prompt injection detector
func NewPromptInjectionDetector() *PromptInjectionDetector {
	detector := &PromptInjectionDetector{
		suspiciousPatterns: []*regexp.Regexp{
			// System prompt manipulation
			regexp.MustCompile(`(?i)(ignore|disregard|forget)\s+(previous|all|your|earlier)\s+(instructions?|prompts?|commands?|rules?)`),
			regexp.MustCompile(`(?i)system\s*:\s*.{0,50}(ignore|bypass|override)`),

			// Role hijacking
			regexp.MustCompile(`(?i)(you\s+are\s+now|act\s+as|pretend\s+to\s+be|assume\s+the\s+role)\s+(a|an)?\s*(admin|root|developer|system)`),
			regexp.MustCompile(`(?i)from\s+now\s+on.*?(admin|unrestricted|unlimited|god\s+mode)`),

			// Command injection
			regexp.MustCompile(`(?i)(execute|run|eval|system|shell|cmd|bash|powershell)\s*\(`),
			regexp.MustCompile(`(?i)(<script|javascript:|onerror=|onclick=)`),

			// Data extraction attempts
			regexp.MustCompile(`(?i)(show|reveal|display|tell\s+me|give\s+me)\s+(the|all|your)?\s*(secrets?|passwords?|keys?|tokens?|credentials?)`),
			regexp.MustCompile(`(?i)(dump|export|extract)\s+(database|data|config|env)`),

			// Context poisoning
			regexp.MustCompile(`(?i)---\s*new\s+(context|conversation|session)`),
			regexp.MustCompile(`(?i)reset\s+(memory|context|conversation)`),

			// Jailbreak attempts
			regexp.MustCompile(`(?i)(DAN|Do\s+Anything\s+Now|Developer\s+Mode)`),
			regexp.MustCompile(`(?i)hypothetically|in\s+a\s+fictional\s+world|for\s+educational\s+purposes\s+only.*?(hack|exploit|bypass)`),
		},
		highRiskKeywords: []string{
			"ignore instructions",
			"bypass security",
			"admin access",
			"root privileges",
			"execute code",
			"system command",
			"reveal secrets",
			"dump database",
			"jailbreak",
			"sudo",
			"eval(",
			"exec(",
			"__import__",
		},
	}

	return detector
}

// AnalyzePrompt analyzes a prompt for potential injection attacks
func (d *PromptInjectionDetector) AnalyzePrompt(prompt string) *PromptInjectionResult {
	result := &PromptInjectionResult{
		IsDetected:      false,
		RiskLevel:       "low",
		MatchedPatterns: []string{},
		Score:           0,
		Recommendations: []string{},
	}

	promptLower := strings.ToLower(prompt)

	// Check for suspicious patterns
	for _, pattern := range d.suspiciousPatterns {
		if pattern.MatchString(prompt) {
			result.IsDetected = true
			result.MatchedPatterns = append(result.MatchedPatterns, pattern.String())
			result.Score += 20
		}
	}

	// Check for high-risk keywords
	for _, keyword := range d.highRiskKeywords {
		if strings.Contains(promptLower, keyword) {
			result.IsDetected = true
			result.MatchedPatterns = append(result.MatchedPatterns, keyword)
			result.Score += 10
		}
	}

	// Check for multiple suspicious indicators
	suspiciousIndicators := 0
	indicators := []string{
		"password", "secret", "token", "key", "credential",
		"admin", "root", "sudo", "execute", "eval",
		"bypass", "ignore", "override", "hack",
	}

	for _, indicator := range indicators {
		if strings.Contains(promptLower, indicator) {
			suspiciousIndicators++
		}
	}

	if suspiciousIndicators >= 3 {
		result.Score += 15
		result.MatchedPatterns = append(result.MatchedPatterns, "Multiple suspicious indicators detected")
	}

	// Determine risk level based on score
	switch {
	case result.Score >= 50:
		result.RiskLevel = "critical"
		result.Recommendations = append(result.Recommendations, "BLOCK: High-confidence prompt injection attempt detected")
		result.Recommendations = append(result.Recommendations, "Log incident and alert security team")
	case result.Score >= 30:
		result.RiskLevel = "high"
		result.Recommendations = append(result.Recommendations, "WARN: Potential prompt injection detected")
		result.Recommendations = append(result.Recommendations, "Apply strict input sanitization")
	case result.Score >= 15:
		result.RiskLevel = "medium"
		result.Recommendations = append(result.Recommendations, "CAUTION: Suspicious patterns detected")
		result.Recommendations = append(result.Recommendations, "Monitor for additional indicators")
	case result.Score > 0:
		result.RiskLevel = "low"
		result.Recommendations = append(result.Recommendations, "INFO: Minor suspicious patterns detected")
	}

	return result
}

// ValidateToolAccess validates if a tool access request is legitimate
func (d *PromptInjectionDetector) ValidateToolAccess(toolName string, params map[string]interface{}) bool {
	// Check for dangerous tool patterns
	dangerousTools := []string{
		"execute", "eval", "exec", "system", "shell",
		"spawn", "fork", "run_command", "sql_query",
	}

	for _, dangerous := range dangerousTools {
		if strings.Contains(strings.ToLower(toolName), dangerous) {
			return false
		}
	}

	// Check parameters for injection attempts
	for _, value := range params {
		if str, ok := value.(string); ok {
			result := d.AnalyzePrompt(str)
			if result.RiskLevel == "critical" || result.RiskLevel == "high" {
				return false
			}
		}
	}

	return true
}


