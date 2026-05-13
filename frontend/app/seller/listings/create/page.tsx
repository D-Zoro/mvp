'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BookListingForm from '@/components/BookListingForm';
import { useAuth } from '@/lib/hooks';

export default function CreateListingPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || user?.role !== 'SELLER') {
    return (
      <div className="min-h-screen bg-[#F9F7F2] py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-4">
              Create Listing
            </h1>
            <p className="text-[#A4ACAF] mb-6">
              You must be a seller to create listings.
            </p>
            <Link
              href="/browse"
              className="inline-block text-[#4F46E5] hover:underline font-medium"
            >
              Back to Browse
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-12">
      <div className="container mx-auto px-6 max-w-2xl">
        <div className="mb-8">
          <Link
            href="/seller/listings"
            className="text-[#4F46E5] hover:underline text-sm font-medium"
          >
            ← Back to Listings
          </Link>
        </div>

        <div className="bg-white rounded-sm shadow-sm p-8">
          <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-2">
            Create New Listing
          </h1>
          <p className="text-[#A4ACAF] mb-8">
            Add a book to your inventory. You can save as draft or publish immediately.
          </p>

          <BookListingForm
            onSuccess={() => router.push('/seller/listings')}
            onCancel={() => router.back()}
          />
        </div>
      </div>
    </div>
  );
}
