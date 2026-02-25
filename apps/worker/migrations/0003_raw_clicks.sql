-- Migration: 0003_raw_clicks
-- Description: Raw clicks table for click ingestion (M02)
-- Date: 2026-02-25
-- Author: Bulma 🔧

-- ============================================
-- UP MIGRATION
-- ============================================

-- Raw clicks table
-- Stores click events from queue consumer
-- Per SYSTEM_INVARIANTS:
--   #13: No raw IP stored, only hash
--   #14: 30-day retention enforced by automation
CREATE TABLE IF NOT EXISTS raw_clicks (
  id TEXT PRIMARY KEY,                                    -- click_id (deterministic hash)
  ts TEXT NOT NULL,                                       -- ISO8601 timestamp
  workspace_id TEXT NOT NULL,
  link_id TEXT NOT NULL,
  domain TEXT NOT NULL,                                   -- hostname at time of click
  slug TEXT NOT NULL,
  destination_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,                                           -- SHA256 of IP, NO raw IP
  country TEXT,
  region TEXT,
  city TEXT,
  device_type TEXT,                                       -- mobile | tablet | desktop | unknown
  is_bot_suspected INTEGER DEFAULT 0,                     -- 1 if suspected bot
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for workspace analytics (list clicks by workspace + time)
CREATE INDEX IF NOT EXISTS idx_raw_clicks_workspace_ts ON raw_clicks(workspace_id, ts);

-- Index for link analytics (list clicks by link + time)
CREATE INDEX IF NOT EXISTS idx_raw_clicks_link_ts ON raw_clicks(link_id, ts);

-- ============================================
-- DOWN MIGRATION (ROLLBACK)
-- ============================================
-- To rollback, execute the following statements:
--
-- DROP INDEX IF EXISTS idx_raw_clicks_link_ts;
-- DROP INDEX IF EXISTS idx_raw_clicks_workspace_ts;
-- DROP TABLE IF EXISTS raw_clicks;
