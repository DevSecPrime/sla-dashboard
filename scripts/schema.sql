-- ========================================================================
-- SLA Monitoring Dashboard - PostgreSQL Schema (Supabase)
-- ========================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: monitoring_checks
-- Stores validated, normalized, and deduplicated health check records.
CREATE TABLE IF NOT EXISTS monitoring_checks (
    id BIGSERIAL PRIMARY KEY,
    service_id VARCHAR(50) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    status_code INTEGER NOT NULL,
    is_success BOOLEAN NOT NULL,
    latency_ms DOUBLE PRECISION,
    raw_latency VARCHAR(50),
    latency_unit VARCHAR(10),
    agent VARCHAR(50) NOT NULL,
    region VARCHAR(50) NOT NULL,
    quality_flags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate entries for the same service check at the same timestamp
    CONSTRAINT uq_service_timestamp UNIQUE (service_id, timestamp)
);

-- Indices for rapid dashboard filtering and timeline queries
CREATE INDEX IF NOT EXISTS idx_checks_timestamp ON monitoring_checks (timestamp);
CREATE INDEX IF NOT EXISTS idx_checks_service_id ON monitoring_checks (service_id);
CREATE INDEX IF NOT EXISTS idx_checks_status_code ON monitoring_checks (status_code);
CREATE INDEX IF NOT EXISTS idx_checks_is_success ON monitoring_checks (is_success);
CREATE INDEX IF NOT EXISTS idx_checks_service_time ON monitoring_checks (service_id, timestamp);

-- Table: upload_sessions
-- Tracks CSV uploads and data cleansing audit logs.
CREATE TABLE IF NOT EXISTS upload_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    total_rows INTEGER NOT NULL,
    clean_rows INTEGER NOT NULL,
    duplicates_skipped INTEGER NOT NULL DEFAULT 0,
    anomalies_fixed INTEGER NOT NULL DEFAULT 0,
    quality_breakdown JSONB DEFAULT '{}'::JSONB,
    date_range_start TIMESTAMPTZ,
    date_range_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
