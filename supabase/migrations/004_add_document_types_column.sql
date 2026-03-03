-- ============================================================================
-- Fix: add missing document_types array column to contracts
-- The ingestion pipeline writes to this column but it was missing from 001.
-- ============================================================================

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS document_types text[];
