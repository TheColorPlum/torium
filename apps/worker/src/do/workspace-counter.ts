/**
 * WorkspaceCounterDO - Durable Object for workspace click tracking
 * 
 * Per SYSTEM_INVARIANTS:
 * - #7: DO counters are authoritative source for usage (caps and billing)
 * - #8: Free cap = tracking stops at 5,000, redirects continue
 * - #9: Free month counters reset at UTC month boundary
 */

import { DurableObject } from 'cloudflare:workers';

interface CounterState {
  month_key: string;
  tracked_clicks: number;
}

/**
 * Get the current month key in YYYY-MM format (UTC)
 */
function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export class WorkspaceCounterDO extends DurableObject {
  private state: CounterState | null = null;

  /**
   * Load state from storage, initializing if needed
   */
  private async ensureState(): Promise<CounterState> {
    if (this.state === null) {
      const stored = await this.ctx.storage.get<CounterState>('counter');
      if (stored) {
        this.state = stored;
      } else {
        this.state = {
          month_key: getCurrentMonthKey(),
          tracked_clicks: 0,
        };
      }
    }
    return this.state;
  }

  /**
   * Check and reset counter if month has changed
   */
  private async maybeResetForNewMonth(): Promise<void> {
    const state = await this.ensureState();
    const currentMonth = getCurrentMonthKey();
    
    if (state.month_key !== currentMonth) {
      // Per SYSTEM_INVARIANTS #9: Reset at UTC month boundary
      state.month_key = currentMonth;
      state.tracked_clicks = 0;
      await this.ctx.storage.put('counter', state);
    }
  }

  /**
   * Increment if under cap (for Free tier)
   * Returns true if incremented, false if cap reached
   * 
   * Per SYSTEM_INVARIANTS #8: Once capped, no enqueue occurs
   */
  async incrementIfUnderCap(cap: number): Promise<boolean> {
    await this.maybeResetForNewMonth();
    const state = await this.ensureState();

    if (state.tracked_clicks >= cap) {
      return false;
    }

    state.tracked_clicks++;
    await this.ctx.storage.put('counter', state);
    return true;
  }

  /**
   * Increment without cap check (for Pro tier)
   */
  async increment(): Promise<void> {
    await this.maybeResetForNewMonth();
    const state = await this.ensureState();
    
    state.tracked_clicks++;
    await this.ctx.storage.put('counter', state);
  }

  /**
   * Get current usage stats
   */
  async getCurrentUsage(): Promise<CounterState> {
    await this.maybeResetForNewMonth();
    return this.ensureState();
  }

  /**
   * Handle HTTP requests to the DO
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/increment' && request.method === 'POST') {
        await this.increment();
        const state = await this.ensureState();
        return Response.json({ success: true, ...state });
      }

      if (path === '/incrementIfUnderCap' && request.method === 'POST') {
        const body = await request.json() as { cap: number };
        const incremented = await this.incrementIfUnderCap(body.cap);
        const state = await this.ensureState();
        return Response.json({ success: true, incremented, ...state });
      }

      if (path === '/usage' && request.method === 'GET') {
        const usage = await this.getCurrentUsage();
        return Response.json({ success: true, ...usage });
      }

      return Response.json({ error: 'Not found' }, { status: 404 });
    } catch (err) {
      console.error('WorkspaceCounterDO error:', err);
      return Response.json({ error: 'Internal error' }, { status: 500 });
    }
  }
}
