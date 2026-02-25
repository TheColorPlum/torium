/**
 * D1 Database utilities
 * D1 is the source of truth for persistent relational state (SYSTEM_INVARIANTS)
 */

/**
 * Generate a prefixed unique ID
 * Format: {prefix}_{ulid-like-id}
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  return `${prefix}_${timestamp}${random}`;
}

/**
 * Hash a token using SHA-256
 * Used for session tokens and magic link tokens
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a secure random token (base64url)
 */
export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Get current ISO 8601 timestamp
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Get ISO 8601 timestamp for future time
 */
export function futureTimestamp(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

/**
 * Check if a timestamp is expired
 */
export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}
