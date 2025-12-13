package security

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// ThreatModelHandler handles threat modeling HTTP requests
type ThreatModelHandler struct {
	logger  *zap.Logger
	manager *ThreatModelManager
}

// NewThreatModelHandler creates a new threat model handler
func NewThreatModelHandler(logger *zap.Logger, manager *ThreatModelManager) *ThreatModelHandler {
	return &ThreatModelHandler{
		logger:  logger,
		manager: manager,
	}
}

// RegisterRoutes registers the threat model routes
func (h *ThreatModelHandler) RegisterRoutes(router *gin.RouterGroup) {
	threatModel := router.Group("/threat-model")
	{
		// Tactics
		threatModel.GET("/tactics", h.GetTactics)
		threatModel.GET("/tactics/:id", h.GetTacticByID)

		// Techniques
		threatModel.GET("/techniques", h.GetTechniques)
		threatModel.GET("/techniques/:id", h.GetTechniqueByID)
		threatModel.GET("/tactics/:tacticId/techniques", h.GetTechniquesByTactic)

		// Mitigations
		threatModel.GET("/mitigations", h.GetMitigations)
		threatModel.GET("/mitigations/:id", h.GetMitigationByID)
		threatModel.GET("/techniques/:techniqueId/mitigations", h.GetMitigationsForTechnique)

		// Detection and Risk Assessment
		threatModel.POST("/detections/scan", h.ScanForThreats)
		threatModel.POST("/risk-assessment/server/:serverId", h.AssessServerRisk)
	}
}

// GetTactics returns all threat tactics
// @Summary Get all threat tactics
// @Description Returns a list of all SAFE-MCP threat tactics
// @Tags ThreatModel
// @Produce json
// @Success 200 {array} ThreatTactic
// @Router /api/v1/threat-model/tactics [get]
func (h *ThreatModelHandler) GetTactics(c *gin.Context) {
	tactics := h.manager.GetTactics(c.Request.Context())
	c.JSON(http.StatusOK, gin.H{
		"data": tactics,
		"count": len(tactics),
	})
}

// GetTacticByID returns a specific tactic
// @Summary Get tactic by ID
// @Description Returns details of a specific threat tactic
// @Tags ThreatModel
// @Produce json
// @Param id path string true "Tactic ID"
// @Success 200 {object} ThreatTactic
// @Failure 404 {object} map[string]string
// @Router /api/v1/threat-model/tactics/{id} [get]
func (h *ThreatModelHandler) GetTacticByID(c *gin.Context) {
	tacticID := c.Param("id")
	
	tactic, err := h.manager.GetTacticByID(c.Request.Context(), tacticID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"data": tactic})
}

// GetTechniques returns all threat techniques
// @Summary Get all threat techniques
// @Description Returns a list of all SAFE-MCP threat techniques
// @Tags ThreatModel
// @Produce json
// @Success 200 {array} ThreatTechnique
// @Router /api/v1/threat-model/techniques [get]
func (h *ThreatModelHandler) GetTechniques(c *gin.Context) {
	techniques := h.manager.GetTechniques(c.Request.Context())
	c.JSON(http.StatusOK, gin.H{
		"data": techniques,
		"count": len(techniques),
	})
}

// GetTechniqueByID returns a specific technique
// @Summary Get technique by ID
// @Description Returns details of a specific threat technique
// @Tags ThreatModel
// @Produce json
// @Param id path string true "Technique ID"
// @Success 200 {object} ThreatTechnique
// @Failure 404 {object} map[string]string
// @Router /api/v1/threat-model/techniques/{id} [get]
func (h *ThreatModelHandler) GetTechniqueByID(c *gin.Context) {
	techniqueID := c.Param("id")
	
	technique, err := h.manager.GetTechniqueByID(c.Request.Context(), techniqueID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"data": technique})
}

// GetTechniquesByTactic returns techniques for a specific tactic
// @Summary Get techniques by tactic
// @Description Returns all techniques associated with a specific tactic
// @Tags ThreatModel
// @Produce json
// @Param tacticId path string true "Tactic ID"
// @Success 200 {array} ThreatTechnique
// @Router /api/v1/threat-model/tactics/{tacticId}/techniques [get]
func (h *ThreatModelHandler) GetTechniquesByTactic(c *gin.Context) {
	tacticID := c.Param("tacticId")
	
	techniques := h.manager.GetTechniquesByTactic(c.Request.Context(), tacticID)
	c.JSON(http.StatusOK, gin.H{
		"data": techniques,
		"count": len(techniques),
	})
}

// GetMitigations returns all mitigations
// @Summary Get all mitigations
// @Description Returns a list of all SAFE-MCP mitigations
// @Tags ThreatModel
// @Produce json
// @Success 200 {array} ThreatMitigation
// @Router /api/v1/threat-model/mitigations [get]
func (h *ThreatModelHandler) GetMitigations(c *gin.Context) {
	mitigations := h.manager.GetMitigations(c.Request.Context())
	c.JSON(http.StatusOK, gin.H{
		"data": mitigations,
		"count": len(mitigations),
	})
}

// GetMitigationByID returns a specific mitigation
// @Summary Get mitigation by ID
// @Description Returns details of a specific mitigation
// @Tags ThreatModel
// @Produce json
// @Param id path string true "Mitigation ID"
// @Success 200 {object} ThreatMitigation
// @Failure 404 {object} map[string]string
// @Router /api/v1/threat-model/mitigations/{id} [get]
func (h *ThreatModelHandler) GetMitigationByID(c *gin.Context) {
	mitigationID := c.Param("id")
	
	mitigation, err := h.manager.GetMitigationByID(c.Request.Context(), mitigationID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"data": mitigation})
}

// GetMitigationsForTechnique returns mitigations for a specific technique
// @Summary Get mitigations for technique
// @Description Returns all mitigations that address a specific technique
// @Tags ThreatModel
// @Produce json
// @Param techniqueId path string true "Technique ID"
// @Success 200 {array} ThreatMitigation
// @Router /api/v1/threat-model/techniques/{techniqueId}/mitigations [get]
func (h *ThreatModelHandler) GetMitigationsForTechnique(c *gin.Context) {
	techniqueID := c.Param("techniqueId")
	
	mitigations := h.manager.GetMitigationsForTechnique(c.Request.Context(), techniqueID)
	c.JSON(http.StatusOK, gin.H{
		"data": mitigations,
		"count": len(mitigations),
	})
}

// ScanForThreatsRequest represents a threat scan request
type ScanForThreatsRequest struct {
	ServerID uuid.UUID              `json:"server_id" binding:"required"`
	Evidence map[string]interface{} `json:"evidence" binding:"required"`
}

// ScanForThreats performs threat detection
// @Summary Scan for threats
// @Description Performs threat detection based on provided evidence
// @Tags ThreatModel
// @Accept json
// @Produce json
// @Param request body ScanForThreatsRequest true "Scan request"
// @Success 200 {array} ThreatDetection
// @Failure 400 {object} map[string]string
// @Router /api/v1/threat-model/detections/scan [post]
func (h *ThreatModelHandler) ScanForThreats(c *gin.Context) {
	var req ScanForThreatsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	detections, err := h.manager.DetectThreats(c.Request.Context(), req.ServerID, req.Evidence)
	if err != nil {
		h.logger.Error("Failed to detect threats", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to detect threats"})
		return
	}

	// Create alerts for detected threats
	var alerts []*ThreatAlert
	for _, detection := range detections {
		alert, err := h.manager.CreateAlert(c.Request.Context(), detection)
		if err != nil {
			h.logger.Error("Failed to create alert", zap.Error(err))
			continue
		}
		alerts = append(alerts, alert)
	}

	c.JSON(http.StatusOK, gin.H{
		"detections": detections,
		"alerts":     alerts,
		"count":      len(detections),
	})
}

// AssessServerRisk performs risk assessment for a server
// @Summary Assess server risk
// @Description Performs risk assessment for a specific server
// @Tags ThreatModel
// @Produce json
// @Param serverId path string true "Server ID"
// @Success 200 {object} RiskAssessment
// @Failure 400 {object} map[string]string
// @Router /api/v1/threat-model/risk-assessment/server/{serverId} [post]
func (h *ThreatModelHandler) AssessServerRisk(c *gin.Context) {
	serverIDStr := c.Param("serverId")
	serverID, err := uuid.Parse(serverIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	// For now, return mock detections for demonstration
	// In a real implementation, this would fetch actual detections from a database
	mockDetections := []ThreatDetection{}

	assessment, err := h.manager.AssessRisk(c.Request.Context(), serverID, mockDetections)
	if err != nil {
		h.logger.Error("Failed to assess risk", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assess risk"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": assessment})
}
