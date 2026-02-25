import { LandingHero } from '@/components/landing/hero';
import { Button, Card, CardContent } from '@/components/ui';

// Placeholder icons
function LinkIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

const features = [
  {
    icon: LinkIcon,
    title: 'Short Links',
    description: 'Create branded short links that are easy to share and remember.',
  },
  {
    icon: QrIcon,
    title: 'QR Codes',
    description: 'Generate dynamic QR codes that update without reprinting.',
  },
  {
    icon: ChartIcon,
    title: 'Analytics',
    description: 'Track clicks, locations, and devices with real-time analytics.',
  },
];

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for getting started',
    features: [
      '5,000 tracked clicks/month',
      'Unlimited links',
      'Basic analytics',
      '30 days data retention',
    ],
    cta: 'Get started',
    ctaVariant: 'secondary' as const,
  },
  {
    name: 'Pro',
    price: '$50',
    period: '/month',
    description: 'For growing businesses',
    features: [
      '2,000,000 tracked clicks/month',
      'Unlimited links',
      'Advanced analytics',
      '24 months data retention',
      'API access',
      '$1 per 100k clicks overage',
    ],
    cta: 'Start Pro trial',
    ctaVariant: 'primary' as const,
    highlighted: true,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-bg/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-bold text-text-primary">Torium</div>
          <nav className="hidden sm:flex items-center gap-6">
            <a href="#features" className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-150">
              Features
            </a>
            <a href="#pricing" className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-150">
              Pricing
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center font-medium rounded-sm transition-colors duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 text-sm px-3 py-1.5 bg-bg border border-border text-text-primary hover:bg-bg-secondary focus:ring-accent-ring"
            >
              Sign in
            </a>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <LandingHero />

        {/* Transition line */}
        <div className="py-12 text-center bg-bg">
          <p className="text-lg text-text-secondary max-w-2xl mx-auto px-6">
            Built for small teams who want clarity, not complexity.
          </p>
        </div>

        {/* Features */}
        <section id="features" className="py-20 sm:py-24 bg-bg-secondary">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
                What small teams actually need
              </h2>
              <p className="mt-4 text-lg text-text-secondary">
                Short links, QR codes, and analytics — nothing more.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-sm bg-accent-500/10 flex items-center justify-center text-accent-500 mb-4">
                      <feature.icon />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-text-secondary">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 sm:py-24">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
                Pricing you can understand in 10 seconds.
              </h2>
              <p className="mt-4 text-lg text-text-secondary">
                No surprises. Pay only for what you use.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {pricingPlans.map((plan) => (
                <Card
                  key={plan.name}
                  className={plan.highlighted ? 'border-accent-500' : ''}
                >
                  <CardContent className="pt-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-text-primary">
                        {plan.name}
                      </h3>
                      <p className="text-text-secondary text-sm">
                        {plan.description}
                      </p>
                    </div>

                    <div className="mb-6">
                      <span className="text-4xl font-bold text-text-primary">
                        {plan.price}
                      </span>
                      <span className="text-text-secondary">{plan.period}</span>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <CheckIcon />
                          <span className="text-sm text-text-secondary">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button variant={plan.ctaVariant} className="w-full" asChild>
                      <a href="/login">{plan.cta}</a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="mt-10 text-center text-sm text-text-tertiary max-w-xl mx-auto">
              No sales calls. No usage cliffs. No enterprise negotiations. Pricing that scales linearly.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-text-secondary">
              © 2024 Torium. All rights reserved.
            </div>
            <nav className="flex items-center gap-6">
              <a href="#" className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-150">
                Privacy
              </a>
              <a href="#" className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-150">
                Terms
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
