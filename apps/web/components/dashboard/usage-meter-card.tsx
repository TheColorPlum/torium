import { Card, CardHeader, CardTitle, CardContent, UsageMeter, Button } from '@/components/ui';
import { formatNumberFull } from '@/lib/format';

interface UsageMeterCardProps {
  current: number;
  limit: number;
  plan: 'free' | 'pro';
  loading?: boolean;
  onUpgrade?: () => void;
}

export function UsageMeterCard({ current, limit, plan, loading, onUpgrade }: UsageMeterCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-3 bg-bg-tertiary rounded-sm mb-2" />
          <div className="h-4 w-48 bg-bg-tertiary rounded-sm" />
        </CardContent>
      </Card>
    );
  }

  const percentage = Math.min((current / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= limit;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Usage</CardTitle>
        {plan === 'free' && onUpgrade && (
          <Button size="sm" onClick={onUpgrade}>
            Upgrade
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <UsageMeter current={current} limit={limit} />
        <p className="text-sm text-text-secondary mt-4">
          You&apos;ve used {formatNumberFull(current)} of your {formatNumberFull(limit)} tracked clicks this month.
        </p>
        {isAtLimit && plan === 'free' && (
          <p className="text-sm text-danger mt-2">
            You&apos;ve reached your free tier limit. Upgrade to Pro for unlimited tracking.
          </p>
        )}
        {isNearLimit && !isAtLimit && plan === 'free' && (
          <p className="text-sm text-warning mt-2">
            You&apos;re approaching your free tier limit. Consider upgrading to Pro.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
