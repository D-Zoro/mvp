'use client';

import { useRouter } from 'next/navigation';
import BookListingForm from '@/components/BookListingForm';
import { useAuth } from '@/lib/hooks';
import type { BookResponse } from '@/types';

interface EditListingClientProps {
  initialBook: BookResponse;
}

export default function EditListingClient({ initialBook }: EditListingClientProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || user?.role !== 'SELLER') {
    return (
      <div className="text-center">
        <p className="text-[#A4ACAF] mb-6">
          You must be a seller to edit listings.
        </p>
      </div>
    );
  }

  return (
    <BookListingForm
      initialBook={initialBook}
      onSuccess={() => router.push('/seller/listings')}
      onCancel={() => router.back()}
    />
  );
}
