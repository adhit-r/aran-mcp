-- Add table for MCP tool invocations to support replay detection
CREATE TABLE IF NOT EXISTS mcp_tool_invocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES mcp_tools(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    user_id UUID,
    request_fingerprint TEXT NOT NULL, -- Hash of request parameters
    response_fingerprint TEXT, -- Hash of response
    arguments JSONB,
    result JSONB,
    error TEXT,
    duration INTERVAL,
    status TEXT NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient replay detection
CREATE INDEX IF NOT EXISTS idx_mcp_tool_invocations_fingerprint ON mcp_tool_invocations(request_fingerprint);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_invocations_tool_executed ON mcp_tool_invocations(tool_id, executed_at);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_invocations_user ON mcp_tool_invocations(user_id);

-- Add deleted_at for soft deletes
ALTER TABLE mcp_tool_invocations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;