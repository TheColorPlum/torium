/**
 * Domain entity type
 * Source of truth: D1 `domains` table
 */
export interface Domain {
  id: string;
  workspace_id: string | null; // null = platform domain (torium.app)
  hostname: string;
  status: DomainStatus;
  created_at: string; // ISO 8601 timestamp
}

/**
 * Domain verification status
 */
export type DomainStatus = 'pending' | 'verified' | 'failed';

/**
 * Domain row from D1
 */
export interface DomainRow {
  id: string;
  workspace_id: string | null;
  hostname: string;
  status: string;
  created_at: string;
}
