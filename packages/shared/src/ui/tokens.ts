/**
 * Torium Design Tokens
 * 
 * This file defines the single source of truth for design tokens.
 * Changes to this file require explicit approval.
 * 
 * INVARIANT: Accent color is EXACTLY #8E4585
 */

// ============================================================
// COLORS
// ============================================================

export const colors = {
  accent: {
    500: '#8E4585',
    600: '#7A3B73',
    ring: 'rgba(142, 69, 133, 0.4)',
  },
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    muted: '#9CA3AF',
    inverse: '#FFFFFF',
  },
  bg: {
    default: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
  },
  surface: {
    default: '#FFFFFF',
    raised: '#FFFFFF',
  },
  border: {
    default: '#E5E7EB',
    strong: '#D1D5DB',
  },
  semantic: {
    danger: { default: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    warning: { default: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    info: { default: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    success: { default: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  },
} as const;

// ============================================================
// SPACING
// ============================================================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

// ============================================================
// TYPOGRAPHY
// ============================================================

export const typography = {
  fontFamily: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },
  fontSize: {
    xs: ['12px', { lineHeight: '16px' }],
    sm: ['14px', { lineHeight: '20px' }],
    base: ['16px', { lineHeight: '24px' }],
    lg: ['18px', { lineHeight: '28px' }],
    xl: ['20px', { lineHeight: '28px' }],
    '2xl': ['24px', { lineHeight: '32px' }],
    '3xl': ['30px', { lineHeight: '36px' }],
    '4xl': ['36px', { lineHeight: '40px' }],
    '5xl': ['48px', { lineHeight: '48px' }],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

// ============================================================
// MOTION
// ============================================================

export const motion = {
  duration: {
    fast: '150ms',
    normal: '180ms',
  },
  easing: {
    default: 'ease-out',
  },
} as const;

// ============================================================
// BORDERS & RADIUS
// ============================================================

export const borders = {
  radius: {
    sm: '6px',
    md: '10px',
  },
  width: {
    default: '1px',
    thick: '2px',
  },
} as const;

// ============================================================
// SHADOWS
// ============================================================

export const shadows = {
  // ONLY shadow allowed in main UI
  modal: '0 4px 24px rgba(0, 0, 0, 0.12)',
  // Landing hero exception ONLY
  heroPreview: '0 8px 32px rgba(0, 0, 0, 0.08)',
} as const;

// ============================================================
// SURFACES
// ============================================================

export const surfaces = {
  card: {
    background: colors.surface.default,
    border: colors.border.default,
    radius: borders.radius.sm,
  },
  modal: {
    background: colors.surface.default,
    border: colors.border.default,
    radius: borders.radius.md,
    shadow: shadows.modal,
  },
  sidebar: {
    background: colors.bg.secondary,
    width: '240px',
  },
} as const;

// ============================================================
// BUTTON VARIANTS
// ============================================================

export const buttonVariants = {
  primary: {
    bg: colors.accent[500],
    bgHover: colors.accent[600],
    text: colors.text.inverse,
    focusRing: colors.accent.ring,
  },
  secondary: {
    bg: colors.bg.default,
    bgHover: colors.bg.secondary,
    text: colors.text.primary,
    border: colors.border.default,
    focusRing: colors.accent.ring,
  },
  danger: {
    bg: colors.semantic.danger.default,
    bgHover: '#B91C1C', // red-700
    text: colors.text.inverse,
    focusRing: 'rgba(220, 38, 38, 0.4)',
  },
} as const;

// ============================================================
// Z-INDEX
// ============================================================

export const zIndex = {
  dropdown: 10,
  sticky: 20,
  modal: 50,
  tooltip: 60,
} as const;
