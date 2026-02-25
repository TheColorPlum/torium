'use client';

import { Banner, Button } from '@/components/ui';

interface CapBannerProps {
  current: number;
  limit: number;
  plan: 'free' | 'pro';
  onUpgrade?: () => void;
}

export function CapBanner({ current, limit, plan, onUpgrade }: CapBannerProps) {
  // Only show for free tier users near or at limit
  if (plan !== 'free') return null;
  if (current < limit * 0.8) return null;

  const isAtLimit = current >= limit;

  return (
    <Banner variant={isAtLimit ? 'danger' : 'warning'}>
      <div className="flex items-center justify-between gap-4">
        <div>
          {isAtLimit ? (
            <>
              <strong>You&apos;ve reached your free limit.</strong>{' '}
              Your links will continue to redirect, but clicks won&apos;t be tracked until you upgrade.
            </>
          ) : (
            <>
              <strong>You&apos;re at {Math.round((current / limit) * 100)}% of your free limit.</strong>{' '}
              Consider upgrading to Pro for unlimited tracking.
            </>
          )}
        </div>
        {onUpgrade && (
          <Button size="sm" onClick={onUpgrade}>
            Upgrade to Pro
          </Button>
        )}
      </div>
    </Banner>
  );
}
