'use client';

import { useState } from 'react';
import { Button, Input, Card, CardContent, Banner } from '@/components/ui';
import { auth } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await auth.requestMagicLink(email);
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send magic link';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <span className="text-3xl font-bold text-text-primary">Torium</span>
          </a>
        </div>

        <Card>
          <CardContent className="p-8">
            {success ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-sm bg-success-bg flex items-center justify-center">
                  <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-text-primary mb-2">
                  Check your email
                </h1>
                <p className="text-text-secondary mb-6">
                  We sent a magic link to <strong className="text-text-primary">{email}</strong>. 
                  Click the link to sign in.
                </p>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  className="text-sm text-accent-500 hover:text-accent-600 transition-colors duration-150 ease-out"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-semibold text-text-primary mb-2">
                  Sign in to Torium
                </h1>
                <p className="text-text-secondary mb-6">
                  Enter your email to receive a magic link.
                </p>

                {error && (
                  <Banner variant="danger" className="mb-4">
                    {error}
                  </Banner>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1.5">
                        Email address
                      </label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        autoFocus
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading || !email.trim()}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <LoadingSpinner />
                          Sending...
                        </span>
                      ) : (
                        'Send magic link'
                      )}
                    </Button>
                  </div>
                </form>

                <p className="text-center text-sm text-text-muted mt-6">
                  By continuing, you agree to our{' '}
                  <a href="/terms" className="text-accent-500 hover:text-accent-600 transition-colors duration-150 ease-out">
                    Terms
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-accent-500 hover:text-accent-600 transition-colors duration-150 ease-out">
                    Privacy Policy
                  </a>
                  .
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-text-muted mt-4">
          <a href="/" className="hover:text-text-secondary transition-colors duration-150 ease-out">
            ← Back to home
          </a>
        </p>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="w-4 h-4 spinner"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
