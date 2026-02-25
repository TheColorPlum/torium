/**
 * Link Resolution Algorithm
 * Per SYSTEM_INVARIANTS #4: hostname → domain_id → (domain_id, slug) → link → destination
 * D1-only resolution - NO KV, NO DO
 */

import type { LinkStatus } from '@torium/shared';

/**
 * Result of successful link resolution
 */
export interface ResolveResult {
  workspace_id: string;
  link_id: string;
  domain_id: string;
  slug: string;
  destination_url: string;
}

/**
 * Resolve a link from hostname and slug
 * Returns null if:
 * - Domain not found or not verified
 * - Link not found
 * - Link is paused
 * 
 * Per SYSTEM_INVARIANTS:
 * - #4: Deterministic resolution path
 * - #5: Hostname must match verified domain
 * - #6: Links identified by (domain_id, slug)
 */
export async function resolveLink(
  db: D1Database,
  hostname: string,
  slug: string
): Promise<ResolveResult | null> {
  // Step 1: Normalize hostname (lowercase)
  const normalizedHostname = hostname.toLowerCase();
  const normalizedSlug = slug.toLowerCase();

  // Step 2: Lookup domain_id from domains WHERE hostname = ? AND status = 'verified'
  const domainResult = await db
    .prepare(`SELECT id FROM domains WHERE hostname = ? AND status = 'verified'`)
    .bind(normalizedHostname)
    .first<{ id: string }>();

  if (!domainResult) {
    // Domain not found or not verified → 404
    return null;
  }

  const domainId = domainResult.id;

  // Step 3: Query link by (domain_id, slug)
  const linkResult = await db
    .prepare(`
      SELECT id, workspace_id, domain_id, slug, destination_url, status
      FROM links
      WHERE domain_id = ? AND slug = ?
    `)
    .bind(domainId, normalizedSlug)
    .first<{
      id: string;
      workspace_id: string;
      domain_id: string;
      slug: string;
      destination_url: string;
      status: string;
    }>();

  if (!linkResult) {
    // Link not found → 404
    return null;
  }

  // Step 4: Check link status
  if ((linkResult.status as LinkStatus) === 'paused') {
    // Paused links → 404
    return null;
  }

  // Step 5: Return resolution result
  return {
    workspace_id: linkResult.workspace_id,
    link_id: linkResult.id,
    domain_id: linkResult.domain_id,
    slug: linkResult.slug,
    destination_url: linkResult.destination_url,
  };
}
