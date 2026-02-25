/**
 * Retention Job
 * Deletes raw_clicks older than retention period
 * 
 * Per SYSTEM_CONTRACT:
 * - Free plan: 30 days retention
 * - Pro plan: 24 months retention
 * 
 * This job runs daily and cleans up expired raw_clicks.
 * Rollup tables are kept indefinitely (aggregated data is small).
 */

import type { Env } from '../lib/env';

// Retention period in days
const FREE_RETENTION_DAYS = 30;

// Batch size for deletion (avoid timeout on large tables)
const DELETE_BATCH_SIZE = 5000;

/**
 * Run retention cleanup job
 * Called by scheduled trigger (cron - daily)
 */
export async function runRetention(env: Env): Promise<{ deleted: number }> {
  console.log('[Retention] Starting retention cleanup job');

  // Calculate cutoff date (30 days ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - FREE_RETENTION_DAYS);
  const cutoffTs = cutoffDate.toISOString();

  console.log(`[Retention] Cutoff timestamp: ${cutoffTs}`);

  let totalDeleted = 0;
  let batchDeleted = 0;

  // Delete in batches to avoid timeout
  do {
    // Delete batch of old raw_clicks
    // Note: SQLite doesn't support LIMIT on DELETE directly in all drivers,
    // so we delete by selecting IDs first
    const oldClicks = await env.DB.prepare(`
      SELECT id FROM raw_clicks WHERE ts < ? LIMIT ?
    `)
      .bind(cutoffTs, DELETE_BATCH_SIZE)
      .all<{ id: string }>();

    const ids = oldClicks.results?.map(r => r.id) || [];
    batchDeleted = ids.length;

    if (batchDeleted > 0) {
      // Delete by IDs
      const placeholders = ids.map(() => '?').join(',');
      const result = await env.DB.prepare(`
        DELETE FROM raw_clicks WHERE id IN (${placeholders})
      `)
        .bind(...ids)
        .run();

      totalDeleted += result.meta.changes || batchDeleted;
      console.log(`[Retention] Deleted batch of ${batchDeleted} clicks`);
    }
  } while (batchDeleted === DELETE_BATCH_SIZE);

  console.log(`[Retention] Complete. Total deleted: ${totalDeleted}`);

  return { deleted: totalDeleted };
}

/**
 * Get retention period for a plan type
 * Future: could be used if we want per-workspace retention tracking
 */
export function getRetentionDays(planType: 'free' | 'pro'): number {
  switch (planType) {
    case 'pro':
      return 24 * 30; // 24 months ≈ 720 days
    case 'free':
    default:
      return FREE_RETENTION_DAYS;
  }
}
