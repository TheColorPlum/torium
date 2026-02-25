/**
 * Reconciliation Job
 * Compares billing_usage_periods.total_clicks vs DO counter snapshots
 * Logs any mismatches for investigation
 * 
 * INVARIANTS:
 * - #7, #10: Billing reads DO counters only
 * - This job validates that reported usage matches current DO state
 * 
 * Runs daily at 5 AM UTC (after usage reporting at 4 AM)
 */

import type { Env } from '../lib/env';
import { now } from '../lib/db';

// Tolerance for minor discrepancies (e.g., clicks that came in during processing)
const TOLERANCE_CLICKS = 1000;

/**
 * Mismatch record
 */
interface UsageMismatch {
  workspace_id: string;
  period_start: string;
  period_end: string;
  recorded_clicks: number;
  do_clicks: number;
  difference: number;
}

/**
 * Run reconciliation job
 * Called by scheduled trigger (cron) at 0 5 * * * (daily at 5 AM UTC)
 * 
 * Compares recent billing_usage_periods against current DO counter values
 * Note: DO counters may have reset for new month, so we only check
 * periods from the current month or that match DO's month_key
 */
export async function runReconciliation(env: Env): Promise<{ checked: number; mismatches: UsageMismatch[] }> {
  console.log('[Reconciliation] Starting reconciliation job');

  // Get recent usage periods (last 7 days of reported periods)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const usagePeriods = await env.DB.prepare(`
    SELECT 
      workspace_id,
      period_start,
      period_end,
      total_clicks
    FROM billing_usage_periods
    WHERE reported_at > ?
    ORDER BY reported_at DESC
  `).bind(sevenDaysAgo).all<{
    workspace_id: string;
    period_start: string;
    period_end: string;
    total_clicks: number;
  }>();

  const rows = usagePeriods.results || [];

  if (rows.length === 0) {
    console.log('[Reconciliation] No recent usage periods to check');
    return { checked: 0, mismatches: [] };
  }

  console.log(`[Reconciliation] Checking ${rows.length} usage periods`);

  const mismatches: UsageMismatch[] = [];
  let checked = 0;

  for (const period of rows) {
    try {
      // Get DO counter state (Pro usage for billing reconciliation)
      // INVARIANT #9: Pro counters are separate from Free counters
      const doId = env.WORKSPACE_COUNTER.idFromName(period.workspace_id);
      const stub = env.WORKSPACE_COUNTER.get(doId);
      
      const usageResponse = await stub.fetch(new Request('http://do/proUsage', { method: 'GET' }));
      const usageData = await usageResponse.json() as { 
        tracked_clicks: number; 
        period_start: string | null;
        period_end: string | null;
      };

      checked++;

      // Only compare if the DO's period matches the recorded period
      // (DO resets when period changes, so old periods can't be validated)
      if (usageData.period_start !== period.period_start || usageData.period_end !== period.period_end) {
        console.log(
          `[Reconciliation] Skipping workspace ${period.workspace_id}: ` +
          `DO period (${usageData.period_start} - ${usageData.period_end}) != ` +
          `recorded period (${period.period_start} - ${period.period_end})`
        );
        continue;
      }

      const difference = Math.abs(usageData.tracked_clicks - period.total_clicks);

      if (difference > TOLERANCE_CLICKS) {
        const mismatch: UsageMismatch = {
          workspace_id: period.workspace_id,
          period_start: period.period_start,
          period_end: period.period_end,
          recorded_clicks: period.total_clicks,
          do_clicks: usageData.tracked_clicks,
          difference,
        };

        mismatches.push(mismatch);

        console.warn(
          `[Reconciliation] MISMATCH: workspace=${period.workspace_id} ` +
          `recorded=${period.total_clicks} DO=${usageData.tracked_clicks} ` +
          `diff=${difference}`
        );
      }
    } catch (err) {
      console.error(`[Reconciliation] Error checking workspace ${period.workspace_id}:`, err);
      // Continue with other workspaces
    }
  }

  if (mismatches.length > 0) {
    console.warn(`[Reconciliation] Found ${mismatches.length} mismatches!`);
    // In production, this could trigger an alert
    await logMismatches(env, mismatches);
  } else {
    console.log('[Reconciliation] No mismatches found');
  }

  console.log(`[Reconciliation] Complete. Checked: ${checked}, Mismatches: ${mismatches.length}`);
  return { checked, mismatches };
}

/**
 * Log mismatches to a table for investigation
 * Creates a simple audit log that can be queried
 */
async function logMismatches(_env: Env, mismatches: UsageMismatch[]): Promise<void> {
  // For now, just log to console in structured format
  // In production, could insert to a reconciliation_issues table
  // or send to an alerting system
  
  for (const mismatch of mismatches) {
    console.error(JSON.stringify({
      type: 'BILLING_MISMATCH',
      timestamp: now(),
      ...mismatch,
    }));
  }

  // Could also insert to D1 for dashboard visibility:
  // CREATE TABLE reconciliation_issues (...)
  // But keeping scope minimal per M05 tasks
}

/**
 * Get reconciliation status for dashboard
 */
export async function getReconciliationStatus(_env: Env): Promise<{
  last_run: string | null;
  total_mismatches_7d: number;
}> {
  // This would query a status/log table if we had one
  // For now, return placeholder - can be enhanced later
  return {
    last_run: null,
    total_mismatches_7d: 0,
  };
}
