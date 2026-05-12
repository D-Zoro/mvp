"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import BookCard from "@/components/ui/BookCard";
import * as booksApi from "@/lib/api/books";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: books, isLoading, error } = useQuery({
    queryKey: ["books"],
    queryFn: () => booksApi.getBooks(),
  });

  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/20 blur-[120px] rounded-full"></div>
        </div>

        {/* Content */}
        <div className="text-center max-w-2xl px-8">
          <h1 className="text-5xl md:text-6xl font-headline font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Curated Literary Excellence
          </h1>
          <p className="text-lg md:text-xl text-on-surface/80 mb-8 leading-relaxed">
            Discover rare editions, first prints, and timeless classics curated for collectors and book lovers.
          </p>
          <Link
            href="/books"
            className="inline-block px-8 py-3 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Explore Collection
          </Link>
        </div>
      </section>

      {/* Featured Section */}
      <section className="max-w-7xl mx-auto px-8 py-20">
        <h2 className="text-3xl font-headline font-bold mb-12 text-on-surface">
          New Arrivals
        </h2>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
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

        {/* Books grid */}
        {!isLoading && !error && books && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {books.items.slice(0, 8).map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
