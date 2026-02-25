'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Tabs,
  TabsList,
  Tab,
  TabPanel,
  Banner,
} from '@/components/ui';
import {
  AnalyticsChart,
  BreakdownList,
  LinkModal,
  DeleteModal,
} from '@/components/dashboard';
import { useAsync } from '@/lib/hooks';
import { links as linksApi, analytics, type TimeRange } from '@/lib/api';
import { formatDate, formatUrl, getShortUrl, copyToClipboard } from '@/lib/format';

export default function LinkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const linkId = params.id as string;

  const [range, setRange] = useState<TimeRange>('7d');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: link, loading: linkLoading, refetch: refetchLink } = useAsync(
    () => linksApi.get(linkId),
    [linkId]
  );

  const { data: linkAnalytics, loading: analyticsLoading } = useAsync(
    () => analytics.linkAnalytics(linkId, range),
    [linkId, range]
  );

  const handleCopyLink = async () => {
    if (link) {
      const success = await copyToClipboard(getShortUrl(link.slug));
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleDelete = async () => {
    await linksApi.delete(linkId);
    router.push('/dashboard/links');
  };

  const handleToggleStatus = async () => {
    if (link) {
      await linksApi.update(link.id, {
        status: link.status === 'active' ? 'paused' : 'active',
      });
      refetchLink();
    }
  };

  const loading = linkLoading || analyticsLoading;

  if (linkLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-32 bg-bg-tertiary rounded-sm" />
        <Card>
          <CardContent className="py-8">
            <div className="space-y-4">
              <div className="h-6 w-48 bg-bg-tertiary rounded-sm" />
              <div className="h-4 w-96 bg-bg-tertiary rounded-sm" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="max-w-6xl mx-auto">
        <Banner variant="danger">Link not found</Banner>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => router.push('/dashboard/links')}
        >
          ← Back to links
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/links')}
        className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 ease-out flex items-center gap-1"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to links
      </button>

      {/* Link info card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="truncate">{getShortUrl(link.slug)}</CardTitle>
              <StatusBadge status={link.status} />
            </div>
            <p className="text-sm text-text-secondary truncate" title={link.destination}>
              → {formatUrl(link.destination, 80)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={handleCopyLink}>
              {copied ? (
                <span className="flex items-center gap-1">
                  <CheckIcon className="w-4 h-4" />
                  Copied!
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <CopyIcon className="w-4 h-4" />
                  Copy
                </span>
              )}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleToggleStatus}>
              {link.status === 'active' ? 'Pause' : 'Resume'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(true)}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-text-muted">Created:</span>{' '}
              <span className="text-text-primary">{formatDate(link.createdAt)}</span>
            </div>
            <div>
              <span className="text-text-muted">7-day clicks:</span>{' '}
              <span className="text-text-primary font-medium">{link.clicks7d.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-text-muted">30-day clicks:</span>{' '}
              <span className="text-text-primary font-medium">{link.clicks30d.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Analytics</CardTitle>
            <Tabs value={range} onValueChange={(v) => setRange(v as TimeRange)}>
              <TabsList>
                <Tab value="7d">7 days</Tab>
                <Tab value="30d">30 days</Tab>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {/* Clicks over time chart */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-text-primary mb-4">Clicks over time</h3>
            <AnalyticsChart
              data={linkAnalytics?.clicksOverTime.data || []}
              loading={analyticsLoading}
              height={200}
            />
          </div>

          {/* Breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BreakdownList
              title="Referrers"
              items={
                linkAnalytics?.referrers.data.map((r) => ({
                  label: r.referrer || 'Direct',
                  value: r.clicks,
                  percentage: r.percentage,
                })) || []
              }
              loading={analyticsLoading}
              emptyMessage="No referrer data"
            />
            <BreakdownList
              title="Countries"
              items={
                linkAnalytics?.countries.data.map((c) => ({
                  label: c.country,
                  value: c.clicks,
                  percentage: c.percentage,
                })) || []
              }
              loading={analyticsLoading}
              emptyMessage="No country data"
            />
            <BreakdownList
              title="Devices"
              items={
                linkAnalytics?.devices.data.map((d) => ({
                  label: d.device,
                  value: d.clicks,
                  percentage: d.percentage,
                })) || []
              }
              loading={analyticsLoading}
              emptyMessage="No device data"
            />
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <LinkModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        link={link}
        onSuccess={() => refetchLink()}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Link"
        description={`Are you sure you want to delete "${getShortUrl(link.slug)}"? This action cannot be undone and all analytics data will be lost.`}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: 'active' | 'paused' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm ${
        status === 'active'
          ? 'bg-success-bg text-success'
          : 'bg-bg-tertiary text-text-muted'
      }`}
    >
      {status === 'active' ? 'Active' : 'Paused'}
    </span>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
