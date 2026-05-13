'use client';

import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BrowseError({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-[#F9F7F2] py-12">
      <div className="container mx-auto px-6 max-w-md">
        <div className="text-center">
          <div className="mb-6">
            <div className="text-6xl mb-4">📚</div>
            <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-2">
              Failed to load books
            </h1>
            <p className="text-[#A4ACAF] mb-6">
              We couldn't load the book catalog. Please try again.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => reset()}
              className="w-full bg-[#4F46E5] text-white font-medium py-2 rounded-sm hover:bg-[#3c37c4] transition-colors"
            >
              Try Again
            </button>

            <Link
              href="/"
              className="block text-[#4F46E5] hover:underline font-medium text-sm"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
