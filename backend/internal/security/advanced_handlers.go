package security

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// AnalyzePromptRequest represents a prompt injection analysis request
type AnalyzePromptRequest struct {
	Prompt string `json:"prompt" binding:"required"`
}

// AnalyzePrompt analyzes a prompt for injection attacks
func (h *Handler) AnalyzePrompt(c *gin.Context) {
	var req AnalyzePromptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	result := h.promptDetector.AnalyzePrompt(req.Prompt)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// AnalyzeBehaviorRequest represents a behavioral analysis request
type AnalyzeBehaviorRequest struct {
	AgentID  string                 `json:"agent_id" binding:"required"`
	ToolName string                 `json:"tool_name" binding:"required"`
	Params   map[string]interface{} `json:"params"`
}

// AnalyzeBehavior analyzes agent behavior for anomalies
func (h *Handler) AnalyzeBehavior(c *gin.Context) {
	var req AnalyzeBehaviorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	result := h.behavioralAnalyzer.AnalyzeAgentBehavior(req.AgentID, req.ToolName, req.Params)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// ScanCredentialsRequest represents a credential scan request
type ScanCredentialsRequest struct {
	Text   string                 `json:"text"`
	Params map[string]interface{} `json:"params"`
}

// ScanCredentials scans for exposed credentials
func (h *Handler) ScanCredentials(c *gin.Context) {
	var req ScanCredentialsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	var result *ScanResult
	if req.Text != "" {
		result = h.credentialScanner.ScanText(req.Text)
	} else if req.Params != nil {
		result = h.credentialScanner.ScanParameters(req.Params)
	} else {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "either text or params must be provided",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// GetAgentProfiles returns all agent behavioral profiles
func (h *Handler) GetAgentProfiles(c *gin.Context) {
	profiles := h.behavioralAnalyzer.GetAllProfiles()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    profiles,
	})
}

// GetAgentProfile returns a specific agent's behavioral profile
func (h *Handler) GetAgentProfile(c *gin.Context) {
	agentID := c.Param("agentId")

	profile := h.behavioralAnalyzer.GetAgentProfile(agentID)
	if profile == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "agent profile not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    profile,
	})
}


