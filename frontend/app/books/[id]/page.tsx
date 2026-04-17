'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import * as booksApi from '@/lib/api/books';
import { Skeleton } from '@/components/ui/skeleton';

export default function BookDetailsPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : undefined;

  const { data: book, isLoading, error } = useQuery({
    queryKey: ['book', id],
    queryFn: () => (id ? booksApi.getBook(id) : Promise.reject('No ID')),
    enabled: !!id,
  });

  if (!id) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-12">
        <p className="text-on-surface">Invalid book ID.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Left Column - Image Skeleton */}
        <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-2xl">
          <Skeleton className="w-full h-full" />
        </div>

        {/* Right Column - Content Skeleton */}
        <div>
          {/* Title */}
          <Skeleton className="h-12 w-3/4 mb-2" />

          {/* Author */}
          <Skeleton className="h-6 w-1/2 mb-6" />

          {/* Price */}
          <Skeleton className="h-10 w-1/3 mb-8" />

          {/* Description */}
          <div className="space-y-3 mb-8">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Details Box */}
          <Skeleton className="h-32 w-full mb-8" />

          {/* Button */}
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-12">
        <p className="text-2xl font-headline font-bold text-on-surface">Book not found</p>
      </div>
    );
  }

  const price = typeof book.price === 'string' ? parseFloat(book.price) : book.price;
  const formattedPrice = isNaN(price) ? '0.00' : price.toFixed(2);
  const imageUrl = book.images?.[0] || 'https://via.placeholder.com/400x600?text=No+Cover';

  return (
    <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 md:grid-cols-2 gap-12">
      {/* Left Column - Large Image */}
      <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-2xl">
        <Image
          src={imageUrl}
          alt={book.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>

      {/* Right Column - Book Details */}
      <div>
        {/* Title */}
        <h1 className="text-4xl font-headline font-bold mb-2 text-on-surface">
          {book.title}
        </h1>

        {/* Author */}
        <p className="text-xl text-outline mb-6">{book.author}</p>

        {/* Price */}
        <p className="text-3xl text-primary font-bold mb-8">${formattedPrice}</p>

        {/* Description */}
        {book.description && (
          <div className="prose text-on-surface-variant mb-8 max-w-none">
            <p>{book.description}</p>
          </div>
        )}

        {/* Details Box */}
        <div className="bg-surface-container-low p-6 rounded-xl mb-8 space-y-4">
          <div>
            <p className="text-sm text-outline font-semibold">Condition</p>
            <p className="text-on-surface capitalize">{book.condition}</p>
          </div>
          {book.isbn && (
            <div>
              <p className="text-sm text-outline font-semibold">ISBN</p>
              <p className="text-on-surface">{book.isbn}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-outline font-semibold">Seller</p>
            <p className="text-on-surface">{book.seller_id}</p>
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-container transition-colors shadow-lg shadow-primary/20"
          onClick={() => {
            // TODO: Implement add to cart functionality
            console.log('Add to cart:', book.id);
          }}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
