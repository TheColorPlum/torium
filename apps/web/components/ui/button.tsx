'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-medium rounded-sm',
          'transition-colors duration-150 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          
          // Size variants
          {
            'text-sm px-3 py-1.5': size === 'sm',
            'text-sm px-4 py-2': size === 'md',
            'text-base px-6 py-3': size === 'lg',
          },
          
          // Color variants
          {
            // Primary
            'bg-accent-500 text-text-inverse hover:bg-accent-600 focus:ring-accent-ring':
              variant === 'primary',
            // Secondary
            'bg-bg border border-border text-text-primary hover:bg-bg-secondary focus:ring-accent-ring':
              variant === 'secondary',
            // Danger
            'bg-danger text-text-inverse hover:bg-red-700 focus:ring-red-400/40':
              variant === 'danger',
          },
          
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
