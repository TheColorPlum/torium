'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, Banner } from '@/components/ui';
import { auth } from '@/lib/api';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setError('No verification token provided');
      return;
    }

    const verifyToken = async () => {
      try {
        await auth.verify(token);
        setStatus('success');
        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } catch (err) {
        setStatus('error');
        const message = err instanceof Error ? err.message : 'Verification failed';
        setError(message);
      }
    };

    verifyToken();
  }, [searchParams, router]);

  return (
    <Card>
      <CardContent className="p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <LoadingSpinner />
            </div>
            <h1 className="text-xl font-semibold text-text-primary mb-2">
              Verifying your login
            </h1>
            <p className="text-text-secondary">
              Please wait while we verify your magic link...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-sm bg-success-bg flex items-center justify-center">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-text-primary mb-2">
              Successfully signed in
            </h1>
            <p className="text-text-secondary">
              Redirecting to your dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-sm bg-danger-bg flex items-center justify-center">
              <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-text-primary mb-2">
              Verification failed
            </h1>
            <Banner variant="danger" className="mb-4 text-left">
              {error || 'The magic link is invalid or has expired.'}
            </Banner>
            <a
              href="/login"
              className="text-accent-500 hover:text-accent-600 transition-colors duration-150 ease-out"
            >
              Try signing in again
            </a>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingFallback() {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <LoadingSpinner />
        </div>
        <h1 className="text-xl font-semibold text-text-primary mb-2">
          Loading...
        </h1>
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-text-primary">Torium</span>
        </div>

        <Suspense fallback={<LoadingFallback />}>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="w-8 h-8 spinner text-accent-500"
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
