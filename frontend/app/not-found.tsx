import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center py-12">
      <div className="container mx-auto px-6 max-w-md text-center">
        <div className="mb-6">
          <div className="text-7xl font-bold text-[#4F46E5] mb-4">404</div>
          <h1 className="font-serif text-4xl font-bold text-[#1A1A1A] mb-2">
            Page not found
          </h1>
          <p className="text-[#A4ACAF]">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/browse"
            className="block bg-[#4F46E5] text-white font-medium py-3 rounded-sm hover:bg-[#3c37c4] transition-colors"
          >
            Browse Books
          </Link>

          <Link
            href="/"
            className="block bg-white text-[#4F46E5] font-medium py-3 rounded-sm border border-[#4F46E5] hover:bg-[#F9F7F2] transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
