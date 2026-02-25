/**
 * Stripe Client Helpers
 * 
 * Provides typed helpers for Stripe API calls.
 * Uses fetch directly (no SDK) for Cloudflare Workers compatibility.
 * 
 * INVARIANTS:
 * - #7, #10: Billing reads DO counters only (usage reporting)
 * - Webhooks must be idempotent (handled in billing.ts)
 */

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

/**
 * Stripe error response
 */
interface StripeError {
  type: string;
  message: string;
  code?: string;
  param?: string;
}

/**
 * Stripe API call result
 */
type StripeResult<T> = { success: true; data: T } | { success: false; error: StripeError };

/**
 * Make a request to Stripe API
 */
async function stripeRequest<T>(
  secretKey: string,
  method: 'GET' | 'POST' | 'DELETE',
  endpoint: string,
  body?: Record<string, string | number | undefined>
): Promise<StripeResult<T>> {
  const url = `${STRIPE_API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  let formBody: string | undefined;
  if (body) {
    // Filter out undefined values and convert to URL-encoded form
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    }
    formBody = params.toString();
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: formBody,
    });

    const data = await response.json();

    if (!response.ok || (typeof data === 'object' && data !== null && 'error' in data)) {
      return {
        success: false,
        error: (data as { error: StripeError }).error || {
          type: 'api_error',
          message: 'Unknown Stripe error',
        },
      };
    }

    return { success: true, data: data as T };
  } catch (err) {
    return {
      success: false,
      error: {
        type: 'network_error',
        message: err instanceof Error ? err.message : 'Network request failed',
      },
    };
  }
}

/**
 * Stripe Customer object (subset)
 */
export interface StripeCustomer {
  id: string;
  object: 'customer';
  email: string | null;
  metadata: Record<string, string>;
}

/**
 * Create a Stripe customer
 */
export async function createCustomer(
  secretKey: string,
  email: string,
  metadata?: Record<string, string>
): Promise<StripeResult<StripeCustomer>> {
  const body: Record<string, string> = { email };
  
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      body[`metadata[${key}]`] = value;
    }
  }

  return stripeRequest<StripeCustomer>(secretKey, 'POST', '/customers', body);
}

/**
 * Stripe Checkout Session object (subset)
 */
export interface StripeCheckoutSession {
  id: string;
  object: 'checkout.session';
  url: string;
  customer: string;
  subscription: string | null;
  mode: 'payment' | 'setup' | 'subscription';
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  secretKey: string,
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
): Promise<StripeResult<StripeCheckoutSession>> {
  const body: Record<string, string> = {
    customer: customerId,
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
  };

  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      body[`metadata[${key}]`] = value;
    }
  }

  return stripeRequest<StripeCheckoutSession>(secretKey, 'POST', '/checkout/sessions', body);
}

/**
 * Stripe Billing Portal Session object (subset)
 */
export interface StripePortalSession {
  id: string;
  object: 'billing_portal.session';
  url: string;
  customer: string;
}

/**
 * Create a customer portal session
 */
export async function createCustomerPortalSession(
  secretKey: string,
  customerId: string,
  returnUrl: string
): Promise<StripeResult<StripePortalSession>> {
  return stripeRequest<StripePortalSession>(secretKey, 'POST', '/billing_portal/sessions', {
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Stripe Invoice Item object (subset)
 */
export interface StripeInvoiceItem {
  id: string;
  object: 'invoiceitem';
  customer: string;
  amount: number;
  currency: string;
  description: string | null;
}

/**
 * Create an invoice item for usage overage
 * SYSTEM_CONTRACT: $1 per 100k clicks over 2M included
 */
export async function createOverageInvoiceItem(
  secretKey: string,
  customerId: string,
  subscriptionId: string,
  overageClicks: number,
  periodStart: string,
  periodEnd: string
): Promise<StripeResult<StripeInvoiceItem>> {
  // Calculate overage amount: $1 per 100k clicks = 100 cents per 100k
  // Round up to nearest 100k
  const overageUnits = Math.ceil(overageClicks / 100000);
  const amountCents = overageUnits * 100; // $1 = 100 cents per unit

  const description = `Usage overage: ${overageClicks.toLocaleString()} clicks over 2M included (${periodStart} - ${periodEnd})`;

  return stripeRequest<StripeInvoiceItem>(secretKey, 'POST', '/invoiceitems', {
    customer: customerId,
    subscription: subscriptionId,
    amount: amountCents,
    currency: 'usd',
    description,
  });
}

/**
 * Stripe Webhook Event object (subset)
 */
export interface StripeEvent {
  id: string;
  object: 'event';
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

/**
 * Stripe Subscription object (subset - from webhook data)
 */
export interface StripeSubscription {
  id: string;
  object: 'subscription';
  customer: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused';
  current_period_start: number; // Unix timestamp
  current_period_end: number; // Unix timestamp
  items: {
    data: Array<{
      price: {
        id: string;
      };
    }>;
  };
  metadata: Record<string, string>;
}

/**
 * Stripe Checkout Session completed object (from webhook)
 */
export interface StripeCheckoutSessionCompleted {
  id: string;
  object: 'checkout.session';
  customer: string;
  subscription: string;
  metadata: Record<string, string>;
}

/**
 * Stripe Invoice object (subset - from webhook)
 */
export interface StripeInvoice {
  id: string;
  object: 'invoice';
  customer: string;
  subscription: string | null;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
}

/**
 * Verify and construct webhook event from request
 * 
 * Uses Stripe's signature verification to ensure the webhook is authentic.
 * Reference: https://stripe.com/docs/webhooks/signatures
 */
export async function constructWebhookEvent(
  payload: string,
  signature: string,
  webhookSecret: string
): Promise<StripeResult<StripeEvent>> {
  try {
    // Parse the signature header
    const sigParts = signature.split(',');
    let timestamp = '';
    let v1Signature = '';

    for (const part of sigParts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') v1Signature = value;
    }

    if (!timestamp || !v1Signature) {
      return {
        success: false,
        error: { type: 'signature_verification_error', message: 'Invalid signature header format' },
      };
    }

    // Check timestamp tolerance (5 minutes)
    const eventTime = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - eventTime) > 300) {
      return {
        success: false,
        error: { type: 'signature_verification_error', message: 'Timestamp outside tolerance' },
      };
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison
    if (expectedSignature.length !== v1Signature.length) {
      return {
        success: false,
        error: { type: 'signature_verification_error', message: 'Signature mismatch' },
      };
    }

    let mismatch = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      mismatch |= expectedSignature.charCodeAt(i) ^ v1Signature.charCodeAt(i);
    }

    if (mismatch !== 0) {
      return {
        success: false,
        error: { type: 'signature_verification_error', message: 'Signature mismatch' },
      };
    }

    // Parse the event
    const event = JSON.parse(payload) as StripeEvent;
    return { success: true, data: event };
  } catch (err) {
    return {
      success: false,
      error: {
        type: 'signature_verification_error',
        message: err instanceof Error ? err.message : 'Failed to verify webhook signature',
      },
    };
  }
}
