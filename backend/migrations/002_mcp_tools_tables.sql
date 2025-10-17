-- MCP Tools and Executions Tables
-- Created: 2024-01-02

-- MCP Tools table
CREATE TABLE mcp_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    server_url VARCHAR(500) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    input_schema JSONB DEFAULT '{}',
    category VARCHAR(50) DEFAULT 'other',
    tags JSONB DEFAULT '[]',
    risk_level VARCHAR(20) DEFAULT 'low',
    is_enabled BOOLEAN DEFAULT true,
    usage_count BIGINT DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(server_id, name)
);

-- Tool Executions table
CREATE TABLE tool_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id UUID NOT NULL REFERENCES mcp_tools(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    arguments JSONB DEFAULT '{}',
    result JSONB,
    error TEXT,
    duration INTERVAL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MCP Resources table
CREATE TABLE mcp_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    uri VARCHAR(500) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    is_available BOOLEAN DEFAULT true,
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(server_id, uri)
);

-- MCP Prompts table
CREATE TABLE mcp_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    arguments JSONB DEFAULT '[]',
    template TEXT,
    category VARCHAR(50) DEFAULT 'general',
    usage_count BIGINT DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(server_id, name)
);

-- Security Scans table
CREATE TABLE security_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE,
    tool_id UUID REFERENCES mcp_tools(id) ON DELETE CASCADE,
    scan_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    severity VARCHAR(20),
    findings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    score INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Reports table
CREATE TABLE compliance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    framework VARCHAR(50) NOT NULL, -- OWASP, SOC2, ISO27001, etc.
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    score INTEGER,
    findings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    evidence JSONB DEFAULT '[]',
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incident Response table
CREATE TABLE incident_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    alert_id UUID REFERENCES alerts(id),
    server_id UUID REFERENCES mcp_servers(id),
    incident_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    response_actions JSONB DEFAULT '[]',
    assigned_to UUID REFERENCES users(id),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_mcp_tools_server_id ON mcp_tools(server_id);
CREATE INDEX idx_mcp_tools_category ON mcp_tools(category);
CREATE INDEX idx_mcp_tools_risk_level ON mcp_tools(risk_level);
CREATE INDEX idx_mcp_tools_usage_count ON mcp_tools(usage_count DESC);
CREATE INDEX idx_mcp_tools_enabled ON mcp_tools(is_enabled);

CREATE INDEX idx_tool_executions_tool_id ON tool_executions(tool_id);
CREATE INDEX idx_tool_executions_server_id ON tool_executions(server_id);
CREATE INDEX idx_tool_executions_user_id ON tool_executions(user_id);
CREATE INDEX idx_tool_executions_status ON tool_executions(status);
CREATE INDEX idx_tool_executions_executed_at ON tool_executions(executed_at);

CREATE INDEX idx_mcp_resources_server_id ON mcp_resources(server_id);
CREATE INDEX idx_mcp_resources_available ON mcp_resources(is_available);
CREATE INDEX idx_mcp_resources_access_count ON mcp_resources(access_count DESC);

CREATE INDEX idx_mcp_prompts_server_id ON mcp_prompts(server_id);
CREATE INDEX idx_mcp_prompts_category ON mcp_prompts(category);
CREATE INDEX idx_mcp_prompts_usage_count ON mcp_prompts(usage_count DESC);

CREATE INDEX idx_security_scans_organization_id ON security_scans(organization_id);
CREATE INDEX idx_security_scans_server_id ON security_scans(server_id);
CREATE INDEX idx_security_scans_scan_type ON security_scans(scan_type);
CREATE INDEX idx_security_scans_status ON security_scans(status);
CREATE INDEX idx_security_scans_severity ON security_scans(severity);

CREATE INDEX idx_compliance_reports_organization_id ON compliance_reports(organization_id);
CREATE INDEX idx_compliance_reports_framework ON compliance_reports(framework);
CREATE INDEX idx_compliance_reports_status ON compliance_reports(status);

CREATE INDEX idx_incident_responses_organization_id ON incident_responses(organization_id);
CREATE INDEX idx_incident_responses_status ON incident_responses(status);
CREATE INDEX idx_incident_responses_severity ON incident_responses(severity);
CREATE INDEX idx_incident_responses_assigned_to ON incident_responses(assigned_to);

-- Triggers for updated_at
CREATE TRIGGER update_mcp_tools_updated_at BEFORE UPDATE ON mcp_tools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mcp_resources_updated_at BEFORE UPDATE ON mcp_resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mcp_prompts_updated_at BEFORE UPDATE ON mcp_prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incident_responses_updated_at BEFORE UPDATE ON incident_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();