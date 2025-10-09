package security

import (
	"regexp"
	"strings"
)

// CredentialScanner detects exposed credentials and secrets
type CredentialScanner struct {
	patterns map[string]*regexp.Regexp
}

// CredentialExposure represents detected credential exposure
type CredentialExposure struct {
	Type        string   `json:"type"`
	Severity    string   `json:"severity"`
	Location    string   `json:"location"`
	Masked      string   `json:"masked"`
	Suggestions []string `json:"suggestions"`
}

// ScanResult contains all detected exposures
type ScanResult struct {
	HasExposures bool                  `json:"has_exposures"`
	Exposures    []*CredentialExposure `json:"exposures"`
	RiskScore    int                   `json:"risk_score"`
}

// NewCredentialScanner creates a new credential scanner
func NewCredentialScanner() *CredentialScanner {
	return &CredentialScanner{
		patterns: map[string]*regexp.Regexp{
			// API Keys
			"aws_access_key": regexp.MustCompile(`(?i)(AKIA[0-9A-Z]{16})`),
			"aws_secret_key": regexp.MustCompile(`(?i)([0-9a-zA-Z/+]{40})`),
			"github_token":   regexp.MustCompile(`(?i)(ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|ghr_[a-zA-Z0-9]{36})`),
			"slack_token":    regexp.MustCompile(`(?i)(xox[pborsa]-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24,32})`),
			"stripe_key":     regexp.MustCompile(`(?i)(sk_live_[0-9a-zA-Z]{24,99}|pk_live_[0-9a-zA-Z]{24,99})`),
			"openai_key":     regexp.MustCompile(`(?i)(sk-[a-zA-Z0-9]{48})`),
			"anthropic_key":  regexp.MustCompile(`(?i)(sk-ant-[a-zA-Z0-9-]{95})`),

			// Database Credentials
			"database_url":      regexp.MustCompile(`(?i)(postgres|mysql|mongodb|redis)://[^:]+:[^@]+@[^/]+`),
			"connection_string": regexp.MustCompile(`(?i)(server|host)=.+;(user|uid)=.+;(password|pwd)=.+`),

			// Generic Secrets
			"private_key": regexp.MustCompile(`(?i)-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----`),
			"jwt_token":   regexp.MustCompile(`(?i)eyJ[a-zA-Z0-9_-]{5,}\.eyJ[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,}`),

			// Password patterns
			"password_in_url": regexp.MustCompile(`(?i)://[^:]+:([^@]+)@`),
			"basic_auth":      regexp.MustCompile(`(?i)authorization:\s*basic\s+([a-zA-Z0-9+/=]+)`),

			// Cloud Provider Keys
			"azure_key":  regexp.MustCompile(`(?i)[0-9a-zA-Z]{88}==`),
			"google_api": regexp.MustCompile(`(?i)AIza[0-9A-Za-z\\-_]{35}`),
			"heroku_key": regexp.MustCompile(`(?i)[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}`),
		},
	}
}

// ScanText scans text for exposed credentials
func (cs *CredentialScanner) ScanText(text string) *ScanResult {
	result := &ScanResult{
		HasExposures: false,
		Exposures:    []*CredentialExposure{},
		RiskScore:    0,
	}

	// Check each pattern
	for credType, pattern := range cs.patterns {
		matches := pattern.FindAllString(text, -1)
		for _, match := range matches {
			exposure := &CredentialExposure{
				Type:     credType,
				Location: "request_body",
				Masked:   maskSecret(match),
				Suggestions: []string{
					"Use environment variables for secrets",
					"Implement secret management system (HashiCorp Vault, AWS Secrets Manager)",
					"Rotate exposed credentials immediately",
				},
			}

			// Determine severity
			switch {
			case strings.Contains(credType, "private_key"):
				exposure.Severity = "critical"
				result.RiskScore += 50
			case strings.Contains(credType, "aws") || strings.Contains(credType, "database"):
				exposure.Severity = "critical"
				result.RiskScore += 45
			case strings.Contains(credType, "api") || strings.Contains(credType, "token"):
				exposure.Severity = "high"
				result.RiskScore += 35
			case strings.Contains(credType, "password"):
				exposure.Severity = "high"
				result.RiskScore += 30
			default:
				exposure.Severity = "medium"
				result.RiskScore += 20
			}

			result.Exposures = append(result.Exposures, exposure)
			result.HasExposures = true
		}
	}

	// Check for common password keywords
	passwordKeywords := []string{
		"password", "passwd", "pwd", "secret", "api_key",
		"apikey", "access_token", "auth_token", "private_key",
	}

	for _, keyword := range passwordKeywords {
		// Look for assignment patterns: keyword = "value" or keyword: "value"
		keywordPattern := regexp.MustCompile(`(?i)` + keyword + `\s*[:=]\s*["']?([^"'\s]+)["']?`)
		matches := keywordPattern.FindAllStringSubmatch(text, -1)

		for _, match := range matches {
			if len(match) > 1 && len(match[1]) > 0 {
				exposure := &CredentialExposure{
					Type:     "potential_secret",
					Location: "configuration",
					Masked:   keyword + "=***",
					Severity: "medium",
					Suggestions: []string{
						"Avoid hardcoding secrets in configuration",
						"Use secret management tools",
					},
				}
				result.Exposures = append(result.Exposures, exposure)
				result.HasExposures = true
				result.RiskScore += 15
			}
		}
	}

	return result
}

// ScanParameters scans MCP tool parameters for exposed credentials
func (cs *CredentialScanner) ScanParameters(params map[string]interface{}) *ScanResult {
	text := ""

	// Convert all parameters to text for scanning
	for key, value := range params {
		text += key + "=" + toString(value) + " "
	}

	return cs.ScanText(text)
}

// maskSecret masks a secret for safe display
func maskSecret(secret string) string {
	if len(secret) <= 8 {
		return "***"
	}

	// Show first 4 and last 4 characters
	return secret[:4] + "..." + secret[len(secret)-4:]
}

// toString converts interface to string
func toString(v interface{}) string {
	if v == nil {
		return ""
	}

	switch val := v.(type) {
	case string:
		return val
	case int, int64, float64, bool:
		return ""
	default:
		return ""
	}
}


