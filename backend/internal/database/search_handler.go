package database

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// SearchHandler handles search-related HTTP endpoints
type SearchHandler struct {
	repo   *Repository
	logger *zap.Logger
}

// NewSearchHandler creates a new search handler
func NewSearchHandler(repo *Repository, logger *zap.Logger) *SearchHandler {
	return &SearchHandler{
		repo:   repo,
		logger: logger,
	}
}

// SearchRequest represents the request body for search
type SearchRequest struct {
	Query     string   `json:"query"`
	Status    []string `json:"status"`
	Type      []string `json:"type"`
	Tags      []string `json:"tags"`
	DateFrom  string   `json:"date_from"`
	DateTo    string   `json:"date_to"`
	SortBy    string   `json:"sort_by"`
	SortOrder string   `json:"sort_order"`
	Limit     int      `json:"limit"`
	Offset    int      `json:"offset"`
	Page      int      `json:"page"`
}

// Search handles POST /api/v1/servers/search
// @Summary Search MCP servers
// @Description Search and filter MCP servers with full-text search, status, type, tags, and date range filters
// @Tags servers
// @Accept json
// @Produce json
// @Param request body SearchRequest true "Search parameters"
// @Success 200 {object} SearchResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/servers/search [post]
func (h *SearchHandler) Search(c *gin.Context) {
	var req SearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Get organization ID from context (set by auth middleware)
	orgIDStr, exists := c.Get("organization_id")
	if !exists {
		// Default org for development
		orgIDStr = "00000000-0000-0000-0000-000000000000"
	}

	orgID, err := uuid.Parse(orgIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	// Build filters
	filters := &SearchFilters{
		Query:     req.Query,
		Status:    req.Status,
		Type:      req.Type,
		Tags:      req.Tags,
		SortBy:    req.SortBy,
		SortOrder: req.SortOrder,
		Limit:     req.Limit,
		Offset:    req.Offset,
	}

	// Handle page-based pagination
	if req.Page > 0 && req.Limit > 0 {
		filters.Offset = (req.Page - 1) * req.Limit
	}

	// Parse date filters
	if req.DateFrom != "" {
		if t, err := time.Parse(time.RFC3339, req.DateFrom); err == nil {
			filters.DateFrom = &t
		} else if t, err := time.Parse("2006-01-02", req.DateFrom); err == nil {
			filters.DateFrom = &t
		}
	}
	if req.DateTo != "" {
		if t, err := time.Parse(time.RFC3339, req.DateTo); err == nil {
			filters.DateTo = &t
		} else if t, err := time.Parse("2006-01-02", req.DateTo); err == nil {
			// Set to end of day
			t = t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			filters.DateTo = &t
		}
	}

	// Execute search
	result, err := h.repo.SearchMCPServers(c.Request.Context(), orgID, filters)
	if err != nil {
		h.logger.Error("Search failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// SearchGet handles GET /api/v1/servers/search with query parameters
// @Summary Search MCP servers (GET)
// @Description Search and filter MCP servers using query parameters
// @Tags servers
// @Produce json
// @Param q query string false "Search query"
// @Param status query []string false "Filter by status"
// @Param type query []string false "Filter by type"
// @Param tags query []string false "Filter by tags"
// @Param date_from query string false "Filter by start date (RFC3339 or YYYY-MM-DD)"
// @Param date_to query string false "Filter by end date (RFC3339 or YYYY-MM-DD)"
// @Param sort_by query string false "Sort by field (name, created_at, updated_at, status)"
// @Param sort_order query string false "Sort order (asc, desc)"
// @Param limit query int false "Results per page (default 20, max 100)"
// @Param offset query int false "Offset for pagination"
// @Param page query int false "Page number (alternative to offset)"
// @Success 200 {object} SearchResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/servers/search [get]
func (h *SearchHandler) SearchGet(c *gin.Context) {
	// Get organization ID from context
	orgIDStr, exists := c.Get("organization_id")
	if !exists {
		orgIDStr = "00000000-0000-0000-0000-000000000000"
	}

	orgID, err := uuid.Parse(orgIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	// Build filters from query params
	filters := &SearchFilters{
		Query:     c.Query("q"),
		SortBy:    c.Query("sort_by"),
		SortOrder: c.Query("sort_order"),
	}

	// Parse array parameters
	if status := c.Query("status"); status != "" {
		filters.Status = strings.Split(status, ",")
	}
	if typeParam := c.Query("type"); typeParam != "" {
		filters.Type = strings.Split(typeParam, ",")
	}
	if tags := c.Query("tags"); tags != "" {
		filters.Tags = strings.Split(tags, ",")
	}

	// Parse numeric parameters
	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil {
			filters.Limit = l
		}
	}
	if offset := c.Query("offset"); offset != "" {
		if o, err := strconv.Atoi(offset); err == nil {
			filters.Offset = o
		}
	}
	if page := c.Query("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil && filters.Limit > 0 {
			filters.Offset = (p - 1) * filters.Limit
		}
	}

	// Parse date parameters
	if dateFrom := c.Query("date_from"); dateFrom != "" {
		if t, err := time.Parse(time.RFC3339, dateFrom); err == nil {
			filters.DateFrom = &t
		} else if t, err := time.Parse("2006-01-02", dateFrom); err == nil {
			filters.DateFrom = &t
		}
	}
	if dateTo := c.Query("date_to"); dateTo != "" {
		if t, err := time.Parse(time.RFC3339, dateTo); err == nil {
			filters.DateTo = &t
		} else if t, err := time.Parse("2006-01-02", dateTo); err == nil {
			t = t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			filters.DateTo = &t
		}
	}

	// Execute search
	result, err := h.repo.SearchMCPServers(c.Request.Context(), orgID, filters)
	if err != nil {
		h.logger.Error("Search failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// FilterByStatus handles GET /api/v1/servers/filter/status/:status
// @Summary Get servers by status
// @Description Get servers filtered by one or more statuses
// @Tags servers
// @Produce json
// @Param status path string true "Status to filter by (online, offline, error, unknown)"
// @Success 200 {array} MCPServer
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/servers/filter/status/{status} [get]
func (h *SearchHandler) FilterByStatus(c *gin.Context) {
	orgIDStr, exists := c.Get("organization_id")
	if !exists {
		orgIDStr = "00000000-0000-0000-0000-000000000000"
	}

	orgID, err := uuid.Parse(orgIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	status := c.Param("status")
	statuses := strings.Split(status, ",")

	servers, err := h.repo.GetServersByStatus(c.Request.Context(), orgID, statuses)
	if err != nil {
		h.logger.Error("Failed to filter by status", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to filter servers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"servers": servers,
		"count":   len(servers),
		"filter":  statuses,
	})
}

// FilterByType handles GET /api/v1/servers/filter/type/:type
// @Summary Get servers by type
// @Description Get servers filtered by one or more types
// @Tags servers
// @Produce json
// @Param type path string true "Type to filter by (filesystem, database, api, custom)"
// @Success 200 {array} MCPServer
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/servers/filter/type/{type} [get]
func (h *SearchHandler) FilterByType(c *gin.Context) {
	orgIDStr, exists := c.Get("organization_id")
	if !exists {
		orgIDStr = "00000000-0000-0000-0000-000000000000"
	}

	orgID, err := uuid.Parse(orgIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	typeParam := c.Param("type")
	types := strings.Split(typeParam, ",")

	servers, err := h.repo.GetServersByType(c.Request.Context(), orgID, types)
	if err != nil {
		h.logger.Error("Failed to filter by type", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to filter servers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"servers": servers,
		"count":   len(servers),
		"filter":  types,
	})
}

// GetRecent handles GET /api/v1/servers/recent
// @Summary Get recently modified servers
// @Description Get servers that were created or updated within the specified time period
// @Tags servers
// @Produce json
// @Param since query string false "Time period (1h, 24h, 7d, 30d) or RFC3339 timestamp"
// @Success 200 {array} MCPServer
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/servers/recent [get]
func (h *SearchHandler) GetRecent(c *gin.Context) {
	orgIDStr, exists := c.Get("organization_id")
	if !exists {
		orgIDStr = "00000000-0000-0000-0000-000000000000"
	}

	orgID, err := uuid.Parse(orgIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	// Parse 'since' parameter
	sinceParam := c.DefaultQuery("since", "24h")
	var since time.Time

	// Try parsing as duration shorthand
	switch sinceParam {
	case "1h":
		since = time.Now().Add(-1 * time.Hour)
	case "24h":
		since = time.Now().Add(-24 * time.Hour)
	case "7d":
		since = time.Now().Add(-7 * 24 * time.Hour)
	case "30d":
		since = time.Now().Add(-30 * 24 * time.Hour)
	default:
		// Try parsing as RFC3339
		if t, err := time.Parse(time.RFC3339, sinceParam); err == nil {
			since = t
		} else {
			since = time.Now().Add(-24 * time.Hour) // Default to 24h
		}
	}

	servers, err := h.repo.GetRecentServers(c.Request.Context(), orgID, since)
	if err != nil {
		h.logger.Error("Failed to get recent servers", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get recent servers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"servers": servers,
		"count":   len(servers),
		"since":   since.Format(time.RFC3339),
	})
}

// QuickSearch handles GET /api/v1/servers/quick-search
// @Summary Quick search servers
// @Description Perform a simple text search across server name, description, and URL
// @Tags servers
// @Produce json
// @Param q query string true "Search query"
// @Success 200 {array} MCPServer
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/servers/quick-search [get]
func (h *SearchHandler) QuickSearch(c *gin.Context) {
	orgIDStr, exists := c.Get("organization_id")
	if !exists {
		orgIDStr = "00000000-0000-0000-0000-000000000000"
	}

	orgID, err := uuid.Parse(orgIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}

	servers, err := h.repo.SearchServersSimple(c.Request.Context(), orgID, query)
	if err != nil {
		h.logger.Error("Quick search failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"servers": servers,
		"count":   len(servers),
		"query":   query,
	})
}

// RegisterSearchRoutes registers search routes with a Gin router group
func RegisterSearchRoutes(group *gin.RouterGroup, handler *SearchHandler) {
	// Main search endpoints
	group.GET("/servers/search", handler.SearchGet)
	group.POST("/servers/search", handler.Search)

	// Quick search
	group.GET("/servers/quick-search", handler.QuickSearch)

	// Recent servers
	group.GET("/servers/recent", handler.GetRecent)

	// Filter endpoints
	group.GET("/servers/filter/status/:status", handler.FilterByStatus)
	group.GET("/servers/filter/type/:type", handler.FilterByType)
}
