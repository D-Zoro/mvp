'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import BookCard from '@/components/ui/BookCard';
import * as booksApi from '@/lib/api/books';
import { Skeleton } from '@/components/ui/skeleton';

export default function BooksPage() {
  const [search, setSearch] = useState('');

  // Fetch all books
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['books', { search }],
    queryFn: () => booksApi.getBooks(
      search ? { search } : undefined
    ),
  });

  // Extract books from paginated response
  const books = response?.items || [];

  // Filter client-side if search is provided but API doesn't filter server-side
  const filteredBooks = useMemo(() => {
    if (!search) return books;
    
    const searchLower = search.toLowerCase();
    return books.filter(
      (book) =>
        book.title.toLowerCase().includes(searchLower) ||
        book.author.toLowerCase().includes(searchLower)
    );
  }, [books, search]);

  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
      {/* Header */}
      <h1 className="text-3xl font-headline font-bold mb-8 text-on-surface">
        Browse Collection
      </h1>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by title or author..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md mb-8 p-3 rounded-xl bg-surface-container-low text-on-surface placeholder-on-surface/60 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
      />

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-lg" />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-12">
          <p className="text-on-surface/60">
            Failed to load books. Please try again later.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredBooks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-on-surface/60 text-lg">
            No books found
          </p>
        </div>
      )}

      {/* Books grid */}
      {!isLoading && !error && filteredBooks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
