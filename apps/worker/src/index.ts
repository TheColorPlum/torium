/**
 * Torium Worker Entry
 * Cloudflare Worker serving API and redirects
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { success, error } from '@torium/shared';
import { auth } from './routes/auth';
import { links } from './routes/links';
import { analytics } from './routes/analytics';
import { billing } from './routes/billing';
import { redirect } from './routes/redirect';
import { validateEnv, type Env } from './lib/env';
import { handleClickBatch } from './consumers/clicks';
import { runAggregation } from './jobs/aggregation';
import { runRetention } from './jobs/retention';
import { runUsageReporting } from './jobs/usage-reporting';
import { runReconciliation } from './jobs/reconciliation';
import type { ClickEvent } from '@torium/shared';

// Export Durable Object class
export { WorkspaceCounterDO } from './do/workspace-counter';

// Create Hono app with typed bindings
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use(
  '/api/*',
  cors({
    origin: (origin) => origin, // Allow requesting origin
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  })
);

// Health check (no auth required)
app.get('/health', (c) => {
  return c.json(success({ status: 'ok', timestamp: new Date().toISOString() }));
});

// API version 1 routes
const v1 = new Hono<{ Bindings: Env }>();

// Mount auth routes
v1.route('/auth', auth);

// Mount links routes
v1.route('/links', links);

// Mount analytics routes
v1.route('/analytics', analytics);

// Mount billing routes
v1.route('/billing', billing);

// API info endpoint
v1.get('/', (c) => {
  return c.json(
    success({
      name: 'Torium API',
      version: 'v1',
      docs: 'https://torium.app/docs/api',
    })
  );
});

// Mount v1 under /api/v1
app.route('/api/v1', v1);

// Mount redirect handler AFTER API routes
// Catches /:slug for link resolution
app.route('/', redirect);

// Global 404 handler
app.notFound((c) => {
  return c.json(error('NOT_FOUND', 'Resource not found'), 404);
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(error('INTERNAL_ERROR', 'An unexpected error occurred'), 500);
});

// Export worker with fetch, queue, and scheduled handlers
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Validate environment on first request (will throw if missing vars)
    try {
      validateEnv(env);
    } catch (e) {
      console.error('Environment validation failed:', e);
      return new Response(
        JSON.stringify({
          error: { code: 'INTERNAL_ERROR', message: 'Server configuration error' },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return app.fetch(request, env, ctx);
  },

  // Queue consumer handler for click events
  async queue(batch: MessageBatch<ClickEvent>, env: Env): Promise<void> {
    await handleClickBatch(batch, env);
  },

  // Scheduled handler for cron triggers (aggregation + retention + billing)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[Scheduled] Cron trigger: ${event.cron}`);

    switch (event.cron) {
      case '*/5 * * * *': // Every 5 minutes - aggregation
        ctx.waitUntil(
          runAggregation(env).catch((err) => {
            console.error('[Scheduled] Aggregation failed:', err);
          })
        );
        break;

      case '0 3 * * *': // Daily at 3 AM UTC - retention
        ctx.waitUntil(
          runRetention(env).catch((err) => {
            console.error('[Scheduled] Retention failed:', err);
          })
        );
        break;

      case '0 4 * * *': // Daily at 4 AM UTC - usage reporting (billing)
        ctx.waitUntil(
          runUsageReporting(env).catch((err) => {
            console.error('[Scheduled] Usage reporting failed:', err);
          })
        );
        break;

      case '0 5 * * *': // Daily at 5 AM UTC - reconciliation
        ctx.waitUntil(
          runReconciliation(env).catch((err) => {
            console.error('[Scheduled] Reconciliation failed:', err);
          })
        );
        break;

      default:
        console.log(`[Scheduled] Unknown cron pattern: ${event.cron}`);
    }
  },
};
