/**
 * Session entity type
 * Source of truth: D1 `sessions` table
 */
export interface Session {
  id: string;
  user_id: string;
  workspace_id: string;
  session_token_hash: string;
  expires_at: string; // ISO 8601 timestamp
  created_at: string;
}

/**
 * Session row from D1
 */
export interface SessionRow {
  id: string;
  user_id: string;
  workspace_id: string;
  session_token_hash: string;
  expires_at: string;
  created_at: string;
}

/**
 * Magic link for passwordless auth
 * Source of truth: D1 `magic_links` table
 */
export interface MagicLink {
  id: string;
  email: string;
  token_hash: string;
  expires_at: string; // ISO 8601 timestamp
  created_at: string;
  consumed_at: string | null;
}

/**
 * Magic link row from D1
 */
export interface MagicLinkRow {
  id: string;
  email: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  consumed_at: string | null;
}
