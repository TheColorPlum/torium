/**
 * Click Types
 * Types for click ingestion and raw_clicks table
 */

/**
 * ClickEvent - Queue message payload
 * Sent from redirect handler to queue consumer
 */
export interface ClickEvent {
  /** Deterministic click ID (sha256 hash) */
  click_id: string;
  /** ISO8601 timestamp of click */
  ts: string;
  /** Workspace that owns the link */
  workspace_id: string;
  /** Link that was clicked */
  link_id: string;
  /** Domain hostname at time of click */
  domain: string;
  /** Slug that was resolved */
  slug: string;
  /** Destination URL redirected to */
  destination_url: string;
  /** Referrer header (if present) */
  referrer?: string;
  /** User-Agent header */
  user_agent?: string;
  /** SHA256 hash of IP address (never raw IP) */
  ip_hash?: string;
  /** Country from CF geo headers */
  country?: string;
  /** Region from CF geo headers */
  region?: string;
  /** City from CF geo headers */
  city?: string;
}

/**
 * RawClick - D1 row from raw_clicks table
 */
export interface RawClick {
  id: string;
  ts: string;
  workspace_id: string;
  link_id: string;
  domain: string;
  slug: string;
  destination_url: string | null;
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  device_type: string | null;
  is_bot_suspected: number;
  created_at: string;
}

/**
 * Device type derived from user agent
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';
