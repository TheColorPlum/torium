/**
 * Aggregation Job
 * Processes raw_clicks and creates rollup tables
 * 
 * INVARIANT #15: Rollups derived from raw_clicks only
 * INVARIANT #11: Analytics never reads DO counters
 * 
 * This job is idempotent - re-running won't double-count clicks.
 * It tracks the last processed timestamp in aggregation_state.
 */

import type { Env } from '../lib/env';
import { now } from '../lib/db';

// Batch size for processing raw clicks
const BATCH_SIZE = 1000;

/**
 * Row from raw_clicks table
 */
interface RawClick {
  id: string;
  ts: string;
  workspace_id: string;
  link_id: string;
  referrer: string | null;
  country: string | null;
  device_type: string | null;
}

/**
 * Run aggregation job
 * Called by scheduled trigger (cron)
 */
export async function runAggregation(env: Env): Promise<{ processed: number; newHighWaterMark: string }> {
  console.log('[Aggregation] Starting aggregation job');

  // Get last processed timestamp
  const state = await env.DB.prepare(
    'SELECT last_processed_ts FROM aggregation_state WHERE id = 1'
  ).first<{ last_processed_ts: string }>();

  const lastProcessedTs = state?.last_processed_ts || '1970-01-01T00:00:00.000Z';
  console.log(`[Aggregation] Last processed: ${lastProcessedTs}`);

  // Fetch batch of unprocessed clicks
  const clicks = await env.DB.prepare(`
    SELECT id, ts, workspace_id, link_id, referrer, country, device_type
    FROM raw_clicks
    WHERE ts > ?
    ORDER BY ts ASC
    LIMIT ?
  `)
    .bind(lastProcessedTs, BATCH_SIZE)
    .all<RawClick>();

  const rows = clicks.results || [];

  if (rows.length === 0) {
    console.log('[Aggregation] No new clicks to process');
    return { processed: 0, newHighWaterMark: lastProcessedTs };
  }

  console.log(`[Aggregation] Processing ${rows.length} clicks`);

  // Group clicks for aggregation
  const workspaceDayMap = new Map<string, number>();
  const linkDayMap = new Map<string, number>();
  const referrerMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();

  let maxTs = lastProcessedTs;

  for (const click of rows) {
    const date = click.ts.substring(0, 10); // Extract YYYY-MM-DD
    
    // Track max timestamp
    if (click.ts > maxTs) {
      maxTs = click.ts;
    }

    // Workspace daily aggregation
    const wsKey = `${click.workspace_id}|${date}`;
    workspaceDayMap.set(wsKey, (workspaceDayMap.get(wsKey) || 0) + 1);

    // Link daily aggregation
    const linkKey = `${click.link_id}|${date}`;
    linkDayMap.set(linkKey, (linkDayMap.get(linkKey) || 0) + 1);

    // Referrer aggregation (normalize)
    const referrer = normalizeReferrer(click.referrer);
    const refKey = `${click.workspace_id}|${date}|${referrer}`;
    referrerMap.set(refKey, (referrerMap.get(refKey) || 0) + 1);

    // Country aggregation
    const country = click.country || 'unknown';
    const countryKey = `${click.workspace_id}|${date}|${country}`;
    countryMap.set(countryKey, (countryMap.get(countryKey) || 0) + 1);

    // Device aggregation
    const device = click.device_type || 'unknown';
    const deviceKey = `${click.workspace_id}|${date}|${device}`;
    deviceMap.set(deviceKey, (deviceMap.get(deviceKey) || 0) + 1);
  }

  // Build batch statements
  const statements: D1PreparedStatement[] = [];
  const timestamp = now();

  // Upsert workspace daily rollups
  for (const [key, count] of workspaceDayMap) {
    const [workspaceId, date] = key.split('|');
    statements.push(
      env.DB.prepare(`
        INSERT INTO rollup_daily_workspace (workspace_id, date, total_clicks, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (workspace_id, date) DO UPDATE SET 
          total_clicks = total_clicks + excluded.total_clicks,
          updated_at = excluded.updated_at
      `).bind(workspaceId, date, count, timestamp)
    );
  }

  // Upsert link daily rollups
  for (const [key, count] of linkDayMap) {
    const [linkId, date] = key.split('|');
    statements.push(
      env.DB.prepare(`
        INSERT INTO rollup_daily_link (link_id, date, total_clicks, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (link_id, date) DO UPDATE SET 
          total_clicks = total_clicks + excluded.total_clicks,
          updated_at = excluded.updated_at
      `).bind(linkId, date, count, timestamp)
    );
  }

  // Upsert referrer rollups
  for (const [key, count] of referrerMap) {
    const [workspaceId, date, referrer] = key.split('|');
    statements.push(
      env.DB.prepare(`
        INSERT INTO rollup_referrer_daily (workspace_id, date, referrer, total_clicks, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (workspace_id, date, referrer) DO UPDATE SET 
          total_clicks = total_clicks + excluded.total_clicks,
          updated_at = excluded.updated_at
      `).bind(workspaceId, date, referrer, count, timestamp)
    );
  }

  // Upsert country rollups
  for (const [key, count] of countryMap) {
    const [workspaceId, date, country] = key.split('|');
    statements.push(
      env.DB.prepare(`
        INSERT INTO rollup_country_daily (workspace_id, date, country, total_clicks, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (workspace_id, date, country) DO UPDATE SET 
          total_clicks = total_clicks + excluded.total_clicks,
          updated_at = excluded.updated_at
      `).bind(workspaceId, date, country, count, timestamp)
    );
  }

  // Upsert device rollups
  for (const [key, count] of deviceMap) {
    const [workspaceId, date, device] = key.split('|');
    statements.push(
      env.DB.prepare(`
        INSERT INTO rollup_device_daily (workspace_id, date, device_type, total_clicks, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (workspace_id, date, device_type) DO UPDATE SET 
          total_clicks = total_clicks + excluded.total_clicks,
          updated_at = excluded.updated_at
      `).bind(workspaceId, date, device, count, timestamp)
    );
  }

  // Update aggregation state (last)
  statements.push(
    env.DB.prepare(`
      UPDATE aggregation_state SET last_processed_ts = ?, updated_at = ? WHERE id = 1
    `).bind(maxTs, timestamp)
  );

  // Execute all in batch
  console.log(`[Aggregation] Executing ${statements.length} upsert statements`);
  await env.DB.batch(statements);

  console.log(`[Aggregation] Complete. Processed ${rows.length} clicks, new high water mark: ${maxTs}`);

  return { processed: rows.length, newHighWaterMark: maxTs };
}

/**
 * Normalize referrer to domain or '(direct)'
 */
function normalizeReferrer(referrer: string | null): string {
  if (!referrer || referrer.trim() === '') {
    return '(direct)';
  }

  try {
    const url = new URL(referrer);
    // Return hostname without www prefix
    return url.hostname.replace(/^www\./, '');
  } catch {
    // Invalid URL, return as-is truncated
    return referrer.substring(0, 100);
  }
}
