-- Migration: Add full-text search indexes for MCP servers
-- Description: Adds GIN indexes for full-text search capabilities

-- Create a composite tsvector column for full-text search
-- This will enable fast full-text search across name, description, and url

-- Add full-text search index on mcp_servers
CREATE INDEX IF NOT EXISTS idx_mcp_servers_fts ON mcp_servers 
USING GIN (
    to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(url, ''))
);

-- Add index on status for fast filtering
CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON mcp_servers(status) 
WHERE deleted_at IS NULL;

-- Add index on type for fast filtering
CREATE INDEX IF NOT EXISTS idx_mcp_servers_type ON mcp_servers(type) 
WHERE deleted_at IS NULL;

-- Add composite index for organization + status queries
CREATE INDEX IF NOT EXISTS idx_mcp_servers_org_status ON mcp_servers(organization_id, status) 
WHERE deleted_at IS NULL;

-- Add composite index for organization + type queries
CREATE INDEX IF NOT EXISTS idx_mcp_servers_org_type ON mcp_servers(organization_id, type) 
WHERE deleted_at IS NULL;

-- Add index for date range queries
CREATE INDEX IF NOT EXISTS idx_mcp_servers_created_at ON mcp_servers(created_at DESC) 
WHERE deleted_at IS NULL;

-- Add index for updated_at for recent servers queries
CREATE INDEX IF NOT EXISTS idx_mcp_servers_updated_at ON mcp_servers(updated_at DESC) 
WHERE deleted_at IS NULL;

-- Add GIN index on metadata for tag filtering
CREATE INDEX IF NOT EXISTS idx_mcp_servers_metadata_tags ON mcp_servers 
USING GIN ((metadata->'tags')) 
WHERE metadata->'tags' IS NOT NULL;

-- Add trigram extension for fuzzy matching (if not exists)
-- This enables LIKE queries to use indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add trigram indexes for fuzzy search
CREATE INDEX IF NOT EXISTS idx_mcp_servers_name_trgm ON mcp_servers 
USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_mcp_servers_description_trgm ON mcp_servers 
USING GIN (description gin_trgm_ops) 
WHERE description IS NOT NULL;

-- Comments
COMMENT ON INDEX idx_mcp_servers_fts IS 'Full-text search index on name, description, and url';
COMMENT ON INDEX idx_mcp_servers_status IS 'Index for status filtering';
COMMENT ON INDEX idx_mcp_servers_type IS 'Index for type filtering';
COMMENT ON INDEX idx_mcp_servers_org_status IS 'Composite index for org + status queries';
COMMENT ON INDEX idx_mcp_servers_org_type IS 'Composite index for org + type queries';
COMMENT ON INDEX idx_mcp_servers_created_at IS 'Index for date range and sorting by created_at';
COMMENT ON INDEX idx_mcp_servers_updated_at IS 'Index for date range and sorting by updated_at';
COMMENT ON INDEX idx_mcp_servers_metadata_tags IS 'GIN index for tag filtering in metadata JSONB';
COMMENT ON INDEX idx_mcp_servers_name_trgm IS 'Trigram index for fuzzy name matching';
COMMENT ON INDEX idx_mcp_servers_description_trgm IS 'Trigram index for fuzzy description matching';
