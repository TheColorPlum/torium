'use client';

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  UsageMeter,
  Banner,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useAsync } from '@/lib/hooks';
import { billing } from '@/lib/api';
import { formatNumberFull, formatDate } from '@/lib/format';

export default function BillingPage() {
  const { user } = useAuth();
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: billingStatus, loading } = useAsync(
    () => billing.status(),
    []
  );

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const { url } = await billing.checkout();
      window.location.href = url;
    } catch {
      // Handle error
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { url } = await billing.portal();
      window.location.href = url;
    } catch {
      // Handle error
    } finally {
      setPortalLoading(false);
    }
  };

  const plan = billingStatus?.plan || user?.plan || 'free';
  const isPro = plan === 'pro';

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-bg-tertiary rounded-sm" />
        <Card>
          <CardContent className="py-8">
            <div className="space-y-4">
              <div className="h-6 w-32 bg-bg-tertiary rounded-sm" />
              <div className="h-4 w-64 bg-bg-tertiary rounded-sm" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Current plan card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <PlanBadge plan={plan} />
          </div>
        </CardHeader>
        <CardContent>
          {isPro ? (
            <div className="space-y-6">
              {/* Pro plan details */}
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  Torium Pro
                </h3>
                <p className="text-text-secondary">
                  $50/month • Unlimited links • 2M tracked clicks/month
                </p>
              </div>

              {/* Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">
                    Monthly Usage
                  </span>
                  {billingStatus?.currentPeriodEnd && (
                    <span className="text-sm text-text-muted">
                      Resets {formatDate(billingStatus.currentPeriodEnd)}
                    </span>
                  )}
                </div>
                <UsageMeter
                  current={billingStatus?.usage.current || 0}
                  limit={billingStatus?.usage.included || 2_000_000}
                />
                <p className="text-sm text-text-secondary mt-2">
                  {formatNumberFull(billingStatus?.usage.current || 0)} of{' '}
                  {formatNumberFull(billingStatus?.usage.included || 2_000_000)} tracked clicks used
                </p>
              </div>

              {/* Overage info */}
              {(billingStatus?.usage.overage || 0) > 0 && (
                <Banner variant="info">
                  <strong>Overage this period:</strong>{' '}
                  {formatNumberFull(billingStatus?.usage.overage || 0)} clicks •{' '}
                  Billed at {billingStatus?.usage.overageRate || '$1 per 100K'}
                </Banner>
              )}

              {/* Billing status */}
              {billingStatus?.status === 'past_due' && (
                <Banner variant="danger">
                  <strong>Payment past due.</strong> Please update your payment method to avoid service interruption.
                </Banner>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Free plan details */}
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  Free Plan
                </h3>
                <p className="text-text-secondary">
                  Up to 5,000 tracked clicks/month • Basic analytics
                </p>
              </div>

              {/* Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">
                    Monthly Usage
                  </span>
                </div>
                <UsageMeter
                  current={billingStatus?.usage.current || 0}
                  limit={billingStatus?.usage.included || 5_000}
                />
                <p className="text-sm text-text-secondary mt-2">
                  {formatNumberFull(billingStatus?.usage.current || 0)} of{' '}
                  {formatNumberFull(billingStatus?.usage.included || 5_000)} tracked clicks used
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          {isPro ? (
            <Button
              variant="secondary"
              onClick={handleManageSubscription}
              disabled={portalLoading}
            >
              {portalLoading ? 'Loading...' : 'Manage Subscription'}
            </Button>
          ) : (
            <Button onClick={handleUpgrade} disabled={upgradeLoading}>
              {upgradeLoading ? 'Loading...' : 'Upgrade to Pro'}
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Feature comparison (for free users) */}
      {!isPro && (
        <Card>
          <CardHeader>
            <CardTitle>Why Upgrade to Pro?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Free column */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <PlanBadge plan="free" />
                  <span className="text-lg font-semibold text-text-primary">Free</span>
                </div>
                <ul className="space-y-3">
                  <FeatureItem included>Up to 5,000 tracked clicks/month</FeatureItem>
                  <FeatureItem included>Unlimited links</FeatureItem>
                  <FeatureItem included>Basic analytics (30 days)</FeatureItem>
                  <FeatureItem included>QR code generation</FeatureItem>
                  <FeatureItem>Custom slugs</FeatureItem>
                  <FeatureItem>Extended analytics (24 months)</FeatureItem>
                  <FeatureItem>Priority support</FeatureItem>
                </ul>
              </div>

              {/* Pro column */}
              <div className="bg-bg-secondary p-6 rounded-sm border border-accent-500">
                <div className="flex items-center gap-2 mb-4">
                  <PlanBadge plan="pro" />
                  <span className="text-lg font-semibold text-text-primary">Pro</span>
                  <span className="text-text-secondary">$50/mo</span>
                </div>
                <ul className="space-y-3">
                  <FeatureItem included>2,000,000 tracked clicks/month</FeatureItem>
                  <FeatureItem included>Unlimited links</FeatureItem>
                  <FeatureItem included>Extended analytics (24 months)</FeatureItem>
                  <FeatureItem included>QR code generation</FeatureItem>
                  <FeatureItem included>Custom slugs</FeatureItem>
                  <FeatureItem included>Overage: $1 per 100K clicks</FeatureItem>
                  <FeatureItem included>Priority support</FeatureItem>
                </ul>
                <Button className="w-full mt-6" onClick={handleUpgrade} disabled={upgradeLoading}>
                  {upgradeLoading ? 'Loading...' : 'Upgrade Now'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PlanBadge({ plan }: { plan: 'free' | 'pro' }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-sm ${
        plan === 'pro'
          ? 'bg-accent-500 text-text-inverse'
          : 'bg-bg-tertiary text-text-secondary'
      }`}
    >
      {plan === 'pro' ? 'Pro' : 'Free'}
    </span>
  );
}

function FeatureItem({
  children,
  included = false,
}: {
  children: React.ReactNode;
  included?: boolean;
}) {
  return (
    <li className="flex items-start gap-2">
      {included ? (
        <CheckIcon className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
      ) : (
        <XIcon className="w-5 h-5 text-text-muted flex-shrink-0 mt-0.5" />
      )}
      <span className={included ? 'text-text-primary' : 'text-text-muted'}>
        {children}
      </span>
    </li>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
