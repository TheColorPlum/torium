/**
 * WorkspaceCounterDO - Durable Object for workspace click tracking
 * 
 * Per SYSTEM_INVARIANTS:
 * - #7: DO counters are authoritative source for usage (caps and billing)
 * - #8: Free cap = tracking stops at 5,000, redirects continue
 * - #9: Free month counters and Pro period counters are separate state
 *       - Free counters reset at UTC month boundary
 *       - Pro counters reset when subscription period changes
 */

import { DurableObject } from 'cloudflare:workers';

interface CounterState {
  // Free tier tracking (monthly reset at UTC boundary)
  free_month_key: string;
  free_tracked_clicks: number;
  
  // Pro tier tracking (reset per billing period)
  pro_period_start: string | null;  // ISO8601
  pro_period_end: string | null;    // ISO8601
  pro_tracked_clicks: number;
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
   * Handles migration from old schema (month_key/tracked_clicks)
   */
  private async ensureState(): Promise<CounterState> {
    if (this.state === null) {
      const stored = await this.ctx.storage.get<CounterState>('counter');
      if (stored) {
        // Check for old schema and migrate if needed
        if ('month_key' in stored && !('free_month_key' in stored)) {
          const oldState = stored as unknown as { month_key: string; tracked_clicks: number };
          this.state = {
            free_month_key: oldState.month_key,
            free_tracked_clicks: oldState.tracked_clicks,
            pro_period_start: null,
            pro_period_end: null,
            pro_tracked_clicks: 0,
          };
          await this.ctx.storage.put('counter', this.state);
        } else {
          this.state = stored;
        }
      } else {
        this.state = {
          free_month_key: getCurrentMonthKey(),
          free_tracked_clicks: 0,
          pro_period_start: null,
          pro_period_end: null,
          pro_tracked_clicks: 0,
        };
      }
    }
    return this.state;
  }

  /**
   * Check and reset free counter if month has changed
   */
  private async maybeResetFreeForNewMonth(): Promise<void> {
    const state = await this.ensureState();
    const currentMonth = getCurrentMonthKey();
    
    if (state.free_month_key !== currentMonth) {
      // Per SYSTEM_INVARIANTS #9: Reset at UTC month boundary
      state.free_month_key = currentMonth;
      state.free_tracked_clicks = 0;
      await this.ctx.storage.put('counter', state);
    }
  }

  /**
   * Increment Free tier counter if under cap
   * Returns true if incremented, false if cap reached
   * 
   * Per SYSTEM_INVARIANTS #8: Once capped, no enqueue occurs
   */
  async incrementFreeIfUnderCap(cap: number): Promise<boolean> {
    await this.maybeResetFreeForNewMonth();
    const state = await this.ensureState();

    if (state.free_tracked_clicks >= cap) {
      return false;
    }

    state.free_tracked_clicks++;
    await this.ctx.storage.put('counter', state);
    return true;
  }

  /**
   * Increment Pro tier counter (no cap)
   */
  async incrementPro(): Promise<void> {
    const state = await this.ensureState();
    state.pro_tracked_clicks++;
    await this.ctx.storage.put('counter', state);
  }

  /**
   * Set Pro billing period (called by Stripe webhook)
   * Resets pro_tracked_clicks when period changes
   * 
   * @param start - ISO8601 period start
   * @param end - ISO8601 period end
   */
  async setProPeriod(start: string, end: string): Promise<void> {
    const state = await this.ensureState();
    
    // Reset counter if period changed
    if (state.pro_period_start !== start || state.pro_period_end !== end) {
      state.pro_period_start = start;
      state.pro_period_end = end;
      state.pro_tracked_clicks = 0;
      await this.ctx.storage.put('counter', state);
    }
  }

  /**
   * Get Pro usage for current period
   */
  async getProUsage(): Promise<{ period_start: string | null; period_end: string | null; tracked_clicks: number }> {
    const state = await this.ensureState();
    return {
      period_start: state.pro_period_start,
      period_end: state.pro_period_end,
      tracked_clicks: state.pro_tracked_clicks,
    };
  }

  /**
   * Get current Free usage stats
   */
  async getFreeUsage(): Promise<{ month_key: string; tracked_clicks: number }> {
    await this.maybeResetFreeForNewMonth();
    const state = await this.ensureState();
    return {
      month_key: state.free_month_key,
      tracked_clicks: state.free_tracked_clicks,
    };
  }

  // --- Legacy methods for backward compatibility ---
  
  /**
   * @deprecated Use incrementFreeIfUnderCap instead
   */
  async incrementIfUnderCap(cap: number): Promise<boolean> {
    return this.incrementFreeIfUnderCap(cap);
  }

  /**
   * @deprecated Use incrementPro instead
   */
  async increment(): Promise<void> {
    return this.incrementPro();
  }

  /**
   * @deprecated Use getFreeUsage instead
   */
  async getCurrentUsage(): Promise<{ month_key: string; tracked_clicks: number }> {
    return this.getFreeUsage();
  }

  /**
   * Handle HTTP requests to the DO
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // --- New Pro endpoints ---
      
      if (path === '/incrementPro' && request.method === 'POST') {
        await this.incrementPro();
        const proUsage = await this.getProUsage();
        return Response.json({ success: true, ...proUsage });
      }

      if (path === '/setProPeriod' && request.method === 'POST') {
        const body = await request.json() as { start: string; end: string };
        await this.setProPeriod(body.start, body.end);
        const proUsage = await this.getProUsage();
        return Response.json({ success: true, ...proUsage });
      }

      if (path === '/proUsage' && request.method === 'GET') {
        const proUsage = await this.getProUsage();
        return Response.json({ success: true, ...proUsage });
      }

      if (path === '/incrementFreeIfUnderCap' && request.method === 'POST') {
        const body = await request.json() as { cap: number };
        const incremented = await this.incrementFreeIfUnderCap(body.cap);
        const freeUsage = await this.getFreeUsage();
        return Response.json({ success: true, incremented, ...freeUsage });
      }

      if (path === '/freeUsage' && request.method === 'GET') {
        const freeUsage = await this.getFreeUsage();
        return Response.json({ success: true, ...freeUsage });
      }

      // --- Legacy endpoints for backward compatibility ---

      if (path === '/increment' && request.method === 'POST') {
        await this.incrementPro();
        const state = await this.ensureState();
        return Response.json({ 
          success: true, 
          month_key: state.free_month_key,
          tracked_clicks: state.pro_tracked_clicks 
        });
      }

      if (path === '/incrementIfUnderCap' && request.method === 'POST') {
        const body = await request.json() as { cap: number };
        const incremented = await this.incrementFreeIfUnderCap(body.cap);
        const freeUsage = await this.getFreeUsage();
        return Response.json({ success: true, incremented, ...freeUsage });
      }

      if (path === '/usage' && request.method === 'GET') {
        const freeUsage = await this.getFreeUsage();
        return Response.json({ success: true, ...freeUsage });
      }

      return Response.json({ error: 'Not found' }, { status: 404 });
    } catch (err) {
      console.error('WorkspaceCounterDO error:', err);
      return Response.json({ error: 'Internal error' }, { status: 500 });
    }
  }
}
