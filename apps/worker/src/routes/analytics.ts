/**
 * Analytics API Routes
 * All endpoints query rollup tables only (never raw_clicks)
 * 
 * INVARIANT #11: Analytics never reads DO counters
 * INVARIANT #15: Analytics derived from rollups (which come from raw_clicks)
 */

import { Hono } from 'hono';
import { success, error } from '@torium/shared';
import { sessionMiddleware } from '../middleware/session';
import type { Env } from '../lib/env';

export const analytics = new Hono<{ Bindings: Env }>();

// Apply session middleware to all routes
analytics.use('*', sessionMiddleware);

// Valid range options
type RangeOption = '7d' | '30d' | '90d' | 'all';

// Max range by plan type (in days)
const MAX_RANGE_DAYS: Record<'free' | 'pro', number> = {
  free: 30,
  pro: 24 * 30, // 24 months
};

/**
 * Parse and validate range parameter
 * Returns start date ISO string or null for 'all'
 */
function parseRange(
  range: string | undefined,
  planType: 'free' | 'pro'
): { startDate: string | null; error?: string } {
  const validRanges: RangeOption[] = ['7d', '30d', '90d', 'all'];
  const rangeValue = (range || '7d') as RangeOption;

  if (!validRanges.includes(rangeValue)) {
    return { startDate: null, error: `Invalid range. Must be one of: ${validRanges.join(', ')}` };
  }

  const maxDays = MAX_RANGE_DAYS[planType];

  // Map range to days
  const rangeDays: Record<RangeOption, number | null> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    'all': null,
  };

  const days = rangeDays[rangeValue];

  // Check plan limits
  if (days !== null && days > maxDays) {
    return {
      startDate: null,
      error: `Range ${rangeValue} exceeds your plan limit of ${maxDays} days. Upgrade to Pro for longer history.`,
    };
  }

  if (rangeValue === 'all') {
    // For 'all', still respect plan limits
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - maxDays);
    return { startDate: limitDate.toISOString().substring(0, 10) };
  }

  // Calculate start date
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days!);
  return { startDate: startDate.toISOString().substring(0, 10) };
}

/**
 * GET /api/v1/analytics/overview
 * Returns total clicks and daily trend for the workspace
 */
analytics.get('/overview', async (c) => {
  const session = c.get('session');
  const workspaceId = session.workspace.id;
  const planType = session.workspace.plan_type;
  const range = c.req.query('range');

  const { startDate, error: rangeError } = parseRange(range, planType);
  if (rangeError) {
    return c.json(error('VALIDATION_ERROR', rangeError), 400);
  }

  // Get total clicks
  const totalResult = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(total_clicks), 0) as total
    FROM rollup_daily_workspace
    WHERE workspace_id = ? AND date >= ?
  `)
    .bind(workspaceId, startDate)
    .first<{ total: number }>();

  // Get daily trend (last 30 days max for chart)
  const trendStartDate = new Date();
  trendStartDate.setDate(trendStartDate.getDate() - 30);
  const trendStart = trendStartDate.toISOString().substring(0, 10);

  const trend = await c.env.DB.prepare(`
    SELECT date, total_clicks
    FROM rollup_daily_workspace
    WHERE workspace_id = ? AND date >= ?
    ORDER BY date ASC
  `)
    .bind(workspaceId, startDate! > trendStart ? startDate : trendStart)
    .all<{ date: string; total_clicks: number }>();

  return c.json(
    success({
      total_clicks: totalResult?.total || 0,
      daily_trend: trend.results || [],
    })
  );
});

/**
 * GET /api/v1/analytics/links
 * Returns click stats per link
 */
analytics.get('/links', async (c) => {
  const session = c.get('session');
  const workspaceId = session.workspace.id;
  const planType = session.workspace.plan_type;
  const range = c.req.query('range');

  const { startDate, error: rangeError } = parseRange(range, planType);
  if (rangeError) {
    return c.json(error('VALIDATION_ERROR', rangeError), 400);
  }

  // Get clicks per link with link details
  const result = await c.env.DB.prepare(`
    SELECT 
      l.id,
      l.slug,
      l.destination_url,
      COALESCE(SUM(r.total_clicks), 0) as total_clicks
    FROM links l
    LEFT JOIN rollup_daily_link r ON l.id = r.link_id AND r.date >= ?
    WHERE l.workspace_id = ?
    GROUP BY l.id
    ORDER BY total_clicks DESC
    LIMIT 100
  `)
    .bind(startDate, workspaceId)
    .all<{ id: string; slug: string; destination_url: string; total_clicks: number }>();

  return c.json(success(result.results || []));
});

/**
 * GET /api/v1/analytics/referrers
 * Returns click stats by referrer source
 */
analytics.get('/referrers', async (c) => {
  const session = c.get('session');
  const workspaceId = session.workspace.id;
  const planType = session.workspace.plan_type;
  const range = c.req.query('range');

  const { startDate, error: rangeError } = parseRange(range, planType);
  if (rangeError) {
    return c.json(error('VALIDATION_ERROR', rangeError), 400);
  }

  const result = await c.env.DB.prepare(`
    SELECT 
      referrer,
      SUM(total_clicks) as total_clicks
    FROM rollup_referrer_daily
    WHERE workspace_id = ? AND date >= ?
    GROUP BY referrer
    ORDER BY total_clicks DESC
    LIMIT 50
  `)
    .bind(workspaceId, startDate)
    .all<{ referrer: string; total_clicks: number }>();

  return c.json(success(result.results || []));
});

/**
 * GET /api/v1/analytics/countries
 * Returns click stats by country
 */
analytics.get('/countries', async (c) => {
  const session = c.get('session');
  const workspaceId = session.workspace.id;
  const planType = session.workspace.plan_type;
  const range = c.req.query('range');

  const { startDate, error: rangeError } = parseRange(range, planType);
  if (rangeError) {
    return c.json(error('VALIDATION_ERROR', rangeError), 400);
  }

  const result = await c.env.DB.prepare(`
    SELECT 
      country,
      SUM(total_clicks) as total_clicks
    FROM rollup_country_daily
    WHERE workspace_id = ? AND date >= ?
    GROUP BY country
    ORDER BY total_clicks DESC
    LIMIT 50
  `)
    .bind(workspaceId, startDate)
    .all<{ country: string; total_clicks: number }>();

  return c.json(success(result.results || []));
});

/**
 * GET /api/v1/analytics/devices
 * Returns click stats by device type
 */
analytics.get('/devices', async (c) => {
  const session = c.get('session');
  const workspaceId = session.workspace.id;
  const planType = session.workspace.plan_type;
  const range = c.req.query('range');

  const { startDate, error: rangeError } = parseRange(range, planType);
  if (rangeError) {
    return c.json(error('VALIDATION_ERROR', rangeError), 400);
  }

  const result = await c.env.DB.prepare(`
    SELECT 
      device_type,
      SUM(total_clicks) as total_clicks
    FROM rollup_device_daily
    WHERE workspace_id = ? AND date >= ?
    GROUP BY device_type
    ORDER BY total_clicks DESC
  `)
    .bind(workspaceId, startDate)
    .all<{ device_type: string; total_clicks: number }>();

  return c.json(success(result.results || []));
});
