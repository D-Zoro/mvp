'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/hooks';
import type { BookListResponse, BookResponse } from '@/types';

type BookStatus = 'draft' | 'active' | 'sold' | 'archived';

export default function SellerListingsPage() {
  const { isAuthenticated, user } = useAuth();
  const [books, setBooks] = useState<BookResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BookStatus | 'all'>('all');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'SELLER') return;

    const fetchListings = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get<BookListResponse>(
          '/api/v1/books/my-listings'
        );

        let filtered = response.items;
        if (statusFilter !== 'all') {
          filtered = filtered.filter((book) => book.status === statusFilter);
        }

        setBooks(filtered);
      } catch (err) {
        if (typeof err === 'object' && err !== null && 'message' in err) {
          setError((err as any).message);
        } else {
          setError('Failed to load listings. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [isAuthenticated, user?.role, statusFilter]);

  const handleDelete = async (bookId: string, bookTitle: string) => {
    if (!window.confirm(`Delete "${bookTitle}"? This cannot be undone.`)) {
      return;
    }

    setDeleteError(null);

    try {
      await apiClient.delete(`/api/v1/books/${bookId}`);
      setBooks((prev) => prev.filter((book) => book.id !== bookId));
    } catch (err) {
      const message =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as any).message
          : 'Failed to delete book. Please try again.';
      setDeleteError(message);
    }
  };

  const handlePublish = async (bookId: string) => {
    try {
      await apiClient.put(`/api/v1/books/${bookId}`, { status: 'active' });
      setBooks((prev) =>
        prev.map((book) =>
          book.id === bookId ? { ...book, status: 'active' } : book
        )
      );
    } catch (err) {
      const message =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as any).message
          : 'Failed to publish book. Please try again.';
      setError(message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-4">
              My Listings
            </h1>
            <p className="text-[#A4ACAF] mb-6">
              Please log in to manage your listings.
            </p>
            <Link
              href="/auth/login"
              className="inline-block bg-[#4F46E5] text-white font-medium py-3 px-6 rounded-sm hover:bg-[#3c37c4] transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user?.role !== 'SELLER') {
    return (
      <div className="min-h-screen bg-[#F9F7F2] py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-4">
              My Listings
            </h1>
            <p className="text-[#A4ACAF] mb-6">
              You must be a seller to manage listings.
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
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-4xl font-bold text-[#1A1A1A] mb-2">
              My Listings
            </h1>
            <p className="text-[#A4ACAF]">
              {books.length} book{books.length !== 1 ? 's' : ''}
            </p>
          </div>

          <Link
            href="/seller/listings/create"
            className="bg-[#4F46E5] text-white font-medium py-3 px-6 rounded-sm hover:bg-[#3c37c4] transition-colors"
          >
            + Create Listing
          </Link>
        </div>

        {/* Errors */}
        {error && (
          <div className="mb-6 p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-sm">
            <p className="text-sm text-[#F43F5E]">{error}</p>
          </div>
        )}

        {deleteError && (
          <div className="mb-6 p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-sm">
            <p className="text-sm text-[#F43F5E]">{deleteError}</p>
          </div>
        )}

        {/* Filter */}
        <div className="mb-8 flex gap-2">
          {(['all', 'draft', 'active', 'sold', 'archived'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-sm font-medium transition-colors capitalize ${
                statusFilter === status
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-white text-[#1A1A1A] border border-[#E5E7EB] hover:bg-[#F9F7F2]'
              }`}
            >
              {status === 'all' ? 'All Books' : status}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center text-[#A4ACAF]">Loading your listings...</div>
        )}

        {/* Empty State */}
        {!loading && books.length === 0 && (
          <div className="bg-white rounded-sm shadow-sm p-12 text-center">
            <svg
              className="w-24 h-24 text-[#A4ACAF] mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 4.5v15m0 0H7.5m4.5 0h4.5"
              />
            </svg>
            <p className="text-[#A4ACAF] text-lg mb-6">No listings yet</p>
            <Link
              href="/seller/listings/create"
              className="inline-block bg-[#4F46E5] text-white font-medium py-2 px-4 rounded-sm hover:bg-[#3c37c4] transition-colors"
            >
              Create Your First Listing
            </Link>
          </div>
        )}

        {/* Books Grid */}
        {!loading && books.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => (
              <div
                key={book.id}
                className="bg-white rounded-sm shadow-sm overflow-hidden border-l-4 border-[#4F46E5] hover:shadow-md transition-shadow"
              >
                {/* Image */}
                {book.primary_image && (
                  <div className="aspect-[3/4] bg-[#E5E7EB] overflow-hidden">
                    <img
                      src={book.primary_image}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-[#1A1A1A] line-clamp-2">
                      {book.title}
                    </h3>
                    <p className="text-sm text-[#A4ACAF]">{book.author}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="font-mono text-lg font-bold text-[#4F46E5]">
                      ${parseFloat(book.price).toFixed(2)}
                    </p>
                    <span
                      className={`px-2 py-1 rounded-sm text-xs font-semibold capitalize ${
                        book.status === 'draft'
                          ? 'bg-[#A4ACAF]/10 text-[#A4ACAF]'
                          : book.status === 'active'
                          ? 'bg-[#10B981]/10 text-[#10B981]'
                          : book.status === 'sold'
                          ? 'bg-[#4F46E5]/10 text-[#4F46E5]'
                          : 'bg-[#F43F5E]/10 text-[#F43F5E]'
                      }`}
                    >
                      {book.status}
                    </span>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-[#E5E7EB]">
                    <Link
                      href={`/books/${book.id}`}
                      className="block text-center py-2 bg-[#4F46E5]/10 text-[#4F46E5] font-medium rounded-sm hover:bg-[#4F46E5]/20 transition-colors text-sm"
                    >
                      View
                    </Link>

                    <Link
                      href={`/seller/listings/${book.id}/edit`}
                      className="block text-center py-2 bg-[#4F46E5] text-white font-medium rounded-sm hover:bg-[#3c37c4] transition-colors text-sm"
                    >
                      Edit
                    </Link>

                    {book.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(book.id)}
                        className="w-full py-2 bg-[#10B981]/10 text-[#10B981] font-medium rounded-sm hover:bg-[#10B981]/20 transition-colors text-sm"
                      >
                        Publish
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(book.id, book.title)}
                      className="w-full py-2 bg-[#F43F5E]/10 text-[#F43F5E] font-medium rounded-sm hover:bg-[#F43F5E]/20 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
