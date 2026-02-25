/**
 * Redirect Route Handler
 * GET /:slug - Resolves and redirects to destination
 * 
 * Per SYSTEM_INVARIANTS:
 * - #1: Redirects must never break due to billing/analytics failures
 * - #2: Redirect requests must never synchronously write to D1
 * - #3: Redirects must be HTTP 302 with Cache-Control: no-store
 * - #7: DO counters are authoritative for usage
 * - #8: Free cap = tracking stops, redirect continues
 * - #9: Free month counters and Pro period counters are separate state
 * - #12: Queue ingestion is best-effort; enqueue failures must not impact redirect
 * 
 * Per SYSTEM_CONTRACT:
 * - Bot traffic excluded from billing (skip DO increment for suspected bots)
 */

import { Hono } from 'hono';
import { error } from '@torium/shared';
import type { ClickEvent } from '@torium/shared';
import { resolveLink } from '../lib/resolve';
import { generateClickId, hashIp, isBotSuspected } from '../lib/clicks';
import { getWorkspacePlan } from '../lib/plan';
import { FREE_MONTHLY_CAP } from '../lib/constants';
import type { Env } from '../lib/env';

export const redirect = new Hono<{ Bindings: Env }>();

// Add middleware to set Cache-Control on all redirect responses
redirect.use('/:slug', async (c, next) => {
  await next();
  // Set Cache-Control: no-store per SYSTEM_INVARIANTS #3
  c.header('Cache-Control', 'no-store');
});

/**
 * GET /:slug - Redirect handler
 * Resolves the slug for the request hostname and redirects
 */
redirect.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  
  // Extract hostname from request
  const url = new URL(c.req.url);
  const hostname = url.hostname;

  // Resolve the link
  const result = await resolveLink(c.env.DB, hostname, slug);

  if (!result) {
    // Link not found, domain not verified, or link paused → 404
    return c.json(error('NOT_FOUND', 'Link not found'), 404);
  }

  // Collect request data upfront for the async tracking
  const tsMs = Date.now();
  const ts = new Date(tsMs).toISOString();
  const userAgent = c.req.header('User-Agent');
  const referrer = c.req.header('Referer');
  const cfRay = c.req.header('CF-Ray');
  const cfProps = (c.req.raw as Request & { cf?: Record<string, unknown> }).cf || {};
  const country = cfProps.country as string | undefined;
  const region = cfProps.region as string | undefined;
  const city = cfProps.city as string | undefined;
  const clientIp = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim();

  // All tracking/counting is async via waitUntil - NEVER blocks redirect
  // Per SYSTEM_INVARIANTS #1, #12: failures must not impact redirect
  c.executionCtx.waitUntil(
    (async () => {
      try {
        // 0. Check for bot traffic FIRST - skip DO increment entirely for bots
        // Per SYSTEM_CONTRACT: Bot traffic excluded from billing
        const isBot = isBotSuspected(userAgent);
        
        if (isBot) {
          // Bot traffic: do not count toward usage, do not enqueue analytics
          // This prevents bots from inflating usage metrics and billing
          console.log(`Bot detected for ${hostname}/${slug}, skipping tracking`);
          return;
        }

        // 1. Get workspace plan (cached, 60s TTL)
        const plan = await getWorkspacePlan(c.env.DB, result.workspace_id);

        // 2. Get DO stub for workspace counter
        const counterId = c.env.WORKSPACE_COUNTER.idFromName(result.workspace_id);
        const counterStub = c.env.WORKSPACE_COUNTER.get(counterId);

        // 3. Check cap and potentially increment based on plan
        let shouldEnqueue = false;

        if (plan === 'free') {
          // Per SYSTEM_INVARIANTS #8, #9: Free cap = tracking stops, uses free_tracked_clicks
          const response = await counterStub.fetch(
            new Request('http://do/incrementFreeIfUnderCap', {
              method: 'POST',
              body: JSON.stringify({ cap: FREE_MONTHLY_CAP }),
              headers: { 'Content-Type': 'application/json' },
            })
          );
          const data = await response.json() as { incremented: boolean };
          shouldEnqueue = data.incremented;
        } else {
          // Pro tier: unlimited tracking, uses pro_tracked_clicks
          // Per SYSTEM_INVARIANTS #9: Pro period counters are separate from free
          await counterStub.fetch(
            new Request('http://do/incrementPro', {
              method: 'POST',
            })
          );
          shouldEnqueue = true;
        }

        // 4. Only enqueue if under cap (or Pro)
        if (shouldEnqueue) {
          const clickId = await generateClickId(result.link_id, tsMs, cfRay, userAgent);
          const ipHash = clientIp ? await hashIp(clientIp) : undefined;

          const clickEvent: ClickEvent = {
            click_id: clickId,
            ts,
            workspace_id: result.workspace_id,
            link_id: result.link_id,
            domain: hostname,
            slug: result.slug,
            destination_url: result.destination_url,
            referrer,
            user_agent: userAgent,
            ip_hash: ipHash,
            country,
            region,
            city,
          };

          await c.env.CLICKS_QUEUE.send(clickEvent);
        }
      } catch (err) {
        // Log but NEVER fail the redirect
        // Per SYSTEM_INVARIANTS #1, #12
        console.error('Failed to track click:', err);
      }
    })()
  );

  // Per SYSTEM_INVARIANTS #3: HTTP 302 with Cache-Control: no-store
  // Redirect ALWAYS succeeds regardless of cap or tracking status
  return c.redirect(result.destination_url, 302);
});
