import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          // Base styles
          'w-full px-3 py-2 text-sm rounded-sm',
          'bg-bg border text-text-primary placeholder:text-text-muted',
          'transition-colors duration-150 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          
          // Normal state
          !error && 'border-border focus:border-accent-500 focus:ring-accent-ring',
          
          // Error state
          error && 'border-danger focus:border-danger focus:ring-red-400/40',
          
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
