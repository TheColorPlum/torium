'use client';

import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import {
  StatsCard,
  UsageMeterCard,
  CapBanner,
  BreakdownList,
} from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { useAsync } from '@/lib/hooks';
import { analytics, billing } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const { data: overview, loading: overviewLoading } = useAsync(
    () => analytics.overview(),
    []
  );

  const { data: billingStatus, loading: billingLoading } = useAsync(
    () => billing.status(),
    []
  );

  const handleUpgrade = async () => {
    try {
      const { url } = await billing.checkout();
      window.location.href = url;
    } catch {
      // Handle error silently or show toast
    }
  };

  const loading = overviewLoading || billingLoading;
  const plan = billingStatus?.plan || user?.plan || 'free';
  const usage = billingStatus?.usage || { current: 0, included: 5000 };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Cap banner */}
      {!loading && (
        <CapBanner
          current={usage.current}
          limit={usage.included}
          plan={plan}
          onUpgrade={handleUpgrade}
        />
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatsCard
          label="Total Clicks"
          value={overview?.clicks30d || 0}
          subtext="Last 30 days"
          loading={loading}
        />
        <StatsCard
          label="Active Links"
          value={overview?.linksCount || 0}
          subtext="Total links"
          loading={loading}
        />
        <StatsCard
          label="This Week"
          value={overview?.clicks7d || 0}
          subtext="Last 7 days"
          loading={loading}
        />
      </div>

      {/* Usage meter */}
      <UsageMeterCard
        current={usage.current}
        limit={usage.included}
        plan={plan}
        loading={loading}
        onUpgrade={handleUpgrade}
      />

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Links */}
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
            <BreakdownList
              title=""
              items={
                overview?.topLinks?.map((link) => ({
                  label: link.slug,
                  value: link.clicks,
                  percentage: overview.clicks30d > 0 ? (link.clicks / overview.clicks30d) * 100 : 0,
                })) ?? []
              }
              loading={loading}
              emptyMessage="No links yet"
            />
          </CardContent>
        </Card>

        {/* Top Referrers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Referrers</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownList
              title=""
              items={
                overview?.topReferrers?.map((ref) => ({
                  label: ref.referrer || 'Direct',
                  value: ref.clicks,
                  percentage: overview.clicks30d > 0 ? (ref.clicks / overview.clicks30d) * 100 : 0,
                })) ?? []
              }
              loading={loading}
              emptyMessage="No referrer data"
            />
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card>
          <CardHeader>
            <CardTitle>Top Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownList
              title=""
              items={
                overview?.topCountries?.map((c) => ({
                  label: c.country,
                  value: c.clicks,
                  percentage: overview.clicks30d > 0 ? (c.clicks / overview.clicks30d) * 100 : 0,
                })) ?? []
              }
              loading={loading}
              emptyMessage="No country data"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
