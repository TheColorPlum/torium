import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Accent — EXACTLY #8E4585, no variations
        accent: {
          500: '#8E4585',
          600: '#7A3B73', // darker for hover states
          ring: 'rgba(142, 69, 133, 0.4)', // focus ring
        },
        // Text colors
        text: {
          primary: '#111827',   // gray-900
          secondary: '#6B7280', // gray-500
          muted: '#9CA3AF',     // gray-400
          inverse: '#FFFFFF',
        },
        // Backgrounds
        bg: {
          DEFAULT: '#FFFFFF',
          secondary: '#F9FAFB', // gray-50
          tertiary: '#F3F4F6',  // gray-100
        },
        // Surface (cards, panels)
        surface: {
          DEFAULT: '#FFFFFF',
          raised: '#FFFFFF',
        },
        // Borders
        border: {
          DEFAULT: '#E5E7EB',   // gray-200
          strong: '#D1D5DB',    // gray-300
        },
        // Semantic colors
        danger: {
          DEFAULT: '#DC2626',   // red-600
          bg: '#FEF2F2',        // red-50
          border: '#FECACA',    // red-200
        },
        warning: {
          DEFAULT: '#D97706',   // amber-600
          bg: '#FFFBEB',        // amber-50
          border: '#FDE68A',    // amber-200
        },
        info: {
          DEFAULT: '#2563EB',   // blue-600
          bg: '#EFF6FF',        // blue-50
          border: '#BFDBFE',    // blue-200
        },
        success: {
          DEFAULT: '#16A34A',   // green-600
          bg: '#F0FDF4',        // green-50
          border: '#BBF7D0',    // green-200
        },
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        // DEFAULT stays at 4px from Tailwind
      },
      boxShadow: {
        // ONLY shadow-modal is allowed (except landing hero exception)
        modal: '0 4px 24px rgba(0, 0, 0, 0.12)',
        // Landing hero preview shadow (atmospheric exception)
        'hero-preview': '0 8px 32px rgba(0, 0, 0, 0.08)',
      },
      transitionDuration: {
        // Only these durations allowed
        '150': '150ms',
        '180': '180ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
