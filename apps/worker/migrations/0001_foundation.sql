-- Migration: 0001_foundation
-- Description: Foundation schema for Torium (M00)
-- Date: 2026-02-25
-- Author: Bulma 🔧

-- ============================================
-- UP MIGRATION
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Workspaces table
-- plan_type defaults to 'free' per SYSTEM_CONTRACT
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Workspace members table (join table with roles)
CREATE TABLE IF NOT EXISTS workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

-- Sessions table (for auth)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Magic links table (for passwordless auth)
CREATE TABLE IF NOT EXISTS magic_links (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  consumed_at TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_links(expires_at);

-- Domains table
-- workspace_id is nullable for platform domains (e.g., torium.app)
CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_domains_workspace ON domains(workspace_id);
CREATE INDEX IF NOT EXISTS idx_domains_hostname ON domains(hostname);

-- Seed default platform domain (torium.app)
-- workspace_id is NULL for platform domains
INSERT OR IGNORE INTO domains (id, workspace_id, hostname, status, created_at)
VALUES ('dom_platform_torium', NULL, 'torium.app', 'verified', datetime('now'));

-- ============================================
-- DOWN MIGRATION (ROLLBACK)
-- ============================================
-- To rollback, execute the following statements:
--
-- DROP INDEX IF EXISTS idx_domains_hostname;
-- DROP INDEX IF EXISTS idx_domains_workspace;
-- DROP TABLE IF EXISTS domains;
--
-- DROP INDEX IF EXISTS idx_magic_links_expires;
-- DROP INDEX IF EXISTS idx_magic_links_email;
-- DROP INDEX IF EXISTS idx_magic_links_token;
-- DROP TABLE IF EXISTS magic_links;
--
-- DROP INDEX IF EXISTS idx_sessions_expires;
-- DROP INDEX IF EXISTS idx_sessions_user;
-- DROP INDEX IF EXISTS idx_sessions_token;
-- DROP TABLE IF EXISTS sessions;
--
-- DROP INDEX IF EXISTS idx_workspace_members_user;
-- DROP INDEX IF EXISTS idx_workspace_members_workspace;
-- DROP TABLE IF EXISTS workspace_members;
--
-- DROP TABLE IF EXISTS workspaces;
--
-- DROP INDEX IF EXISTS idx_users_email;
-- DROP TABLE IF EXISTS users;
