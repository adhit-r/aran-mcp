package mcp

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/radhi1991/aran-mcp-sentinel/internal/models"
)

// ListPresets returns all predefined MCP server configurations
func (h *Handler) ListPresets(c *gin.Context) {
	presets := models.GetMCPServerPresets()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    presets,
	})
}

// GetPreset returns a specific preset by ID
func (h *Handler) GetPreset(c *gin.Context) {
	presetID := c.Param("id")

	preset := models.GetPresetByID(presetID)
	if preset == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "preset not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    preset,
	})
}

// GetPresetsByCategory returns presets filtered by category
func (h *Handler) GetPresetsByCategory(c *gin.Context) {
	category := c.Param("category")

	presets := models.GetPresetsByCategory(category)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    presets,
	})
}


