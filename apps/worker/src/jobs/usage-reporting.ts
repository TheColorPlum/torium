/**
 * Usage Reporting Job
 * Reports usage overage to Stripe at end of billing period
 * 
 * INVARIANTS:
 * - #7, #10: Billing reads DO counters only
 * - SYSTEM_CONTRACT: included=2M clicks, overage=$1/100k
 * - Idempotent: skips if period already reported
 */

import type { Env } from '../lib/env';
import { generateId, now } from '../lib/db';
import { createOverageInvoiceItem } from '../lib/stripe';

// Pricing constants per SYSTEM_CONTRACT
const INCLUDED_CLICKS = 2_000_000; // 2 million clicks included
const OVERAGE_UNIT_CLICKS = 100_000; // Per 100k clicks
const OVERAGE_UNIT_CENTS = 100; // $1 = 100 cents per 100k

/**
 * Workspace with billing info
 */
interface BillableWorkspace {
  id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  current_period_start: string;
  current_period_end: string;
}

/**
 * Run usage reporting job
 * Called by scheduled trigger (cron) at 0 4 * * * (daily at 4 AM UTC)
 * 
 * For each Pro workspace where period has ended:
 * 1. Read DO counter for the period
 * 2. Calculate overage (clicks > 2M)
 * 3. Create Stripe invoice item if overage > 0
 * 4. Record in billing_usage_periods
 */
export async function runUsageReporting(env: Env): Promise<{ processed: number; billed: number }> {
  console.log('[UsageReporting] Starting usage reporting job');

  const currentTime = now();

  // Find Pro workspaces with ended billing periods that haven't been reported
  const workspaces = await env.DB.prepare(`
    SELECT 
      w.id,
      w.stripe_customer_id,
      w.stripe_subscription_id,
      w.current_period_start,
      w.current_period_end
    FROM workspaces w
    WHERE w.plan_type = 'pro'
      AND w.billing_status = 'active'
      AND w.stripe_customer_id IS NOT NULL
      AND w.stripe_subscription_id IS NOT NULL
      AND w.current_period_end IS NOT NULL
      AND w.current_period_end < ?
      AND NOT EXISTS (
        SELECT 1 FROM billing_usage_periods bup
        WHERE bup.workspace_id = w.id
          AND bup.period_start = w.current_period_start
          AND bup.period_end = w.current_period_end
      )
  `).bind(currentTime).all<BillableWorkspace>();

  const rows = workspaces.results || [];

  if (rows.length === 0) {
    console.log('[UsageReporting] No workspaces with ended periods to process');
    return { processed: 0, billed: 0 };
  }

  console.log(`[UsageReporting] Processing ${rows.length} workspaces`);

  let processed = 0;
  let billed = 0;

  for (const workspace of rows) {
    try {
      const result = await processWorkspaceUsage(env, workspace);
      processed++;
      if (result.billed) {
        billed++;
      }
    } catch (err) {
      console.error(`[UsageReporting] Error processing workspace ${workspace.id}:`, err);
      // Continue with other workspaces
    }
  }

  console.log(`[UsageReporting] Complete. Processed: ${processed}, Billed: ${billed}`);
  return { processed, billed };
}

/**
 * Process usage for a single workspace
 */
async function processWorkspaceUsage(
  env: Env,
  workspace: BillableWorkspace
): Promise<{ billed: boolean }> {
  console.log(`[UsageReporting] Processing workspace ${workspace.id}`);

  // Get click count from DO counter (Pro usage, not Free)
  // INVARIANT #7, #10: Billing reads DO counters only
  // INVARIANT #9: Pro counters are separate from Free counters
  const doId = env.WORKSPACE_COUNTER.idFromName(workspace.id);
  const stub = env.WORKSPACE_COUNTER.get(doId);
  
  const usageResponse = await stub.fetch(new Request('http://do/proUsage', { method: 'GET' }));
  const usageData = await usageResponse.json() as { 
    tracked_clicks: number; 
    period_start: string | null; 
    period_end: string | null;
  };

  const totalClicks = usageData.tracked_clicks;
  console.log(`[UsageReporting] Workspace ${workspace.id} has ${totalClicks} clicks`);

  // Calculate overage
  const overageClicks = Math.max(0, totalClicks - INCLUDED_CLICKS);
  const overageUnits = Math.ceil(overageClicks / OVERAGE_UNIT_CLICKS);
  const overageAmountCents = overageUnits * OVERAGE_UNIT_CENTS;

  // Format period dates for display
  const periodStart = workspace.current_period_start.substring(0, 10);
  const periodEnd = workspace.current_period_end.substring(0, 10);

  let stripeInvoiceItemId: string | null = null;

  // Create Stripe invoice item if overage exists
  if (overageClicks > 0) {
    console.log(`[UsageReporting] Workspace ${workspace.id} has ${overageClicks} overage clicks ($${overageAmountCents / 100})`);

    const invoiceResult = await createOverageInvoiceItem(
      env.STRIPE_SECRET_KEY,
      workspace.stripe_customer_id,
      workspace.stripe_subscription_id,
      overageClicks,
      periodStart,
      periodEnd
    );

    if (!invoiceResult.success) {
      console.error(`[UsageReporting] Failed to create invoice item for workspace ${workspace.id}:`, invoiceResult.error);
      throw new Error(`Stripe invoice item creation failed: ${invoiceResult.error.message}`);
    }

    stripeInvoiceItemId = invoiceResult.data.id;
    console.log(`[UsageReporting] Created invoice item ${stripeInvoiceItemId} for workspace ${workspace.id}`);
  }

  // Record usage period (even if no overage, for audit trail)
  const usagePeriodId = generateId('bup');
  await env.DB.prepare(`
    INSERT INTO billing_usage_periods (
      id, workspace_id, period_start, period_end,
      total_clicks, included_clicks, overage_clicks, overage_amount_cents,
      stripe_invoice_item_id, reported_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    usagePeriodId,
    workspace.id,
    workspace.current_period_start,
    workspace.current_period_end,
    totalClicks,
    INCLUDED_CLICKS,
    overageClicks,
    overageAmountCents,
    stripeInvoiceItemId,
    now()
  ).run();

  console.log(`[UsageReporting] Recorded usage period ${usagePeriodId} for workspace ${workspace.id}`);

  return { billed: overageClicks > 0 };
}

/**
 * Get usage summary for a workspace (for dashboard display)
 */
export async function getUsageSummary(
  env: Env,
  workspaceId: string
): Promise<{
  current_clicks: number;
  included_clicks: number;
  overage_clicks: number;
  overage_amount_cents: number;
  period_start: string | null;
  period_end: string | null;
}> {
  // Get current period from workspace
  const workspace = await env.DB.prepare(`
    SELECT current_period_start, current_period_end, plan_type
    FROM workspaces WHERE id = ?
  `).bind(workspaceId).first<{
    current_period_start: string | null;
    current_period_end: string | null;
    plan_type: string;
  }>();

  if (!workspace || workspace.plan_type !== 'pro') {
    return {
      current_clicks: 0,
      included_clicks: INCLUDED_CLICKS,
      overage_clicks: 0,
      overage_amount_cents: 0,
      period_start: null,
      period_end: null,
    };
  }

  // Get current click count from DO (Pro usage for Pro workspaces)
  // INVARIANT #9: Pro counters are separate from Free counters
  const doId = env.WORKSPACE_COUNTER.idFromName(workspaceId);
  const stub = env.WORKSPACE_COUNTER.get(doId);
  
  const usageResponse = await stub.fetch(new Request('http://do/proUsage', { method: 'GET' }));
  const usageData = await usageResponse.json() as { tracked_clicks: number };

  const currentClicks = usageData.tracked_clicks;
  const overageClicks = Math.max(0, currentClicks - INCLUDED_CLICKS);
  const overageUnits = Math.ceil(overageClicks / OVERAGE_UNIT_CLICKS);
  const overageAmountCents = overageUnits * OVERAGE_UNIT_CENTS;

  return {
    current_clicks: currentClicks,
    included_clicks: INCLUDED_CLICKS,
    overage_clicks: overageClicks,
    overage_amount_cents: overageAmountCents,
    period_start: workspace.current_period_start,
    period_end: workspace.current_period_end,
  };
}
