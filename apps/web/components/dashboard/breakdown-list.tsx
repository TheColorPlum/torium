import { formatNumber, formatPercentage } from '@/lib/format';

interface BreakdownItem {
  label: string;
  value: number;
  percentage: number;
}

interface BreakdownListProps {
  title: string;
  items: BreakdownItem[];
  loading?: boolean;
  emptyMessage?: string;
  maxItems?: number;
}

export function BreakdownList({
  title,
  items,
  loading,
  emptyMessage = 'No data available',
  maxItems = 5,
}: BreakdownListProps) {
  if (loading) {
    return (
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-3">{title}</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-bg-tertiary rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  const displayItems = items.slice(0, maxItems);

  if (displayItems.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-3">{title}</h3>
        <p className="text-sm text-text-muted py-4 text-center">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-text-primary mb-3">{title}</h3>
      <div className="space-y-2">
        {displayItems.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-text-primary truncate" title={item.label}>
                  {item.label}
                </span>
                <span className="text-sm text-text-secondary ml-2 flex-shrink-0">
                  {formatNumber(item.value)}
                </span>
              </div>
              <div className="h-1.5 bg-bg-tertiary rounded-sm overflow-hidden">
                <div
                  className="h-full bg-accent-500 rounded-sm transition-[width] duration-180 ease-out"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-text-muted w-10 text-right flex-shrink-0">
              {formatPercentage(item.percentage, 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
