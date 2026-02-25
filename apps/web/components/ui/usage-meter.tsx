import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface UsageMeterProps extends HTMLAttributes<HTMLDivElement> {
  /** Current usage value */
  current: number;
  /** Maximum limit */
  limit: number;
  /** Show percentage text */
  showLabel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
}

const UsageMeter = forwardRef<HTMLDivElement, UsageMeterProps>(
  ({ className, current, limit, showLabel = true, size = 'md', ...props }, ref) => {
    const percentage = Math.min((current / limit) * 100, 100);
    const isOverLimit = current >= limit;

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {/* Progress bar track */}
        <div
          className={cn(
            'w-full bg-bg-tertiary rounded-sm overflow-hidden',
            {
              'h-2': size === 'sm',
              'h-3': size === 'md',
            }
          )}
        >
          {/* Progress bar fill - accent ONLY, NO gradients */}
          <div
            className={cn(
              'h-full transition-[width] duration-180 ease-out rounded-sm',
              isOverLimit ? 'bg-danger' : 'bg-accent-500'
            )}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={current}
            aria-valuemin={0}
            aria-valuemax={limit}
          />
        </div>
        
        {/* Label */}
        {showLabel && (
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-xs text-text-secondary">
              {current.toLocaleString()} / {limit.toLocaleString()}
            </span>
            <span
              className={cn(
                'text-xs font-medium',
                isOverLimit ? 'text-danger' : 'text-text-secondary'
              )}
            >
              {percentage.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    );
  }
);

UsageMeter.displayName = 'UsageMeter';

export { UsageMeter };
