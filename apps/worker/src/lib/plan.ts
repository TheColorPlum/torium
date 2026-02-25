/**
 * Plan Lookup with In-Memory Cache
 * 
 * Per SYSTEM_INVARIANTS #18:
 * - D1 workspaces.plan_type is source of truth
 * - Caching allowed with 60s TTL
 * - Plan is read only after link resolution yields workspace_id
 */

export type PlanType = 'free' | 'pro';

interface CacheEntry {
  plan: PlanType;
  expires: number;
}

// In-memory cache (per-isolate, acceptable per TDD)
const planCache = new Map<string, CacheEntry>();

// Cache TTL in milliseconds
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Get workspace plan type with 60s cache
 * 
 * @param db - D1 database binding
 * @param workspaceId - Workspace ID to lookup
 * @returns 'free' | 'pro' (defaults to 'free' if not found)
 */
export async function getWorkspacePlan(
  db: D1Database,
  workspaceId: string
): Promise<PlanType> {
  const now = Date.now();
  
  // Check cache first
  const cached = planCache.get(workspaceId);
  if (cached && cached.expires > now) {
    return cached.plan;
  }

  // Query D1 for plan_type
  const result = await db
    .prepare(`SELECT plan_type FROM workspaces WHERE id = ?`)
    .bind(workspaceId)
    .first<{ plan_type: string }>();

  // Default to 'free' if workspace not found (defensive)
  const plan: PlanType = (result?.plan_type === 'pro') ? 'pro' : 'free';

  // Cache the result
  planCache.set(workspaceId, {
    plan,
    expires: now + CACHE_TTL_MS,
  });

  return plan;
}

/**
 * Invalidate cache for a workspace (call on plan change)
 */
export function invalidatePlanCache(workspaceId: string): void {
  planCache.delete(workspaceId);
}

/**
 * Clear entire plan cache (for testing/admin)
 */
export function clearPlanCache(): void {
  planCache.clear();
}
