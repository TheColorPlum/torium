/**
 * Link entity type
 * Source of truth: D1 `links` table
 */

/**
 * Link status
 * - active: redirects work
 * - paused: returns 404
 */
export type LinkStatus = 'active' | 'paused';

/**
 * Link entity
 */
export interface Link {
  id: string;
  workspace_id: string;
  domain_id: string;
  slug: string;
  destination_url: string;
  status: LinkStatus;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * Link row from D1 (status as string before type narrowing)
 */
export interface LinkRow {
  id: string;
  workspace_id: string;
  domain_id: string;
  slug: string;
  destination_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new link
 */
export interface CreateLinkInput {
  destination_url: string;
  slug?: string; // Optional - will generate random if omitted
  domain_id?: string; // Optional - uses platform domain if omitted
}

/**
 * Input for updating an existing link
 */
export interface UpdateLinkInput {
  destination_url?: string;
  slug?: string;
  status?: LinkStatus;
}

/**
 * Convert LinkRow to Link with proper typing
 */
export function toLinkEntity(row: LinkRow): Link {
  return {
    ...row,
    status: row.status as LinkStatus,
  };
}
