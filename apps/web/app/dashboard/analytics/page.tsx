'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Tabs,
  TabsList,
  Tab,
  Banner,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui';
import { AnalyticsChart, BreakdownList, StatsCard } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { useAsync } from '@/lib/hooks';
import { analytics, billing, type TimeRange } from '@/lib/api';
import { formatNumber, getShortUrl } from '@/lib/format';

export default function AnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [range, setRange] = useState<TimeRange>('30d');

  const { data: overview, loading: overviewLoading } = useAsync(
    () => analytics.overview(),
    []
  );

  const { data: clicks, loading: clicksLoading } = useAsync(
    () => analytics.clicks(range),
    [range]
  );

  const { data: referrers, loading: referrersLoading } = useAsync(
    () => analytics.referrers(range),
    [range]
  );

  const { data: countries, loading: countriesLoading } = useAsync(
    () => analytics.countries(range),
    [range]
  );

  const { data: devices, loading: devicesLoading } = useAsync(
    () => analytics.devices(range),
    [range]
  );

  const plan = user?.plan || 'free';
  const isFreeTier = plan === 'free';

  // Free tier can only see up to 30d
  const availableRanges: TimeRange[] = isFreeTier
    ? ['7d', '30d']
    : ['7d', '30d', '90d', 'all'];

  const handleRangeChange = (newRange: string) => {
    if (availableRanges.includes(newRange as TimeRange)) {
      setRange(newRange as TimeRange);
    }
  };

  const handleUpgrade = async () => {
    try {
      const { url } = await billing.checkout();
      window.location.href = url;
    } catch {
      // Handle error
    }
  };

  const loading = overviewLoading || clicksLoading;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Free tier limitation notice */}
      {isFreeTier && (
        <Banner variant="info">
          <div className="flex items-center justify-between gap-4">
            <span>
              Free tier analytics are limited to the last 30 days.{' '}
              <strong>Upgrade to Pro</strong> for up to 24 months of historical data.
            </span>
            <Button size="sm" onClick={handleUpgrade}>
              Upgrade
            </Button>
          </div>
        </Banner>
      )}

      {/* Time range selector */}
      <div className="flex justify-end">
        <Tabs value={range} onValueChange={handleRangeChange}>
          <TabsList>
            <Tab value="7d">7 days</Tab>
            <Tab value="30d">30 days</Tab>
            <Tab value="90d" disabled={isFreeTier}>
              90 days {isFreeTier && '🔒'}
            </Tab>
            <Tab value="all" disabled={isFreeTier}>
              All time {isFreeTier && '🔒'}
            </Tab>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <StatsCard
          label="Total Clicks"
          value={overview?.clicksTotal || 0}
          subtext="All time"
          loading={overviewLoading}
        />
        <StatsCard
          label="30-Day Clicks"
          value={overview?.clicks30d || 0}
          subtext="Last 30 days"
          loading={overviewLoading}
        />
        <StatsCard
          label="7-Day Clicks"
          value={overview?.clicks7d || 0}
          subtext="Last 7 days"
          loading={overviewLoading}
        />
        <StatsCard
          label="Active Links"
          value={overview?.linksCount || 0}
          subtext="Total links"
          loading={overviewLoading}
        />
      </div>

      {/* Clicks over time chart */}
      <Card>
        <CardHeader>
          <CardTitle>Clicks over time</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsChart
            data={clicks?.data || []}
            loading={clicksLoading}
            height={300}
          />
        </CardContent>
      </Card>

      {/* Top links table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Top Links</CardTitle>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.push('/dashboard/links')}
          >
            View all
          </Button>
        </CardHeader>
        <CardContent>
          {overviewLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-bg-tertiary rounded-sm" />
              ))}
            </div>
          ) : overview?.topLinks && overview.topLinks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Link</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.topLinks.map((link) => {
                  const percentage = overview.clicks30d > 0
                    ? ((link.clicks / overview.clicks30d) * 100).toFixed(1)
                    : '0';
                  return (
                    <TableRow
                      key={link.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/dashboard/links/${link.id}`)}
                    >
                      <TableCell>
                        <span className="text-accent-500 font-medium">
                          {getShortUrl(link.slug)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(link.clicks)}
                      </TableCell>
                      <TableCell className="text-right text-text-secondary">
                        {percentage}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-text-muted py-8">No link data available</p>
          )}
        </CardContent>
      </Card>

      {/* Breakdowns row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Referrers</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownList
              title=""
              items={
                referrers?.data.map((r) => ({
                  label: r.referrer || 'Direct',
                  value: r.clicks,
                  percentage: r.percentage,
                })) || []
              }
              loading={referrersLoading}
              emptyMessage="No referrer data"
              maxItems={10}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownList
              title=""
              items={
                countries?.data.map((c) => ({
                  label: `${getFlagEmoji(c.countryCode)} ${c.country}`,
                  value: c.clicks,
                  percentage: c.percentage,
                })) || []
              }
              loading={countriesLoading}
              emptyMessage="No country data"
              maxItems={10}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownList
              title=""
              items={
                devices?.data.map((d) => ({
                  label: d.device,
                  value: d.clicks,
                  percentage: d.percentage,
                })) || []
              }
              loading={devicesLoading}
              emptyMessage="No device data"
              maxItems={10}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Convert country code to flag emoji
function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
