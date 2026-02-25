/**
 * Click Queue Consumer
 * Processes click events from queue and persists to D1
 * 
 * Per SYSTEM_INVARIANTS:
 * - #13: No raw IP stored, only hash (enforced at enqueue time)
 * - Idempotent: ON CONFLICT DO NOTHING for duplicate click_ids
 */

import type { ClickEvent } from '@torium/shared';
import { isBotSuspected, deriveDeviceType } from '../lib/clicks';
import type { Env } from '../lib/env';

/**
 * Process a batch of click messages
 * Called by Cloudflare Queues runtime
 */
export async function handleClickBatch(
  batch: MessageBatch<ClickEvent>,
  env: Env
): Promise<void> {
  if (batch.messages.length === 0) return;

  // Process all messages in batch
  const clicks: Array<{
    id: string;
    ts: string;
    workspace_id: string;
    link_id: string;
    domain: string;
    slug: string;
    destination_url: string | null;
    referrer: string | null;
    user_agent: string | null;
    ip_hash: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
    device_type: string;
    is_bot_suspected: number;
  }> = [];

  for (const message of batch.messages) {
    const event = message.body;

    // Derive additional fields
    const deviceType = deriveDeviceType(event.user_agent);
    const botSuspected = isBotSuspected(event.user_agent) ? 1 : 0;

    clicks.push({
      id: event.click_id,
      ts: event.ts,
      workspace_id: event.workspace_id,
      link_id: event.link_id,
      domain: event.domain,
      slug: event.slug,
      destination_url: event.destination_url || null,
      referrer: event.referrer || null,
      user_agent: event.user_agent || null,
      ip_hash: event.ip_hash || null,
      country: event.country || null,
      region: event.region || null,
      city: event.city || null,
      device_type: deviceType,
      is_bot_suspected: botSuspected,
    });
  }

  // Batch insert with ON CONFLICT DO NOTHING (idempotent)
  // D1 doesn't support batch insert in a single statement, so we use a transaction
  const insertStmt = env.DB.prepare(`
    INSERT INTO raw_clicks (
      id, ts, workspace_id, link_id, domain, slug, destination_url,
      referrer, user_agent, ip_hash, country, region, city,
      device_type, is_bot_suspected
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO NOTHING
  `);

  // Execute all inserts in a batch
  const statements = clicks.map((click) =>
    insertStmt.bind(
      click.id,
      click.ts,
      click.workspace_id,
      click.link_id,
      click.domain,
      click.slug,
      click.destination_url,
      click.referrer,
      click.user_agent,
      click.ip_hash,
      click.country,
      click.region,
      click.city,
      click.device_type,
      click.is_bot_suspected
    )
  );

  try {
    // D1 batch executes all statements
    await env.DB.batch(statements);
    
    // Acknowledge all messages on success
    for (const message of batch.messages) {
      message.ack();
    }
  } catch (err) {
    console.error('Failed to persist click batch:', err);
    // Retry failed messages
    for (const message of batch.messages) {
      message.retry();
    }
  }
}
