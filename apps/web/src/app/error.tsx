'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Error Boundary caught an error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-n-black flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111] border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-n-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Something went wrong!</h2>
        <p className="text-n-text/80 mb-8 text-sm leading-relaxed">
          We experienced an unexpected error. Our engineering team has been notified.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-n-red hover:bg-n-red-hover text-white font-bold rounded-lg transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
