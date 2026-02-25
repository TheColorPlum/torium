import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface BannerProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'warning' | 'danger' | 'success';
}

const Banner = forwardRef<HTMLDivElement, BannerProps>(
  ({ className, variant = 'info', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'px-4 py-3 rounded-sm border text-sm',
          {
            // Info
            'bg-info-bg border-info-border text-info': variant === 'info',
            // Warning
            'bg-warning-bg border-warning-border text-warning': variant === 'warning',
            // Danger
            'bg-danger-bg border-danger-border text-danger': variant === 'danger',
            // Success
            'bg-success-bg border-success-border text-success': variant === 'success',
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Banner.displayName = 'Banner';

export { Banner };
