-- Migration: 0002_links
-- Description: Links table for redirect engine (M01)
-- Date: 2026-02-25
-- Author: Bulma 🔧

-- ============================================
-- UP MIGRATION
-- ============================================

-- Links table
-- Stores shortened URLs with their destinations
-- (domain_id, slug) is unique per SYSTEM_INVARIANTS #6
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(domain_id, slug)
);

-- Index for workspace queries (list links by workspace)
CREATE INDEX IF NOT EXISTS idx_links_workspace ON links(workspace_id);

-- Index for domain lookups (resolution path)
CREATE INDEX IF NOT EXISTS idx_links_domain ON links(domain_id);

-- Index for resolution: domain_id + slug lookup
CREATE INDEX IF NOT EXISTS idx_links_domain_slug ON links(domain_id, slug);

-- ============================================
-- DOWN MIGRATION (ROLLBACK)
-- ============================================
-- To rollback, execute the following statements:
--
-- DROP INDEX IF EXISTS idx_links_domain_slug;
-- DROP INDEX IF EXISTS idx_links_domain;
-- DROP INDEX IF EXISTS idx_links_workspace;
-- DROP TABLE IF EXISTS links;
