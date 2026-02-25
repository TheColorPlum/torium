/**
 * Redirect Route Handler
 * GET /:slug - Resolves and redirects to destination
 * 
 * Per SYSTEM_INVARIANTS:
 * - #1: Redirects must never break due to billing/analytics failures
 * - #2: Redirect requests must never synchronously write to D1
 * - #3: Redirects must be HTTP 302 with Cache-Control: no-store
 * - #12: Queue ingestion is best-effort; enqueue failures must not impact redirect
 */

import { Hono } from 'hono';
import { error } from '@torium/shared';
import type { ClickEvent } from '@torium/shared';
import { resolveLink } from '../lib/resolve';
import { generateClickId, hashIp } from '../lib/clicks';
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

  // Build click event for queue
  // Per SYSTEM_INVARIANTS #12: Best-effort, never block redirect
  const tsMs = Date.now();
  const ts = new Date(tsMs).toISOString();
  
  // Extract request details
  const userAgent = c.req.header('User-Agent');
  const referrer = c.req.header('Referer'); // Note: header is "Referer" (misspelling is standard)
  const cfRay = c.req.header('CF-Ray');
  
  // Extract geo from Cloudflare request properties
  const cfProps = (c.req.raw as Request & { cf?: Record<string, unknown> }).cf || {};
  const country = cfProps.country as string | undefined;
  const region = cfProps.region as string | undefined;
  const city = cfProps.city as string | undefined;
  
  // Get client IP for hashing (never store raw)
  const clientIp = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim();

  // Enqueue click event asynchronously (fire-and-forget)
  // Per SYSTEM_INVARIANTS #12: enqueue failures must not impact redirect
  c.executionCtx.waitUntil(
    (async () => {
      try {
        // Generate deterministic click ID
        const clickId = await generateClickId(result.link_id, tsMs, cfRay, userAgent);
        
        // Hash IP per SYSTEM_INVARIANTS #13
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

        // Enqueue to CLICKS_QUEUE
        await c.env.CLICKS_QUEUE.send(clickEvent);
      } catch (err) {
        // Log but never fail the redirect
        console.error('Failed to enqueue click event:', err);
      }
    })()
  );

  // Per SYSTEM_INVARIANTS #3: HTTP 302 with Cache-Control: no-store
  return c.redirect(result.destination_url, 302);
});
