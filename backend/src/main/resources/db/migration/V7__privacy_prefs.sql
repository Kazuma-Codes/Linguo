-- V7 Migration: Privacy preferences
-- Persisted per-user toggles so Privacy controls work across devices
-- instead of being local-only UI state.

ALTER TABLE users ADD COLUMN IF NOT EXISTS show_online BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS read_receipts BOOLEAN NOT NULL DEFAULT TRUE;
