'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Book } from '@/lib/api/types';

import { useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';

interface BookCardProps {
  book: Book;
}

const BOOK_COVER_PLACEHOLDER = 'https://via.placeholder.com/128x192?text=No+Cover';

export default function BookCard({ book }: BookCardProps) {
  const bookImage = book.images?.[0] || BOOK_COVER_PLACEHOLDER;
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(book);
    toast.success('Added to cart');
  };

  return (
    <Link href={`/books/${book.id}`}>
      <div className="bg-white/80 backdrop-blur-xl rounded-xl p-6 relative mt-12 cursor-pointer hover:shadow-md transition-shadow">
        {/* Book Cover Image - Absolutely positioned */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-48 rounded shadow-lg overflow-hidden">
          <Image
            src={bookImage}
            alt={`${book.title} cover`}
            width={128}
            height={192}
            className="w-full h-full object-cover transition-transform hover:-translate-y-2"
            priority={false}
          />
        </div>

        {/* Content Section - Below Image */}
        <div className="pt-40">
          {/* Title */}
          <h3 className="font-headline font-bold text-lg text-center line-clamp-2">
            {book.title}
          </h3>

          {/* Author */}
          <p className="text-sm text-outline text-center mb-4">
            {book.author}
          </p>

          {/* Price */}
          <p className="text-primary font-bold text-xl text-center">
            ${parseFloat(book.price).toFixed(2)}
          </p>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            className="border border-outline/20 bg-white/50 hover:bg-primary hover:text-white transition-colors rounded-lg px-4 py-2 w-full mt-4"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </Link>
  );
}
