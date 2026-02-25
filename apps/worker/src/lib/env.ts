/**
 * Environment bindings and validation
 * All environment variables must be declared here
 */

export interface Env {
  // D1 Database binding
  DB: D1Database;

  // Queue binding for click ingestion
  CLICKS_QUEUE: Queue;

  // Durable Object binding for workspace counters
  WORKSPACE_COUNTER: DurableObjectNamespace;

  // Secrets (set via wrangler secret put)
  RESEND_API_KEY: string;
  SESSION_SECRET: string;

  // Stripe secrets (set via wrangler secret put)
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRO_PRICE_ID: string;

  // Configuration vars
  APP_URL: string;
  MAGIC_LINK_EXPIRY_MINUTES: string;
  SESSION_EXPIRY_DAYS: string;
}

/**
 * Validates that all required environment variables are present
 * Call this at worker startup
 */
export function validateEnv(env: Env): void {
  const required: (keyof Env)[] = [
    'DB',
    'RESEND_API_KEY',
    'SESSION_SECRET',
    'APP_URL',
  ];

  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Get magic link expiry in milliseconds
 */
export function getMagicLinkExpiry(env: Env): number {
  const minutes = parseInt(env.MAGIC_LINK_EXPIRY_MINUTES || '15', 10);
  return minutes * 60 * 1000;
}

/**
 * Get session expiry in milliseconds
 */
export function getSessionExpiry(env: Env): number {
  const days = parseInt(env.SESSION_EXPIRY_DAYS || '30', 10);
  return days * 24 * 60 * 60 * 1000;
}
