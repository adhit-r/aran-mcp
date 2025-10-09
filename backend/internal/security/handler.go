package security

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// Handler handles security testing endpoints
type Handler struct {
	logger             *zap.Logger
	securityTester     *SecurityTester
	owaspManager       *OWASPMCPTop10Manager
	promptDetector     *PromptInjectionDetector
	behavioralAnalyzer *BehavioralAnalyzer
	credentialScanner  *CredentialScanner
}

// NewHandler creates a new security handler
func NewHandler(logger *zap.Logger) *Handler {
	return &Handler{
		logger:             logger,
		securityTester:     NewSecurityTester(logger),
		owaspManager:       NewOWASPMCPTop10Manager(logger),
		promptDetector:     NewPromptInjectionDetector(),
		behavioralAnalyzer: NewBehavioralAnalyzer(),
		credentialScanner:  NewCredentialScanner(),
	}
}

// RegisterRoutes registers security testing routes
func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	security := r.Group("/security")
	{
		security.GET("/tests", h.ListTestTypes)
		security.POST("/tests/run", h.RunSecurityTest)
		security.GET("/tests/:id", h.GetTestResult)
		security.GET("/tests/server/:serverId", h.GetServerTests)

		// OWASP MCP Top 10 endpoints
		security.GET("/owasp/categories", h.GetOWASPMCPCategories)
		security.GET("/owasp/tests", h.GetOWASPMCPTests)
		security.POST("/owasp/tests/run", h.RunOWASPMCPTest)
		security.POST("/owasp/tests/run-all", h.RunAllOWASPMCPTests)
		security.GET("/owasp/results/:serverId", h.GetOWASPMCPResults)

		// 2025 Security Innovation Features
		security.POST("/analyze/prompt", h.AnalyzePrompt)
		security.POST("/analyze/behavior", h.AnalyzeBehavior)
		security.POST("/scan/credentials", h.ScanCredentials)
		security.GET("/agent/profiles", h.GetAgentProfiles)
		security.GET("/agent/profile/:agentId", h.GetAgentProfile)
	}
}

// ListTestTypes lists available security test types
func (h *Handler) ListTestTypes(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    TestTypes,
	})
}

// RunSecurityTestRequest represents a request to run a security test
type RunSecurityTestRequest struct {
	ServerID  string `json:"server_id" binding:"required"`
	TestType  string `json:"test_type" binding:"required"`
	ServerURL string `json:"server_url" binding:"required"`
}

// RunSecurityTest runs a security test against an MCP server
func (h *Handler) RunSecurityTest(c *gin.Context) {
	var req RunSecurityTestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"details": err.Error(),
		})
		return
	}

	// Validate test type
	if _, exists := TestTypes[req.TestType]; !exists {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":           "Invalid test type",
			"available_types": TestTypes,
		})
		return
	}

	// Run the security test
	test, err := h.securityTester.RunSecurityTest(c.Request.Context(), req.ServerURL, req.TestType)
	if err != nil {
		h.logger.Error("Failed to run security test", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to run security test",
		})
		return
	}

	// Set server ID
	serverID, err := uuid.Parse(req.ServerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid server ID",
		})
		return
	}
	test.ServerID = serverID

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    test,
	})
}

// GetTestResult gets the result of a specific security test
func (h *Handler) GetTestResult(c *gin.Context) {
	testID := c.Param("id")

	// Parse test ID
	_, err := uuid.Parse(testID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid test ID",
		})
		return
	}

	// In a real implementation, you would fetch this from the database
	// For now, return a mock response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"id":           testID,
			"test_type":    "injection",
			"status":       "completed",
			"result":       "pass",
			"details":      "No injection vulnerabilities detected",
			"severity":     "high",
			"created_at":   "2025-09-21T11:00:00Z",
			"completed_at": "2025-09-21T11:01:00Z",
		},
	})
}

// GetServerTests gets all security tests for a specific server
func (h *Handler) GetServerTests(c *gin.Context) {
	serverID := c.Param("serverId")

	// Parse server ID
	_, err := uuid.Parse(serverID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid server ID",
		})
		return
	}

	// Parse pagination parameters
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	// In a real implementation, you would fetch this from the database
	// For now, return a mock response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": []gin.H{
			{
				"id":           uuid.New().String(),
				"server_id":    serverID,
				"test_type":    "injection",
				"status":       "completed",
				"result":       "pass",
				"details":      "No injection vulnerabilities detected",
				"severity":     "high",
				"created_at":   "2025-09-21T11:00:00Z",
				"completed_at": "2025-09-21T11:01:00Z",
			},
			{
				"id":           uuid.New().String(),
				"server_id":    serverID,
				"test_type":    "authentication",
				"status":       "completed",
				"result":       "fail",
				"details":      "Authentication bypass detected",
				"severity":     "critical",
				"created_at":   "2025-09-21T11:02:00Z",
				"completed_at": "2025-09-21T11:03:00Z",
			},
		},
		"pagination": gin.H{
			"limit":  limit,
			"offset": offset,
			"count":  2,
		},
	})
}

// OWASP MCP Top 10 Handler Methods

// GetOWASPMCPCategories returns the OWASP MCP Top 10 categories
func (h *Handler) GetOWASPMCPCategories(c *gin.Context) {
	categories := h.owaspManager.GetOWASPMCPTop10Categories()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    categories,
	})
}

// GetOWASPMCPTests returns available OWASP MCP Top 10 tests
func (h *Handler) GetOWASPMCPTests(c *gin.Context) {
	tests := h.owaspManager.GetAvailableTests()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    tests,
	})
}

// RunOWASPMCPTestRequest represents a request to run an OWASP MCP Top 10 test
type RunOWASPMCPTestRequest struct {
	TestID   string `json:"test_id" binding:"required"`
	ServerID string `json:"server_id" binding:"required"`
}

// RunOWASPMCPTest runs a specific OWASP MCP Top 10 test
func (h *Handler) RunOWASPMCPTest(c *gin.Context) {
	var req RunOWASPMCPTestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"details": err.Error(),
		})
		return
	}

	result, err := h.owaspManager.RunSecurityTest(c.Request.Context(), req.TestID, req.ServerID)
	if err != nil {
		h.logger.Error("Failed to run OWASP MCP Top 10 test", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to run security test",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// RunAllOWASPMCPTestsRequest represents a request to run all OWASP MCP Top 10 tests
type RunAllOWASPMCPTestsRequest struct {
	ServerID string `json:"server_id" binding:"required"`
}

// RunAllOWASPMCPTests runs all OWASP MCP Top 10 tests for a server
func (h *Handler) RunAllOWASPMCPTests(c *gin.Context) {
	var req RunAllOWASPMCPTestsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"details": err.Error(),
		})
		return
	}

	results, err := h.owaspManager.RunAllTests(c.Request.Context(), req.ServerID)
	if err != nil {
		h.logger.Error("Failed to run all OWASP MCP Top 10 tests", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to run security tests",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    results,
	})
}

// GetOWASPMCPResults gets OWASP MCP Top 10 test results for a server
func (h *Handler) GetOWASPMCPResults(c *gin.Context) {
	serverID := c.Param("serverId")

	// Parse server ID
	_, err := uuid.Parse(serverID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid server ID",
		})
		return
	}

	// In a real implementation, you would fetch this from the database
	// For now, return a mock response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": []gin.H{
			{
				"id":         uuid.New().String(),
				"test_id":    "test_a01_001",
				"server_id":  serverID,
				"status":     "PASS",
				"score":      85,
				"category":   "Access Control",
				"created_at": "2025-09-21T11:00:00Z",
			},
			{
				"id":         uuid.New().String(),
				"test_id":    "test_a02_001",
				"server_id":  serverID,
				"status":     "WARN",
				"score":      70,
				"category":   "Cryptography",
				"created_at": "2025-09-21T11:01:00Z",
			},
			{
				"id":         uuid.New().String(),
				"test_id":    "test_a05_001",
				"server_id":  serverID,
				"status":     "FAIL",
				"score":      45,
				"category":   "Configuration",
				"created_at": "2025-09-21T11:02:00Z",
			},
		},
	})
}
