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
            Smart links that grow
            <br />
            <span className="text-accent-500">with your business</span>
          </h1>
          
          <p className="mt-6 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto">
            Create short links and QR codes with powerful analytics. 
            Know exactly how your content performs.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">
              Get started free
            </Button>
            <Button variant="secondary" size="lg">
              See pricing
            </Button>
          </div>
        </div>

        {/* ATMOSPHERIC EXCEPTION: Preview card with hero-preview shadow */}
        <div className="mt-16 sm:mt-20">
          <div
            className="relative mx-auto max-w-4xl bg-surface border border-border rounded-md shadow-hero-preview overflow-hidden"
          >
            {/* Mock dashboard preview */}
            <div className="bg-bg-secondary border-b border-border px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 ml-4">
                <div className="w-48 h-4 bg-bg-tertiary rounded" />
              </div>
            </div>
            <div className="p-6 min-h-[280px]">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-bg-secondary rounded-sm p-4">
                    <div className="w-16 h-3 bg-bg-tertiary rounded mb-2" />
                    <div className="w-24 h-6 bg-accent-500/20 rounded" />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-32 h-4 bg-bg-tertiary rounded" />
                    <div className="flex-1 h-4 bg-bg-secondary rounded" />
                    <div className="w-16 h-4 bg-bg-tertiary rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
