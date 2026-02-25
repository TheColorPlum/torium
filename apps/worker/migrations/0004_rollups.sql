-- Migration: 0004_rollups
-- Description: Rollup tables for analytics (M04)
-- Date: 2026-02-25
-- Author: Bulma 🔧
-- Invariant: #15 - Rollups derived from raw_clicks only

-- ============================================
-- UP MIGRATION
-- ============================================

-- Aggregation state table (single row)
-- Tracks the last processed timestamp to ensure idempotent aggregation
CREATE TABLE IF NOT EXISTS aggregation_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),              -- Enforce single row
  last_processed_ts TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Initialize single row
INSERT OR IGNORE INTO aggregation_state (id, last_processed_ts) VALUES (1, '1970-01-01T00:00:00.000Z');

-- Daily workspace clicks rollup
-- Aggregates total clicks per workspace per day
CREATE TABLE IF NOT EXISTS rollup_daily_workspace (
  workspace_id TEXT NOT NULL,
  date TEXT NOT NULL,                                 -- YYYY-MM-DD format
  total_clicks INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, date)
);

-- Daily link clicks rollup
-- Aggregates total clicks per link per day
CREATE TABLE IF NOT EXISTS rollup_daily_link (
  link_id TEXT NOT NULL,
  date TEXT NOT NULL,                                 -- YYYY-MM-DD format
  total_clicks INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (link_id, date)
);

-- Daily referrer rollup per workspace
-- Aggregates clicks by referrer domain per workspace per day
CREATE TABLE IF NOT EXISTS rollup_referrer_daily (
  workspace_id TEXT NOT NULL,
  date TEXT NOT NULL,                                 -- YYYY-MM-DD format
  referrer TEXT NOT NULL,                             -- normalized referrer domain or '(direct)'
  total_clicks INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, date, referrer)
);

-- Daily country rollup per workspace
-- Aggregates clicks by country per workspace per day
CREATE TABLE IF NOT EXISTS rollup_country_daily (
  workspace_id TEXT NOT NULL,
  date TEXT NOT NULL,                                 -- YYYY-MM-DD format
  country TEXT NOT NULL,                              -- ISO country code or 'unknown'
  total_clicks INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, date, country)
);

-- Daily device type rollup per workspace
-- Aggregates clicks by device type per workspace per day
CREATE TABLE IF NOT EXISTS rollup_device_daily (
  workspace_id TEXT NOT NULL,
  date TEXT NOT NULL,                                 -- YYYY-MM-DD format
  device_type TEXT NOT NULL,                          -- mobile | tablet | desktop | unknown
  total_clicks INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, date, device_type)
);

-- Index for efficient date range queries on rollups
CREATE INDEX IF NOT EXISTS idx_rollup_workspace_date ON rollup_daily_workspace(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_rollup_link_date ON rollup_daily_link(link_id, date);
CREATE INDEX IF NOT EXISTS idx_rollup_referrer_ws_date ON rollup_referrer_daily(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_rollup_country_ws_date ON rollup_country_daily(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_rollup_device_ws_date ON rollup_device_daily(workspace_id, date);

-- ============================================
-- DOWN MIGRATION (ROLLBACK)
-- ============================================
-- To rollback, execute the following statements:
--
-- DROP INDEX IF EXISTS idx_rollup_device_ws_date;
-- DROP INDEX IF EXISTS idx_rollup_country_ws_date;
-- DROP INDEX IF EXISTS idx_rollup_referrer_ws_date;
-- DROP INDEX IF EXISTS idx_rollup_link_date;
-- DROP INDEX IF EXISTS idx_rollup_workspace_date;
-- DROP TABLE IF EXISTS rollup_device_daily;
-- DROP TABLE IF EXISTS rollup_country_daily;
-- DROP TABLE IF EXISTS rollup_referrer_daily;
-- DROP TABLE IF EXISTS rollup_daily_link;
-- DROP TABLE IF EXISTS rollup_daily_workspace;
-- DROP TABLE IF EXISTS aggregation_state;
