-- Migration: Enhance API keys table for full key management
-- Description: Adds columns needed for comprehensive API key management

-- Check if columns exist and add them if they don't
DO $$ 
BEGIN
    -- Add key_prefix column for quick lookups
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'key_prefix') THEN
        ALTER TABLE api_keys ADD COLUMN key_prefix VARCHAR(16);
    END IF;

    -- Add description column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'description') THEN
        ALTER TABLE api_keys ADD COLUMN description TEXT;
    END IF;

    -- Add rate_limit column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'rate_limit') THEN
        ALTER TABLE api_keys ADD COLUMN rate_limit INTEGER DEFAULT 100;
    END IF;

    -- Add scopes column (array of strings)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'scopes') THEN
        ALTER TABLE api_keys ADD COLUMN scopes TEXT[] DEFAULT ARRAY['read'];
    END IF;

    -- Add last_used_ip column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'last_used_ip') THEN
        ALTER TABLE api_keys ADD COLUMN last_used_ip INET;
    END IF;

    -- Add revoked_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'revoked_at') THEN
        ALTER TABLE api_keys ADD COLUMN revoked_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add metadata column for custom data
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'metadata') THEN
        ALTER TABLE api_keys ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;

    -- Rename key_hash if it was named differently
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'api_keys' AND column_name = 'key') THEN
        ALTER TABLE api_keys RENAME COLUMN key TO key_hash;
    END IF;
END $$;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_org_active ON api_keys(organization_id, is_active) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL AND is_active = true;

-- Add constraints
DO $$
BEGIN
    -- Ensure key_prefix is unique
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_key_prefix_unique') THEN
        ALTER TABLE api_keys ADD CONSTRAINT api_keys_key_prefix_unique UNIQUE (key_prefix);
    END IF;
END $$;

-- Comments for documentation
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 characters of the key for quick identification';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the full API key';
COMMENT ON COLUMN api_keys.description IS 'Human-readable description of the key purpose';
COMMENT ON COLUMN api_keys.rate_limit IS 'Maximum requests per minute for this key';
COMMENT ON COLUMN api_keys.scopes IS 'Array of access scopes granted to this key';
COMMENT ON COLUMN api_keys.last_used_ip IS 'IP address from which the key was last used';
COMMENT ON COLUMN api_keys.revoked_at IS 'Timestamp when the key was revoked';
COMMENT ON COLUMN api_keys.metadata IS 'Additional metadata as JSON';
