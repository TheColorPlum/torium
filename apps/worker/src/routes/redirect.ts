/**
 * Redirect Route Handler
 * GET /:slug - Resolves and redirects to destination
 * 
 * Per SYSTEM_INVARIANTS:
 * - #1: Redirects must never break due to billing/analytics failures
 * - #2: Redirect requests must never synchronously write to D1
 * - #3: Redirects must be HTTP 302 with Cache-Control: no-store
 */

import { Hono } from 'hono';
import { error } from '@torium/shared';
import { resolveLink } from '../lib/resolve';
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

  // Per SYSTEM_INVARIANTS #3: HTTP 302 with Cache-Control: no-store
  return c.redirect(result.destination_url, 302);
});
