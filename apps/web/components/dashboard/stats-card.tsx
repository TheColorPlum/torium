import { Card, CardContent } from '@/components/ui';
import { formatNumber } from '@/lib/format';

interface StatsCardProps {
  label: string;
  value: number;
  subtext?: string;
  loading?: boolean;
}

export function StatsCard({ label, value, subtext, loading }: StatsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-4 w-24 bg-bg-tertiary rounded-sm mb-2" />
          <div className="h-9 w-20 bg-bg-tertiary rounded-sm mb-1" />
          {subtext && <div className="h-4 w-32 bg-bg-tertiary rounded-sm" />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-text-secondary mb-1">{label}</div>
        <div className="text-3xl font-bold text-text-primary">{formatNumber(value)}</div>
        {subtext && <div className="text-sm text-text-muted mt-1">{subtext}</div>}
      </CardContent>
    </Card>
  );
}
