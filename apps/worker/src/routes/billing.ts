/**
 * Billing Routes
 * POST /api/v1/billing/checkout - Create checkout session
 * POST /api/v1/billing/portal - Create customer portal session
 * POST /api/v1/billing/webhooks - Handle Stripe webhooks (no auth, signature verified)
 * 
 * INVARIANTS:
 * - Webhooks must be idempotent (checked via processed_events table)
 * - Only two plans: free and pro (no additional tiers)
 * - Overage: $1 per 100k over 2M included (SYSTEM_CONTRACT)
 */

import { Hono } from 'hono';
import { success, error } from '@torium/shared';
import type { Env } from '../lib/env';
import { sessionMiddleware } from '../middleware/session';
import { now } from '../lib/db';
import { invalidatePlanCache } from '../lib/plan';
import {
  createCustomer,
  createCheckoutSession,
  createCustomerPortalSession,
  constructWebhookEvent,
  type StripeCheckoutSessionCompleted,
  type StripeSubscription,
  type StripeInvoice,
} from '../lib/stripe';

const billing = new Hono<{ Bindings: Env }>();

/**
 * POST /api/v1/billing/checkout
 * Create a Stripe checkout session for upgrading to Pro
 */
billing.post('/checkout', sessionMiddleware, async (c) => {
  const session = c.get('session');
  const workspace = session.workspace;

  // Check if already Pro
  if (workspace.plan_type === 'pro') {
    return c.json(error('ALREADY_PRO', 'Workspace is already on the Pro plan'), 400);
  }

  // Check for existing Stripe customer
  const workspaceRow = await c.env.DB.prepare(
    'SELECT stripe_customer_id FROM workspaces WHERE id = ?'
  ).bind(workspace.id).first<{ stripe_customer_id: string | null }>();

  let stripeCustomerId = workspaceRow?.stripe_customer_id;

  // Create Stripe customer if not exists
  if (!stripeCustomerId) {
    const customerResult = await createCustomer(
      c.env.STRIPE_SECRET_KEY,
      session.user.email,
      {
        workspace_id: workspace.id,
        user_id: session.user.id,
      }
    );

    if (!customerResult.success) {
      console.error('[Billing] Failed to create Stripe customer:', customerResult.error);
      return c.json(error('STRIPE_ERROR', 'Failed to create customer'), 500);
    }

    stripeCustomerId = customerResult.data.id;

    // Store customer ID
    await c.env.DB.prepare(
      'UPDATE workspaces SET stripe_customer_id = ? WHERE id = ?'
    ).bind(stripeCustomerId, workspace.id).run();
  }

  // Create checkout session
  const successUrl = `${c.env.APP_URL}/dashboard?billing=success`;
  const cancelUrl = `${c.env.APP_URL}/dashboard?billing=cancelled`;

  const checkoutResult = await createCheckoutSession(
    c.env.STRIPE_SECRET_KEY,
    stripeCustomerId,
    c.env.STRIPE_PRO_PRICE_ID,
    successUrl,
    cancelUrl,
    {
      workspace_id: workspace.id,
    }
  );

  if (!checkoutResult.success) {
    console.error('[Billing] Failed to create checkout session:', checkoutResult.error);
    return c.json(error('STRIPE_ERROR', 'Failed to create checkout session'), 500);
  }

  return c.json(success({
    checkout_url: checkoutResult.data.url,
  }));
});

/**
 * POST /api/v1/billing/portal
 * Create a Stripe customer portal session for subscription management
 */
billing.post('/portal', sessionMiddleware, async (c) => {
  const session = c.get('session');
  const workspace = session.workspace;

  // Get Stripe customer ID
  const workspaceRow = await c.env.DB.prepare(
    'SELECT stripe_customer_id FROM workspaces WHERE id = ?'
  ).bind(workspace.id).first<{ stripe_customer_id: string | null }>();

  if (!workspaceRow?.stripe_customer_id) {
    return c.json(error('NO_CUSTOMER', 'No billing account found. Please upgrade first.'), 400);
  }

  const returnUrl = `${c.env.APP_URL}/dashboard`;

  const portalResult = await createCustomerPortalSession(
    c.env.STRIPE_SECRET_KEY,
    workspaceRow.stripe_customer_id,
    returnUrl
  );

  if (!portalResult.success) {
    console.error('[Billing] Failed to create portal session:', portalResult.error);
    return c.json(error('STRIPE_ERROR', 'Failed to create portal session'), 500);
  }

  return c.json(success({
    portal_url: portalResult.data.url,
  }));
});

/**
 * POST /api/v1/billing/webhooks
 * Handle Stripe webhook events (no auth, signature verified)
 * 
 * INVARIANT: Webhooks must be idempotent
 */
billing.post('/webhooks', async (c) => {
  // Get raw body and signature
  const payload = await c.req.text();
  const signature = c.req.header('stripe-signature');

  if (!signature) {
    return c.json(error('INVALID_SIGNATURE', 'Missing Stripe signature'), 400);
  }

  // Verify webhook signature
  const eventResult = await constructWebhookEvent(
    payload,
    signature,
    c.env.STRIPE_WEBHOOK_SECRET
  );

  if (!eventResult.success) {
    console.error('[Webhook] Signature verification failed:', eventResult.error);
    return c.json(error('INVALID_SIGNATURE', 'Invalid webhook signature'), 400);
  }

  const event = eventResult.data;
  console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

  // Idempotency check: skip if already processed
  const existing = await c.env.DB.prepare(
    'SELECT id FROM processed_events WHERE id = ?'
  ).bind(event.id).first();

  if (existing) {
    console.log(`[Webhook] Event ${event.id} already processed, skipping`);
    return c.json({ received: true });
  }

  // Handle event based on type
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(c.env, event.data.object as unknown as StripeCheckoutSessionCompleted);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(c.env, event.data.object as unknown as StripeSubscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(c.env, event.data.object as unknown as StripeSubscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(c.env, event.data.object as unknown as StripeInvoice);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    // Mark event as processed (idempotency)
    await c.env.DB.prepare(
      'INSERT INTO processed_events (id, processed_at) VALUES (?, ?)'
    ).bind(event.id, now()).run();

  } catch (err) {
    console.error(`[Webhook] Error handling ${event.type}:`, err);
    // Still return 200 to prevent Stripe retries on our errors
    // Log for manual investigation
  }

  return c.json({ received: true });
});

/**
 * Handle checkout.session.completed
 * Set plan_type='pro' and store subscription info
 */
async function handleCheckoutCompleted(env: Env, session: StripeCheckoutSessionCompleted): Promise<void> {
  console.log(`[Webhook] Checkout completed for customer ${session.customer}`);

  // Find workspace by customer ID
  const workspace = await env.DB.prepare(
    'SELECT id FROM workspaces WHERE stripe_customer_id = ?'
  ).bind(session.customer).first<{ id: string }>();

  if (!workspace) {
    // Try metadata fallback
    const workspaceId = session.metadata?.workspace_id;
    if (workspaceId) {
      await env.DB.prepare(`
        UPDATE workspaces SET
          stripe_customer_id = ?,
          stripe_subscription_id = ?,
          plan_type = 'pro',
          billing_status = 'active'
        WHERE id = ?
      `).bind(session.customer, session.subscription, workspaceId).run();

      // Invalidate plan cache
      invalidatePlanCache(workspaceId);
      console.log(`[Webhook] Upgraded workspace ${workspaceId} to Pro via metadata`);
      return;
    }

    console.error(`[Webhook] No workspace found for customer ${session.customer}`);
    return;
  }

  // Update workspace to Pro
  await env.DB.prepare(`
    UPDATE workspaces SET
      stripe_subscription_id = ?,
      plan_type = 'pro',
      billing_status = 'active'
    WHERE id = ?
  `).bind(session.subscription, workspace.id).run();

  // Invalidate plan cache
  invalidatePlanCache(workspace.id);
  console.log(`[Webhook] Upgraded workspace ${workspace.id} to Pro`);
}

/**
 * Handle customer.subscription.updated
 * Update period dates and billing status
 */
async function handleSubscriptionUpdated(env: Env, subscription: StripeSubscription): Promise<void> {
  console.log(`[Webhook] Subscription updated: ${subscription.id} (status: ${subscription.status})`);

  // Find workspace by subscription ID
  const workspace = await env.DB.prepare(
    'SELECT id FROM workspaces WHERE stripe_subscription_id = ?'
  ).bind(subscription.id).first<{ id: string }>();

  if (!workspace) {
    // Try by customer ID
    const byCustomer = await env.DB.prepare(
      'SELECT id FROM workspaces WHERE stripe_customer_id = ?'
    ).bind(subscription.customer).first<{ id: string }>();

    if (!byCustomer) {
      console.error(`[Webhook] No workspace found for subscription ${subscription.id}`);
      return;
    }

    // Update with subscription ID
    await env.DB.prepare(`
      UPDATE workspaces SET stripe_subscription_id = ? WHERE id = ?
    `).bind(subscription.id, byCustomer.id).run();

    await updateSubscriptionData(env, byCustomer.id, subscription);
    return;
  }

  await updateSubscriptionData(env, workspace.id, subscription);
}

/**
 * Helper to update subscription data on workspace
 */
async function updateSubscriptionData(env: Env, workspaceId: string, subscription: StripeSubscription): Promise<void> {
  // Convert Unix timestamps to ISO 8601
  const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  // Get price ID from subscription
  const priceId = subscription.items?.data?.[0]?.price?.id || null;

  // Map Stripe status to billing_status
  let billingStatus: 'active' | 'past_due' | 'cancelled' = 'active';
  if (subscription.status === 'past_due') {
    billingStatus = 'past_due';
  } else if (subscription.status === 'canceled') {
    billingStatus = 'cancelled';
  }

  await env.DB.prepare(`
    UPDATE workspaces SET
      stripe_price_id = ?,
      current_period_start = ?,
      current_period_end = ?,
      billing_status = ?
    WHERE id = ?
  `).bind(priceId, periodStart, periodEnd, billingStatus, workspaceId).run();

  // Invalidate plan cache
  invalidatePlanCache(workspaceId);
  console.log(`[Webhook] Updated subscription data for workspace ${workspaceId}`);
}

/**
 * Handle customer.subscription.deleted
 * Set plan_type='free' and clear subscription
 */
async function handleSubscriptionDeleted(env: Env, subscription: StripeSubscription): Promise<void> {
  console.log(`[Webhook] Subscription deleted: ${subscription.id}`);

  // Find workspace by subscription ID
  const workspace = await env.DB.prepare(
    'SELECT id FROM workspaces WHERE stripe_subscription_id = ?'
  ).bind(subscription.id).first<{ id: string }>();

  if (!workspace) {
    console.error(`[Webhook] No workspace found for deleted subscription ${subscription.id}`);
    return;
  }

  // Downgrade to free
  await env.DB.prepare(`
    UPDATE workspaces SET
      plan_type = 'free',
      stripe_subscription_id = NULL,
      stripe_price_id = NULL,
      current_period_start = NULL,
      current_period_end = NULL,
      billing_status = 'cancelled'
    WHERE id = ?
  `).bind(workspace.id).run();

  // Invalidate plan cache
  invalidatePlanCache(workspace.id);
  console.log(`[Webhook] Downgraded workspace ${workspace.id} to Free`);
}

/**
 * Handle invoice.payment_failed
 * Set billing_status='past_due'
 */
async function handlePaymentFailed(env: Env, invoice: StripeInvoice): Promise<void> {
  console.log(`[Webhook] Payment failed for invoice: ${invoice.id}`);

  if (!invoice.subscription) {
    console.log(`[Webhook] Invoice ${invoice.id} has no subscription, skipping`);
    return;
  }

  // Find workspace by subscription
  const workspace = await env.DB.prepare(
    'SELECT id FROM workspaces WHERE stripe_subscription_id = ?'
  ).bind(invoice.subscription).first<{ id: string }>();

  if (!workspace) {
    console.error(`[Webhook] No workspace found for subscription ${invoice.subscription}`);
    return;
  }

  // Set past_due status
  await env.DB.prepare(`
    UPDATE workspaces SET billing_status = 'past_due' WHERE id = ?
  `).bind(workspace.id).run();

  console.log(`[Webhook] Set workspace ${workspace.id} to past_due`);
}

export { billing };
