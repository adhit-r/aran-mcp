package database

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// SearchFilters represents the search and filter parameters
type SearchFilters struct {
	Query     string     `json:"query,omitempty"`      // Full-text search query
	Status    []string   `json:"status,omitempty"`     // Filter by status (online, offline, error, unknown)
	Type      []string   `json:"type,omitempty"`       // Filter by type (filesystem, database, api, custom)
	Tags      []string   `json:"tags,omitempty"`       // Filter by tags
	DateFrom  *time.Time `json:"date_from,omitempty"`  // Filter by date range start
	DateTo    *time.Time `json:"date_to,omitempty"`    // Filter by date range end
	SortBy    string     `json:"sort_by,omitempty"`    // Sort field (name, created_at, updated_at, status)
	SortOrder string     `json:"sort_order,omitempty"` // Sort order (asc, desc)
	Limit     int        `json:"limit,omitempty"`      // Pagination limit
	Offset    int        `json:"offset,omitempty"`     // Pagination offset
}

// SearchResult represents a search result with highlighting
type SearchResult struct {
	Server        *MCPServer `json:"server"`
	Relevance     float64    `json:"relevance,omitempty"`
	HighlightName string     `json:"highlight_name,omitempty"`
	HighlightDesc string     `json:"highlight_desc,omitempty"`
}

// SearchResponse represents the full search response
type SearchResponse struct {
	Results    []*SearchResult `json:"results"`
	Total      int             `json:"total"`
	TotalPages int             `json:"total_pages"`
	Page       int             `json:"page"`
	Limit      int             `json:"limit"`
	Filters    *SearchFilters  `json:"filters"`
}

// DefaultSearchFilters returns default filter values
func DefaultSearchFilters() *SearchFilters {
	return &SearchFilters{
		SortBy:    "created_at",
		SortOrder: "desc",
		Limit:     20,
		Offset:    0,
	}
}

// ValidateSortBy validates and returns a safe sort column
func ValidateSortBy(sortBy string) string {
	validColumns := map[string]string{
		"name":       "name",
		"created_at": "created_at",
		"updated_at": "updated_at",
		"status":     "status",
		"type":       "type",
		"url":        "url",
	}
	if col, ok := validColumns[sortBy]; ok {
		return col
	}
	return "created_at"
}

// ValidateSortOrder validates and returns a safe sort order
func ValidateSortOrder(order string) string {
	if strings.ToLower(order) == "asc" {
		return "ASC"
	}
	return "DESC"
}

// SearchMCPServers performs advanced search with full-text search and filters
func (r *Repository) SearchMCPServers(ctx context.Context, orgID uuid.UUID, filters *SearchFilters) (*SearchResponse, error) {
	if filters == nil {
		filters = DefaultSearchFilters()
	}

	// Apply defaults
	if filters.Limit <= 0 || filters.Limit > 100 {
		filters.Limit = 20
	}
	if filters.Offset < 0 {
		filters.Offset = 0
	}

	// Build the query dynamically
	var whereConditions []string
	var args []interface{}
	argNum := 1

	// Base condition - organization and not deleted
	whereConditions = append(whereConditions, fmt.Sprintf("organization_id = $%d", argNum))
	args = append(args, orgID)
	argNum++

	whereConditions = append(whereConditions, "deleted_at IS NULL")

	// Full-text search using ILIKE for broad compatibility
	if filters.Query != "" {
		whereConditions = append(whereConditions,
			fmt.Sprintf("(name ILIKE $%d OR description ILIKE $%d OR url ILIKE $%d OR type ILIKE $%d)",
				argNum, argNum+1, argNum+2, argNum+3))
		likePattern := "%" + filters.Query + "%"
		args = append(args, likePattern, likePattern, likePattern, likePattern)
		argNum += 4
	}

	// Filter by status
	if len(filters.Status) > 0 {
		placeholders := make([]string, len(filters.Status))
		for i, status := range filters.Status {
			placeholders[i] = fmt.Sprintf("$%d", argNum)
			args = append(args, status)
			argNum++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("status IN (%s)", strings.Join(placeholders, ", ")))
	}

	// Filter by type
	if len(filters.Type) > 0 {
		placeholders := make([]string, len(filters.Type))
		for i, t := range filters.Type {
			placeholders[i] = fmt.Sprintf("$%d", argNum)
			args = append(args, t)
			argNum++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("type IN (%s)", strings.Join(placeholders, ", ")))
	}

	// Filter by date range
	if filters.DateFrom != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("created_at >= $%d", argNum))
		args = append(args, filters.DateFrom)
		argNum++
	}
	if filters.DateTo != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("created_at <= $%d", argNum))
		args = append(args, filters.DateTo)
		argNum++
	}

	// Filter by tags (stored in metadata JSONB)
	if len(filters.Tags) > 0 {
		for _, tag := range filters.Tags {
			whereConditions = append(whereConditions, fmt.Sprintf("metadata->'tags' ? $%d", argNum))
			args = append(args, tag)
			argNum++
		}
	}

	// Build WHERE clause
	whereClause := strings.Join(whereConditions, " AND ")

	// Build ORDER BY clause
	sortBy := ValidateSortBy(filters.SortBy)
	sortOrder := ValidateSortOrder(filters.SortOrder)
	orderClause := fmt.Sprintf("ORDER BY %s %s", sortBy, sortOrder)

	// Count total results (using same where conditions but without the extra query args)
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM mcp_servers WHERE %s", whereClause)
	var total int
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to count search results: %w", err)
	}

	// Build full SELECT query
	query := fmt.Sprintf(`
		SELECT id, organization_id, name, url, description, type, status, version,
			capabilities, metadata, last_checked_at, response_time_ms, uptime_percentage,
			error_rate, created_by, created_at, updated_at, deleted_at
		FROM mcp_servers 
		WHERE %s 
		%s 
		LIMIT $%d OFFSET $%d`,
		whereClause, orderClause, argNum, argNum+1)
	args = append(args, filters.Limit, filters.Offset)

	// Execute query
	var servers []*MCPServer
	err = r.db.SelectContext(ctx, &servers, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to search MCP servers: %w", err)
	}

	// Build results with optional highlighting
	var results []*SearchResult
	for _, server := range servers {
		result := &SearchResult{
			Server:    server,
			Relevance: 0.0,
		}

		// Add simple highlighting if query exists
		if filters.Query != "" {
			result.HighlightName = highlightText(server.Name, filters.Query)
			if server.Description != nil {
				result.HighlightDesc = highlightText(*server.Description, filters.Query)
			}
		}

		results = append(results, result)
	}

	// Calculate pagination info
	totalPages := (total + filters.Limit - 1) / filters.Limit
	page := (filters.Offset / filters.Limit) + 1

	return &SearchResponse{
		Results:    results,
		Total:      total,
		TotalPages: totalPages,
		Page:       page,
		Limit:      filters.Limit,
		Filters:    filters,
	}, nil
}

// highlightText adds HTML highlight tags around matched text
func highlightText(text, query string) string {
	if query == "" || text == "" {
		return text
	}
	lowerText := strings.ToLower(text)
	lowerQuery := strings.ToLower(query)

	idx := strings.Index(lowerText, lowerQuery)
	if idx == -1 {
		return text
	}

	return text[:idx] + "<mark>" + text[idx:idx+len(query)] + "</mark>" + text[idx+len(query):]
}

// GetServersByStatus retrieves servers filtered by status
func (r *Repository) GetServersByStatus(ctx context.Context, orgID uuid.UUID, statuses []string) ([]*MCPServer, error) {
	if len(statuses) == 0 {
		return r.ListMCPServers(ctx, orgID, 100, 0)
	}

	placeholders := make([]string, len(statuses))
	args := []interface{}{orgID}
	for i, status := range statuses {
		placeholders[i] = fmt.Sprintf("$%d", i+2)
		args = append(args, status)
	}

	query := fmt.Sprintf(`
		SELECT * FROM mcp_servers 
		WHERE organization_id = $1 
		AND deleted_at IS NULL 
		AND status IN (%s)
		ORDER BY created_at DESC
	`, strings.Join(placeholders, ", "))

	var servers []*MCPServer
	err := r.db.SelectContext(ctx, &servers, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get servers by status: %w", err)
	}

	return servers, nil
}

// GetServersByType retrieves servers filtered by type
func (r *Repository) GetServersByType(ctx context.Context, orgID uuid.UUID, types []string) ([]*MCPServer, error) {
	if len(types) == 0 {
		return r.ListMCPServers(ctx, orgID, 100, 0)
	}

	placeholders := make([]string, len(types))
	args := []interface{}{orgID}
	for i, t := range types {
		placeholders[i] = fmt.Sprintf("$%d", i+2)
		args = append(args, t)
	}

	query := fmt.Sprintf(`
		SELECT * FROM mcp_servers 
		WHERE organization_id = $1 
		AND deleted_at IS NULL 
		AND type IN (%s)
		ORDER BY created_at DESC
	`, strings.Join(placeholders, ", "))

	var servers []*MCPServer
	err := r.db.SelectContext(ctx, &servers, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get servers by type: %w", err)
	}

	return servers, nil
}

// GetRecentServers retrieves recently added or updated servers
func (r *Repository) GetRecentServers(ctx context.Context, orgID uuid.UUID, since time.Time) ([]*MCPServer, error) {
	query := `
		SELECT * FROM mcp_servers 
		WHERE organization_id = $1 
		AND deleted_at IS NULL 
		AND (created_at >= $2 OR updated_at >= $2)
		ORDER BY GREATEST(created_at, updated_at) DESC
	`

	var servers []*MCPServer
	err := r.db.SelectContext(ctx, &servers, query, orgID, since)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent servers: %w", err)
	}

	return servers, nil
}

// SearchServersSimple performs a simple text search
func (r *Repository) SearchServersSimple(ctx context.Context, orgID uuid.UUID, searchQuery string) ([]*MCPServer, error) {
	sqlQuery := `
		SELECT * FROM mcp_servers 
		WHERE organization_id = $1 
		AND deleted_at IS NULL 
		AND (
			name ILIKE $2 
			OR description ILIKE $2 
			OR url ILIKE $2
		)
		ORDER BY created_at DESC
		LIMIT 50
	`

	var servers []*MCPServer
	err := r.db.SelectContext(ctx, &servers, sqlQuery, orgID, "%"+searchQuery+"%")
	if err != nil {
		return nil, fmt.Errorf("failed to search servers: %w", err)
	}

	return servers, nil
}
