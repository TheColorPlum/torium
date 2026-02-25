-- Migration: 0005_billing
-- Description: Stripe billing columns and tables (M05)
-- Date: 2026-02-25
-- Author: Bulma 🔧

-- ============================================
-- UP MIGRATION
-- ============================================

-- Add billing columns to workspaces table
ALTER TABLE workspaces ADD COLUMN stripe_customer_id TEXT DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN stripe_subscription_id TEXT DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN stripe_price_id TEXT DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN current_period_start TEXT DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN current_period_end TEXT DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN billing_status TEXT DEFAULT 'none' CHECK (billing_status IN ('none', 'active', 'past_due', 'cancelled'));

-- Index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_stripe_customer ON workspaces(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_stripe_subscription ON workspaces(stripe_subscription_id);

-- Processed webhook events table (for idempotency)
-- INVARIANT: Webhooks must be idempotent
CREATE TABLE IF NOT EXISTS processed_events (
  id TEXT PRIMARY KEY,  -- Stripe event ID (evt_xxx)
  processed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Billing usage periods table
-- Records reported usage for each billing period
-- INVARIANT: Billing reads DO counters only (#7, #10)
CREATE TABLE IF NOT EXISTS billing_usage_periods (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  period_start TEXT NOT NULL,      -- ISO 8601
  period_end TEXT NOT NULL,        -- ISO 8601
  total_clicks INTEGER NOT NULL,   -- From DO counter snapshot
  included_clicks INTEGER NOT NULL DEFAULT 2000000,  -- 2M per SYSTEM_CONTRACT
  overage_clicks INTEGER NOT NULL DEFAULT 0,
  overage_amount_cents INTEGER NOT NULL DEFAULT 0,   -- Calculated: ceil(overage/100000) * 100
  stripe_invoice_item_id TEXT DEFAULT NULL,          -- If overage was billed
  reported_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(workspace_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_billing_usage_workspace ON billing_usage_periods(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_usage_period ON billing_usage_periods(period_start, period_end);

-- ============================================
-- DOWN MIGRATION (ROLLBACK)
-- ============================================
-- To rollback, execute the following statements:
--
-- DROP INDEX IF EXISTS idx_billing_usage_period;
-- DROP INDEX IF EXISTS idx_billing_usage_workspace;
-- DROP TABLE IF EXISTS billing_usage_periods;
--
-- DROP TABLE IF EXISTS processed_events;
--
-- DROP INDEX IF EXISTS idx_workspaces_stripe_subscription;
-- DROP INDEX IF EXISTS idx_workspaces_stripe_customer;
--
-- -- Note: SQLite doesn't support DROP COLUMN directly
-- -- To remove columns, you'd need to recreate the table:
-- 
-- CREATE TABLE workspaces_new (
--   id TEXT PRIMARY KEY,
--   name TEXT NOT NULL,
--   plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro')),
--   created_at TEXT NOT NULL DEFAULT (datetime('now'))
-- );
-- INSERT INTO workspaces_new SELECT id, name, plan_type, created_at FROM workspaces;
-- DROP TABLE workspaces;
-- ALTER TABLE workspaces_new RENAME TO workspaces;
