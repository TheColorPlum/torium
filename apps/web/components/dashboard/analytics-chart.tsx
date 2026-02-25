'use client';

import { useState, useMemo } from 'react';
import { formatNumber, formatDateShort } from '@/lib/format';

interface DataPoint {
  date: string;
  clicks: number;
}

interface AnalyticsChartProps {
  data: DataPoint[];
  loading?: boolean;
  height?: number;
}

export function AnalyticsChart({ data, loading, height = 200 }: AnalyticsChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const maxClicks = Math.max(...data.map((d) => d.clicks), 1);
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = 100; // Will be scaled to 100% via viewBox
    const chartHeight = height;
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    const points = data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1 || 1)) * innerWidth,
      y: padding.top + innerHeight - (d.clicks / maxClicks) * innerHeight,
      ...d,
    }));

    // Create path for the line
    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    // Create path for the area fill
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`;

    // Y-axis labels
    const yLabels = [0, Math.round(maxClicks / 2), maxClicks].map((value, i) => ({
      value,
      y: padding.top + innerHeight - (i / 2) * innerHeight,
    }));

    return {
      points,
      linePath,
      areaPath,
      maxClicks,
      padding,
      chartWidth,
      chartHeight,
      innerHeight,
      yLabels,
    };
  }, [data, height]);

  if (loading) {
    return (
      <div className="w-full bg-bg-tertiary rounded-sm" style={{ height }} />
    );
  }

  if (!chartData || data.length === 0) {
    return (
      <div
        className="w-full bg-bg-secondary rounded-sm flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-text-muted text-sm">No data available</p>
      </div>
    );
  }

  const hoveredPoint = hoveredIndex !== null ? chartData.points[hoveredIndex] : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${chartData.chartWidth} ${chartData.chartHeight}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        {/* Y-axis grid lines */}
        {chartData.yLabels.map((label, i) => (
          <g key={i}>
            <line
              x1={chartData.padding.left}
              y1={label.y}
              x2={chartData.chartWidth - chartData.padding.right}
              y2={label.y}
              stroke="currentColor"
              strokeWidth="0.2"
              className="text-border"
            />
            <text
              x={chartData.padding.left - 5}
              y={label.y}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-text-muted"
              style={{ fontSize: '3px' }}
            >
              {formatNumber(label.value)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path
          d={chartData.areaPath}
          fill="currentColor"
          className="text-accent-500 opacity-10"
        />

        {/* Line */}
        <path
          d={chartData.linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-accent-500"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {chartData.points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={hoveredIndex === i ? 1.5 : 0.8}
            fill="currentColor"
            className="text-accent-500 cursor-pointer"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}

        {/* X-axis labels (first, middle, last) */}
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) => {
          const point = chartData.points[i];
          if (!point) return null;
          return (
            <text
              key={i}
              x={point.x}
              y={chartData.chartHeight - 5}
              textAnchor="middle"
              className="text-text-muted"
              style={{ fontSize: '3px' }}
            >
              {formatDateShort(point.date)}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute bg-surface border border-border rounded-sm px-2 py-1 text-xs pointer-events-none z-10"
          style={{
            left: `${(hoveredPoint.x / chartData.chartWidth) * 100}%`,
            top: `${(hoveredPoint.y / chartData.chartHeight) * 100}%`,
            transform: 'translate(-50%, -100%) translateY(-8px)',
          }}
        >
          <div className="font-medium text-text-primary">
            {formatNumber(hoveredPoint.clicks)} clicks
          </div>
          <div className="text-text-muted">
            {formatDateShort(hoveredPoint.date)}
          </div>
        </div>
      )}
    </div>
  );
}
