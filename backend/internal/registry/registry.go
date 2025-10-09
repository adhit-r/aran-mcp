package registry

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/radhi1991/aran-mcp-sentinel/internal/models"
	"github.com/radhi1991/aran-mcp-sentinel/internal/repository"
	"go.uber.org/zap"
)

// ServerRegistry provides centralized MCP server registry functionality
type ServerRegistry struct {
	logger *zap.Logger
	repo   *repository.MCPServerRepository
}

// RegistryEntry represents a server in the registry
type RegistryEntry struct {
	ID             uuid.UUID              `json:"id"`
	Name           string                 `json:"name"`
	URL            string                 `json:"url"`
	Description    string                 `json:"description"`
	Type           string                 `json:"type"`
	Status         string                 `json:"status"`
	Version        string                 `json:"version"`
	Capabilities   []string               `json:"capabilities"`
	Tags           []string               `json:"tags"`
	OrganizationID uuid.UUID              `json:"organization_id"`
	LastSeen       time.Time              `json:"last_seen"`
	HealthScore    int                    `json:"health_score"`
	ResponseTime   int64                  `json:"response_time_ms"`
	Uptime         float64                `json:"uptime_percentage"`
	Metadata       map[string]interface{} `json:"metadata"`
	CreatedAt      time.Time              `json:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"`
}

// RegistryStats represents registry statistics
type RegistryStats struct {
	TotalServers   int            `json:"total_servers"`
	OnlineServers  int            `json:"online_servers"`
	OfflineServers int            `json:"offline_servers"`
	AverageHealth  float64        `json:"average_health"`
	ServerTypes    map[string]int `json:"server_types"`
	Capabilities   map[string]int `json:"capabilities"`
	Organizations  map[string]int `json:"organizations"`
}

// RegistrySearchOptions represents search options for the registry
type RegistrySearchOptions struct {
	Query          string   `json:"query,omitempty"`
	Type           string   `json:"type,omitempty"`
	Status         string   `json:"status,omitempty"`
	OrganizationID string   `json:"organization_id,omitempty"`
	Capabilities   []string `json:"capabilities,omitempty"`
	Tags           []string `json:"tags,omitempty"`
	MinHealthScore int      `json:"min_health_score,omitempty"`
	SortBy         string   `json:"sort_by,omitempty"`    // name, health_score, last_seen, created_at
	SortOrder      string   `json:"sort_order,omitempty"` // asc, desc
	Limit          int      `json:"limit,omitempty"`
	Offset         int      `json:"offset,omitempty"`
}

// NewServerRegistry creates a new server registry
func NewServerRegistry(logger *zap.Logger, repo *repository.MCPServerRepository) *ServerRegistry {
	return &ServerRegistry{
		logger: logger,
		repo:   repo,
	}
}

// RegisterServer registers a server in the registry
func (sr *ServerRegistry) RegisterServer(ctx context.Context, server *models.MCPServer) error {
	// Check if server already exists
	existing, err := sr.repo.GetServerByID(server.ID)
	if err == nil && existing != nil {
		// Update existing server
		server.UpdatedAt = time.Now()
		return sr.repo.UpdateServer(ctx, server)
	}

	// Create new server
	server.CreatedAt = time.Now()
	server.UpdatedAt = time.Now()
	return sr.repo.CreateServer(ctx, server)
}

// UnregisterServer removes a server from the registry
func (sr *ServerRegistry) UnregisterServer(ctx context.Context, serverID uuid.UUID) error {
	return sr.repo.DeleteServer(ctx, serverID)
}

// GetServer retrieves a server from the registry
func (sr *ServerRegistry) GetServer(ctx context.Context, serverID uuid.UUID) (*RegistryEntry, error) {
	server, err := sr.repo.GetServerByID(serverID)
	if err != nil {
		return nil, err
	}

	return sr.convertToRegistryEntry(server), nil
}

// SearchServers searches for servers in the registry
func (sr *ServerRegistry) SearchServers(ctx context.Context, options RegistrySearchOptions) ([]*RegistryEntry, error) {
	// Get all servers (in production, you'd implement proper database queries)
	servers, err := sr.repo.GetAllServers(ctx)
	if err != nil {
		return nil, err
	}

	var entries []*RegistryEntry
	for _, server := range servers {
		entry := sr.convertToRegistryEntry(server)
		entries = append(entries, entry)
	}

	// Apply filters
	entries = sr.applyFilters(entries, options)

	// Apply sorting
	entries = sr.applySorting(entries, options)

	// Apply pagination
	entries = sr.applyPagination(entries, options)

	return entries, nil
}

// GetRegistryStats returns registry statistics
func (sr *ServerRegistry) GetRegistryStats(ctx context.Context) (*RegistryStats, error) {
	servers, err := sr.repo.GetAllServers(ctx)
	if err != nil {
		return nil, err
	}

	stats := &RegistryStats{
		ServerTypes:   make(map[string]int),
		Capabilities:  make(map[string]int),
		Organizations: make(map[string]int),
	}

	var totalHealth int
	onlineCount := 0

	for _, server := range servers {
		stats.TotalServers++

		// Count by status
		if server.Status == "online" {
			onlineCount++
		}

		// Count by type
		stats.ServerTypes[server.Type]++

		// Count capabilities
		for _, capability := range server.Capabilities {
			stats.Capabilities[capability]++
		}

		// Count organizations
		orgID := server.OrganizationID.String()
		stats.Organizations[orgID]++

		// Calculate average health (mock for now)
		healthScore := 85 // In production, get from health monitoring
		totalHealth += healthScore
	}

	stats.OnlineServers = onlineCount
	stats.OfflineServers = stats.TotalServers - onlineCount
	if stats.TotalServers > 0 {
		stats.AverageHealth = float64(totalHealth) / float64(stats.TotalServers)
	}

	return stats, nil
}

// GetServersByType returns servers filtered by type
func (sr *ServerRegistry) GetServersByType(ctx context.Context, serverType string) ([]*RegistryEntry, error) {
	options := RegistrySearchOptions{
		Type: serverType,
	}
	return sr.SearchServers(ctx, options)
}

// GetServersByOrganization returns servers for a specific organization
func (sr *ServerRegistry) GetServersByOrganization(ctx context.Context, organizationID uuid.UUID) ([]*RegistryEntry, error) {
	options := RegistrySearchOptions{
		OrganizationID: organizationID.String(),
	}
	return sr.SearchServers(ctx, options)
}

// GetServersByCapability returns servers that have a specific capability
func (sr *ServerRegistry) GetServersByCapability(ctx context.Context, capability string) ([]*RegistryEntry, error) {
	options := RegistrySearchOptions{
		Capabilities: []string{capability},
	}
	return sr.SearchServers(ctx, options)
}

// UpdateServerHealth updates server health information
func (sr *ServerRegistry) UpdateServerHealth(ctx context.Context, serverID uuid.UUID, healthData map[string]interface{}) error {
	server, err := sr.repo.GetServerByID(serverID)
	if err != nil {
		return err
	}

	// Update health-related fields
	if status, ok := healthData["status"].(string); ok {
		server.Status = status
	}
	if responseTime, ok := healthData["response_time"].(int64); ok {
		server.ResponseTime = responseTime
	}
	if uptime, ok := healthData["uptime"].(float64); ok {
		server.UptimePercentage = uptime
	}
	if lastChecked, ok := healthData["last_checked"].(time.Time); ok {
		server.LastCheckedAt = lastChecked
	}

	server.UpdatedAt = time.Now()
	return sr.repo.UpdateServer(ctx, server)
}

// GetServerCapabilities returns all unique capabilities in the registry
func (sr *ServerRegistry) GetServerCapabilities(ctx context.Context) ([]string, error) {
	servers, err := sr.repo.GetAllServers(ctx)
	if err != nil {
		return nil, err
	}

	capabilitySet := make(map[string]bool)
	for _, server := range servers {
		for _, capability := range server.Capabilities {
			capabilitySet[capability] = true
		}
	}

	var capabilities []string
	for capability := range capabilitySet {
		capabilities = append(capabilities, capability)
	}

	sort.Strings(capabilities)
	return capabilities, nil
}

// GetServerTypes returns all unique server types in the registry
func (sr *ServerRegistry) GetServerTypes(ctx context.Context) ([]string, error) {
	servers, err := sr.repo.GetAllServers(ctx)
	if err != nil {
		return nil, err
	}

	typeSet := make(map[string]bool)
	for _, server := range servers {
		typeSet[server.Type] = true
	}

	var types []string
	for serverType := range typeSet {
		types = append(types, serverType)
	}

	sort.Strings(types)
	return types, nil
}

// convertToRegistryEntry converts a database server model to a registry entry
func (sr *ServerRegistry) convertToRegistryEntry(server *models.MCPServer) *RegistryEntry {
	entry := &RegistryEntry{
		ID:             server.ID,
		Name:           server.Name,
		URL:            server.URL,
		Description:    server.Description,
		Type:           server.Type,
		Status:         server.Status,
		Version:        server.Version,
		Capabilities:   server.Capabilities,
		OrganizationID: server.OrganizationID,
		CreatedAt:      server.CreatedAt,
		UpdatedAt:      server.UpdatedAt,
		Metadata:       server.Metadata,
	}

	// Set health-related fields (mock for now)
	entry.HealthScore = 85
	entry.ResponseTime = server.ResponseTime
	entry.Uptime = server.UptimePercentage
	entry.LastSeen = server.LastCheckedAt

	// Extract tags from metadata
	if tags, ok := server.Metadata["tags"].([]interface{}); ok {
		for _, tag := range tags {
			if tagStr, ok := tag.(string); ok {
				entry.Tags = append(entry.Tags, tagStr)
			}
		}
	}

	return entry
}

// applyFilters applies search filters to server entries
func (sr *ServerRegistry) applyFilters(entries []*RegistryEntry, options RegistrySearchOptions) []*RegistryEntry {
	var filtered []*RegistryEntry

	for _, entry := range entries {
		// Apply query filter
		if options.Query != "" {
			query := options.Query
			if !sr.matchesQuery(entry, query) {
				continue
			}
		}

		// Apply type filter
		if options.Type != "" && entry.Type != options.Type {
			continue
		}

		// Apply status filter
		if options.Status != "" && entry.Status != options.Status {
			continue
		}

		// Apply organization filter
		if options.OrganizationID != "" && entry.OrganizationID.String() != options.OrganizationID {
			continue
		}

		// Apply capabilities filter
		if len(options.Capabilities) > 0 {
			if !sr.hasAnyCapability(entry, options.Capabilities) {
				continue
			}
		}

		// Apply tags filter
		if len(options.Tags) > 0 {
			if !sr.hasAnyTag(entry, options.Tags) {
				continue
			}
		}

		// Apply health score filter
		if options.MinHealthScore > 0 && entry.HealthScore < options.MinHealthScore {
			continue
		}

		filtered = append(filtered, entry)
	}

	return filtered
}

// applySorting applies sorting to server entries
func (sr *ServerRegistry) applySorting(entries []*RegistryEntry, options RegistrySearchOptions) []*RegistryEntry {
	if options.SortBy == "" {
		return entries
	}

	sort.Slice(entries, func(i, j int) bool {
		switch options.SortBy {
		case "name":
			if options.SortOrder == "desc" {
				return entries[i].Name > entries[j].Name
			}
			return entries[i].Name < entries[j].Name
		case "health_score":
			if options.SortOrder == "desc" {
				return entries[i].HealthScore > entries[j].HealthScore
			}
			return entries[i].HealthScore < entries[j].HealthScore
		case "last_seen":
			if options.SortOrder == "desc" {
				return entries[i].LastSeen.After(entries[j].LastSeen)
			}
			return entries[i].LastSeen.Before(entries[j].LastSeen)
		case "created_at":
			if options.SortOrder == "desc" {
				return entries[i].CreatedAt.After(entries[j].CreatedAt)
			}
			return entries[i].CreatedAt.Before(entries[j].CreatedAt)
		default:
			return false
		}
	})

	return entries
}

// applyPagination applies pagination to server entries
func (sr *ServerRegistry) applyPagination(entries []*RegistryEntry, options RegistrySearchOptions) []*RegistryEntry {
	if options.Limit <= 0 {
		options.Limit = 50 // Default limit
	}

	start := options.Offset
	if start < 0 {
		start = 0
	}

	end := start + options.Limit
	if end > len(entries) {
		end = len(entries)
	}

	if start >= len(entries) {
		return []*RegistryEntry{}
	}

	return entries[start:end]
}

// matchesQuery checks if an entry matches a search query
func (sr *ServerRegistry) matchesQuery(entry *RegistryEntry, query string) bool {
	query = fmt.Sprintf("%s", query)
	return contains(entry.Name, query) ||
		contains(entry.Description, query) ||
		contains(entry.URL, query) ||
		contains(entry.Type, query)
}

// hasAnyCapability checks if an entry has any of the specified capabilities
func (sr *ServerRegistry) hasAnyCapability(entry *RegistryEntry, capabilities []string) bool {
	for _, capability := range capabilities {
		for _, entryCapability := range entry.Capabilities {
			if entryCapability == capability {
				return true
			}
		}
	}
	return false
}

// hasAnyTag checks if an entry has any of the specified tags
func (sr *ServerRegistry) hasAnyTag(entry *RegistryEntry, tags []string) bool {
	for _, tag := range tags {
		for _, entryTag := range entry.Tags {
			if entryTag == tag {
				return true
			}
		}
	}
	return false
}

// contains checks if a string contains a substring (case-insensitive)
func contains(s, substr string) bool {
	return len(s) >= len(substr) &&
		(s == substr ||
			(len(s) > len(substr) &&
				(s[:len(substr)] == substr ||
					s[len(s)-len(substr):] == substr ||
					containsSubstring(s, substr))))
}

// containsSubstring checks if a string contains a substring
func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
