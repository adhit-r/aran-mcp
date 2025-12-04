package monitoring

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

type AlertResponse struct {
	ID         string  `json:"id"`
	ServerID   *string `json:"server_id,omitempty"`
	AlertType  string  `json:"alert_type"`
	Severity   string  `json:"severity"`
	Message    string  `json:"message"`
	Details    *string `json:"details,omitempty"`
	CreatedAt  string  `json:"created_at"`
	ResolvedAt *string `json:"resolved_at,omitempty"`
}

type AlertsHandler struct {
	db *sql.DB
}

func NewAlertsHandler(db *sql.DB) *AlertsHandler {
	return &AlertsHandler{db: db}
}

func (h *AlertsHandler) GetAlerts(c *gin.Context) {
	rows, err := h.db.Query(`
		SELECT id, server_id, alert_type, severity, message, details, created_at, resolved_at
		FROM mcp_alerts
		ORDER BY created_at DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch alerts"})
		return
	}
	defer rows.Close()

	var alerts []AlertResponse
	for rows.Next() {
		var alert AlertResponse
		err := rows.Scan(&alert.ID, &alert.ServerID, &alert.AlertType, &alert.Severity, &alert.Message, &alert.Details, &alert.CreatedAt, &alert.ResolvedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan alert"})
			return
		}
		alerts = append(alerts, alert)
	}

	if err = rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error iterating alerts"})
		return
	}

	c.JSON(http.StatusOK, alerts)
}

func (h *AlertsHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/alerts", h.GetAlerts)
}
