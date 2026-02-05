package webhook

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/radhi1991/aran-mcp-sentinel/internal/models"
	"go.uber.org/zap"
)

// Handler handles webhook HTTP requests
type Handler struct {
	service *Service
	logger  *zap.Logger
}

// NewHandler creates a new webhook handler
func NewHandler(service *Service, logger *zap.Logger) *Handler {
	return &Handler{
		service: service,
		logger:  logger,
	}
}

// RegisterRoutes registers webhook routes
func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	webhooks := r.Group("/webhooks")
	{
		webhooks.POST("", h.CreateWebhook)
		webhooks.GET("", h.ListWebhooks)
		webhooks.GET("/:id", h.GetWebhook)
		webhooks.PUT("/:id", h.UpdateWebhook)
		webhooks.DELETE("/:id", h.DeleteWebhook)
		webhooks.POST("/:id/test", h.TestWebhook)
		webhooks.GET("/:id/deliveries", h.GetDeliveryHistory)
	}
}

// CreateWebhook creates a new webhook
// @Summary Create webhook
// @Description Create a new webhook for event notifications
// @Tags webhooks
// @Accept json
// @Produce json
// @Param webhook body models.CreateWebhookRequest true "Webhook details"
// @Success 201 {object} models.Webhook
// @Failure 400 {object} gin.H
// @Failure 500 {object} gin.H
// @Router /webhooks [post]
func (h *Handler) CreateWebhook(c *gin.Context) {
	var req models.CreateWebhookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Get organization ID from context (set by auth middleware)
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization ID not found"})
		return
	}

	orgUUID, err := uuid.Parse(orgID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	// Get user ID from context (optional)
	var userID *uuid.UUID
	if userIDStr, exists := c.Get("user_id"); exists {
		uid, err := uuid.Parse(userIDStr.(string))
		if err == nil {
			userID = &uid
		}
	}

	webhook, err := h.service.CreateWebhook(c.Request.Context(), orgUUID, userID, &req)
	if err != nil {
		h.logger.Error("Failed to create webhook", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create webhook", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, webhook)
}

// ListWebhooks lists all webhooks for the organization
// @Summary List webhooks
// @Description Get all webhooks for the organization
// @Tags webhooks
// @Produce json
// @Success 200 {array} models.Webhook
// @Failure 500 {object} gin.H
// @Router /webhooks [get]
func (h *Handler) ListWebhooks(c *gin.Context) {
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization ID not found"})
		return
	}

	orgUUID, err := uuid.Parse(orgID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	webhooks, err := h.service.ListWebhooks(c.Request.Context(), orgUUID)
	if err != nil {
		h.logger.Error("Failed to list webhooks", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list webhooks", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, webhooks)
}

// GetWebhook retrieves a specific webhook
// @Summary Get webhook
// @Description Get webhook details by ID
// @Tags webhooks
// @Produce json
// @Param id path string true "Webhook ID"
// @Success 200 {object} models.Webhook
// @Failure 400 {object} gin.H
// @Failure 404 {object} gin.H
// @Failure 500 {object} gin.H
// @Router /webhooks/{id} [get]
func (h *Handler) GetWebhook(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid webhook ID"})
		return
	}

	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization ID not found"})
		return
	}

	orgUUID, err := uuid.Parse(orgID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	webhook, err := h.service.GetWebhook(c.Request.Context(), id, orgUUID)
	if err != nil {
		h.logger.Error("Failed to get webhook", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Webhook not found", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, webhook)
}

// UpdateWebhook updates a webhook
// @Summary Update webhook
// @Description Update webhook details
// @Tags webhooks
// @Accept json
// @Produce json
// @Param id path string true "Webhook ID"
// @Param webhook body models.UpdateWebhookRequest true "Webhook updates"
// @Success 200 {object} models.Webhook
// @Failure 400 {object} gin.H
// @Failure 404 {object} gin.H
// @Failure 500 {object} gin.H
// @Router /webhooks/{id} [put]
func (h *Handler) UpdateWebhook(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid webhook ID"})
		return
	}

	var req models.UpdateWebhookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization ID not found"})
		return
	}

	orgUUID, err := uuid.Parse(orgID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	webhook, err := h.service.UpdateWebhook(c.Request.Context(), id, orgUUID, &req)
	if err != nil {
		h.logger.Error("Failed to update webhook", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update webhook", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, webhook)
}

// DeleteWebhook deletes a webhook
// @Summary Delete webhook
// @Description Soft delete a webhook
// @Tags webhooks
// @Produce json
// @Param id path string true "Webhook ID"
// @Success 204
// @Failure 400 {object} gin.H
// @Failure 404 {object} gin.H
// @Failure 500 {object} gin.H
// @Router /webhooks/{id} [delete]
func (h *Handler) DeleteWebhook(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid webhook ID"})
		return
	}

	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization ID not found"})
		return
	}

	orgUUID, err := uuid.Parse(orgID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	if err := h.service.DeleteWebhook(c.Request.Context(), id, orgUUID); err != nil {
		h.logger.Error("Failed to delete webhook", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete webhook", "details": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// TestWebhook sends a test webhook
// @Summary Test webhook
// @Description Send a test webhook to verify configuration
// @Tags webhooks
// @Accept json
// @Produce json
// @Param id path string true "Webhook ID"
// @Param test body models.WebhookTestRequest true "Test details"
// @Success 200 {object} gin.H
// @Failure 400 {object} gin.H
// @Failure 404 {object} gin.H
// @Failure 500 {object} gin.H
// @Router /webhooks/{id}/test [post]
func (h *Handler) TestWebhook(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid webhook ID"})
		return
	}

	var req models.WebhookTestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization ID not found"})
		return
	}

	orgUUID, err := uuid.Parse(orgID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	// Get webhook to verify it exists
	webhook, err := h.service.GetWebhook(c.Request.Context(), id, orgUUID)
	if err != nil {
		h.logger.Error("Failed to get webhook", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Webhook not found", "details": err.Error()})
		return
	}

	// Create test event
	testData := req.TestData
	if testData == nil {
		testData = map[string]interface{}{
			"test": true,
			"message": "This is a test webhook",
		}
	}

	event := &models.WebhookEvent{
		ID:        uuid.New(),
		Type:      req.EventType,
		Data:      testData,
	}

	// Create delivery immediately
	if err := h.service.createDelivery(c.Request.Context(), webhook, event); err != nil {
		h.logger.Error("Failed to create test delivery", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send test webhook", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Test webhook sent successfully",
		"event_type": req.EventType,
	})
}

// GetDeliveryHistory retrieves webhook delivery history
// @Summary Get delivery history
// @Description Get webhook delivery history with pagination
// @Tags webhooks
// @Produce json
// @Param id path string true "Webhook ID"
// @Param limit query int false "Limit" default(50)
// @Param offset query int false "Offset" default(0)
// @Success 200 {array} models.WebhookDelivery
// @Failure 400 {object} gin.H
// @Failure 500 {object} gin.H
// @Router /webhooks/{id}/deliveries [get]
func (h *Handler) GetDeliveryHistory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid webhook ID"})
		return
	}

	limit := 50
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	offset := 0
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	deliveries, err := h.service.GetDeliveryHistory(c.Request.Context(), id, limit, offset)
	if err != nil {
		h.logger.Error("Failed to get delivery history", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get delivery history", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, deliveries)
}
