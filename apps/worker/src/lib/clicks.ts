/**
 * Click Helpers
 * Utilities for click event processing
 */

import type { DeviceType } from '@torium/shared';

/**
 * Generate a deterministic click ID
 * Uses sha256(link_id + "|" + ts_ms + "|" + cf_ray_or_ua_hash)
 * 
 * @param linkId - The link being clicked
 * @param tsMs - Timestamp in milliseconds
 * @param cfRay - CF-Ray header (unique per request)
 * @param userAgent - Fallback: user agent for hashing if no cf-ray
 */
export async function generateClickId(
  linkId: string,
  tsMs: number,
  cfRay?: string,
  userAgent?: string
): Promise<string> {
  // Use cf-ray if available, otherwise hash user-agent as fallback
  let uniquePart = cfRay || '';
  if (!uniquePart && userAgent) {
    // Hash user-agent for some uniqueness
    const uaBuffer = new TextEncoder().encode(userAgent);
    const uaHash = await crypto.subtle.digest('SHA-256', uaBuffer);
    uniquePart = arrayBufferToHex(uaHash).slice(0, 16);
  }

  const input = `${linkId}|${tsMs}|${uniquePart}`;
  const buffer = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return arrayBufferToHex(hash);
}

/**
 * Hash an IP address
 * Per SYSTEM_INVARIANTS #13: No raw IP stored, only hash
 * 
 * @param ip - Raw IP address
 * @returns SHA256 hash of the IP
 */
export async function hashIp(ip: string): Promise<string> {
  const buffer = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return arrayBufferToHex(hash);
}

/**
 * Check if user agent indicates a bot
 * Matches common crawler/bot patterns
 * 
 * @param userAgent - User-Agent header
 * @returns true if suspected bot
 */
export function isBotSuspected(userAgent?: string): boolean {
  if (!userAgent) return false;

  const ua = userAgent.toLowerCase();
  const botPatterns = [
    'googlebot',
    'bingbot',
    'slurp',           // Yahoo
    'duckduckbot',
    'baiduspider',
    'yandex',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'whatsapp',
    'telegrambot',
    'discordbot',
    'slackbot',
    'applebot',
    'msnbot',
    'ahrefsbot',
    'semrushbot',
    'dotbot',
    'rogerbot',
    'embedly',
    'quora link preview',
    'showyoubot',
    'outbrain',
    'pinterest',
    'developers.google.com',
    'google-read-aloud',
    'mediapartners-google',
    'adsbot',
    'apis-google',
    'feedfetcher',
    'bot',
    'spider',
    'crawler',
    'scraper',
    'headless',
    'phantom',
    'selenium',
    'puppeteer',
  ];

  return botPatterns.some((pattern) => ua.includes(pattern));
}

/**
 * Derive device type from user agent
 * 
 * @param userAgent - User-Agent header
 * @returns Device type category
 */
export function deriveDeviceType(userAgent?: string): DeviceType {
  if (!userAgent) return 'unknown';

  const ua = userAgent.toLowerCase();

  // Check tablet first (some tablets have "mobile" in UA)
  if (
    ua.includes('ipad') ||
    ua.includes('tablet') ||
    (ua.includes('android') && !ua.includes('mobile'))
  ) {
    return 'tablet';
  }

  // Check mobile
  if (
    ua.includes('mobile') ||
    ua.includes('iphone') ||
    ua.includes('ipod') ||
    ua.includes('android') ||
    ua.includes('blackberry') ||
    ua.includes('windows phone') ||
    ua.includes('opera mini') ||
    ua.includes('opera mobi')
  ) {
    return 'mobile';
  }

  // Check for desktop indicators
  if (
    ua.includes('windows') ||
    ua.includes('macintosh') ||
    ua.includes('linux') ||
    ua.includes('cros')  // ChromeOS
  ) {
    return 'desktop';
  }

  return 'unknown';
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
