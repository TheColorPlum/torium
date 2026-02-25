/**
 * Formatting utilities for Torium
 */

/**
 * Format a number with compact notation for large values
 * e.g., 1234 -> "1.2K", 1234567 -> "1.2M"
 */
export function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

/**
 * Format a number with full locale string
 */
export function formatNumberFull(value: number): string {
  return value.toLocaleString();
}

/**
 * Format a date in a human-readable way
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date for charts (short form)
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Format a URL for display (truncate if too long)
 */
export function formatUrl(url: string, maxLength = 50): string {
  try {
    const parsed = new URL(url);
    const display = `${parsed.hostname}${parsed.pathname}`;
    if (display.length > maxLength) {
      return display.substring(0, maxLength - 3) + '...';
    }
    return display;
  } catch {
    // If URL parsing fails, just truncate
    if (url.length > maxLength) {
      return url.substring(0, maxLength - 3) + '...';
    }
    return url;
  }
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get short URL from slug
 */
export function getShortUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SHORT_URL || 'torium.app';
  return `${baseUrl}/${slug}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
