-- Webhook support migration
-- Creates tables for webhook management and delivery tracking

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    secret VARCHAR(64) NOT NULL,
    events JSONB NOT NULL DEFAULT '[]',
    headers JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_webhooks_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_webhooks_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_organization_id ON webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN (events);
CREATE INDEX IF NOT EXISTS idx_webhooks_deleted_at ON webhooks(deleted_at) WHERE deleted_at IS NULL;

-- Webhook deliveries table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL,
    event VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    status_code INTEGER,
    response TEXT,
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_webhook_deliveries_webhook FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE,
    CONSTRAINT chk_delivery_status CHECK (status IN ('pending', 'success', 'failed', 'retrying'))
);

-- Create indexes for webhook_deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at) 
    WHERE status IN ('pending', 'retrying') AND next_retry_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE webhooks IS 'Stores webhook configurations for event-driven notifications';
COMMENT ON TABLE webhook_deliveries IS 'Tracks individual webhook delivery attempts and their outcomes';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_webhook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_webhooks_updated_at ON webhooks;
CREATE TRIGGER trigger_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_updated_at();

DROP TRIGGER IF EXISTS trigger_webhook_deliveries_updated_at ON webhook_deliveries;
CREATE TRIGGER trigger_webhook_deliveries_updated_at
    BEFORE UPDATE ON webhook_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_updated_at();
