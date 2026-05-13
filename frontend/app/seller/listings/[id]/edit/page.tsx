import { notFound } from 'next/navigation';
import Link from 'next/link';
import BookListingForm from '@/components/BookListingForm';
import { apiClient } from '@/lib/api';
import type { BookResponse } from '@/types';
import EditListingClient from './EditListingClient';

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const book = await apiClient.get<BookResponse>(`/api/v1/books/${id}`);

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
              Edit Listing
            </h1>
            <p className="text-[#A4ACAF] mb-8">
              {book.title} by {book.author}
            </p>

            <EditListingClient initialBook={book} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
