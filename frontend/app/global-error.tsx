'use client';

import Link from 'next/link';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center py-12">
          <div className="container mx-auto px-6 max-w-md text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="font-serif text-4xl font-bold text-[#1A1A1A] mb-2">
                Something went wrong
              </h1>
              <p className="text-[#A4ACAF]">
                We encountered an unexpected error. Please try again or contact support.
              </p>
            </div>

            {error.message && (
              <div className="mb-6 p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-sm">
                <p className="text-sm text-[#F43F5E] font-mono">{error.message}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => reset()}
                className="w-full bg-[#4F46E5] text-white font-medium py-3 rounded-sm hover:bg-[#3c37c4] transition-colors"
              >
                Try Again
              </button>

              <Link
                href="/"
                className="block bg-white text-[#4F46E5] font-medium py-3 rounded-sm border border-[#4F46E5] hover:bg-[#F9F7F2] transition-colors"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
