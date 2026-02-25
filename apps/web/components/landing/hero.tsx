/**
 * Landing Hero - Atmospheric Exception
 * 
 * THIS IS THE ONLY PLACE WHERE THE FOLLOWING ARE ALLOWED:
 * - Subtle grid background
 * - Radial accent wash gradient
 * - One soft preview shadow (hero-preview)
 * 
 * DO NOT use these patterns anywhere else in the app.
 */

import { Button } from '@/components/ui';

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* ATMOSPHERIC EXCEPTION: Grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #8E4585 1px, transparent 1px),
            linear-gradient(to bottom, #8E4585 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
        aria-hidden="true"
      />

      {/* ATMOSPHERIC EXCEPTION: Radial accent wash */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(142, 69, 133, 0.08) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative max-w-5xl mx-auto px-6 py-24 sm:py-32 lg:py-40">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary tracking-tight">
            Links without the overhead.
          </h1>
          
          <p className="mt-6 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto">
            Short links and QR codes with real analytics. No tiers. No surprise invoices. Just transparent pricing.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <a href="/login">Get started free</a>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <a href="#pricing">See pricing</a>
            </Button>
          </div>

          <p className="mt-4 text-sm text-text-tertiary">
            No credit card required · Live in 60 seconds
          </p>
        </div>
      </div>
    </section>
  );
}
