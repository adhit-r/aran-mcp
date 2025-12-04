-- Add alerts table for security monitoring
CREATE TABLE IF NOT EXISTS mcp_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mcp_alerts_server_id ON mcp_alerts(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_alerts_severity ON mcp_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_mcp_alerts_created_at ON mcp_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_mcp_alerts_resolved ON mcp_alerts(resolved_at) WHERE resolved_at IS NULL;