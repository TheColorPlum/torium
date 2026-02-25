import { Card, CardHeader, CardTitle, CardContent, UsageMeter, Button } from '@/components/ui';

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary mb-1">Total Clicks</div>
            <div className="text-3xl font-bold text-text-primary">1,234</div>
            <div className="text-sm text-text-muted mt-1">This month</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary mb-1">Active Links</div>
            <div className="text-3xl font-bold text-text-primary">12</div>
            <div className="text-sm text-text-muted mt-1">Across all campaigns</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary mb-1">QR Scans</div>
            <div className="text-3xl font-bold text-text-primary">567</div>
            <div className="text-sm text-text-muted mt-1">This month</div>
          </CardContent>
        </Card>
      </div>

      {/* Usage meter */}
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <UsageMeter current={1234} limit={5000} />
          <p className="text-sm text-text-secondary mt-4">
            You&apos;ve used 1,234 of your 5,000 tracked clicks this month.
          </p>
        </CardContent>
      </Card>

      {/* Recent links placeholder */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Links</CardTitle>
          <Button size="sm">Create link</Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-text-secondary">
              Dashboard business logic will be implemented in a later milestone.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
