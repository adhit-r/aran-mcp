-- Add attestation and integrity fields to mcp_tools
ALTER TABLE mcp_tools
ADD COLUMN signature TEXT,
ADD COLUMN version_hash TEXT,
ADD COLUMN last_verified_at TIMESTAMP;
