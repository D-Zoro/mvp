'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BookCard from '@/components/BookCard';
import { apiClient } from '@/lib/api';
import { useCart } from '@/lib/cart';
import type { BookListResponse, BookCondition, SearchParams } from '@/types';

const CONDITIONS: { value: BookCondition; label: string }[] = [
  { value: 'MINT', label: 'Mint' },
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'VERY_GOOD', label: 'Very Good' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
];

export default function BrowsePage() {
  const router = useRouter();
  const [books, setBooks] = useState<BookListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [cartMessage, setCartMessage] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedConditions, setSelectedConditions] = useState<Set<BookCondition>>(
    new Set()
  );
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { addToCart } = useCart();

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get<{ categories: string[] }>(
          '/api/v1/books/categories'
        );
        setCategories(response.categories || []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch books when filters change
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params: SearchParams = {
        page: currentPage,
        page_size: 12,
      };

      if (searchQuery) params.q = searchQuery;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedConditions.size > 0) {
        params.condition = Array.from(selectedConditions)[0]; // API takes single condition
      }
      if (priceMin) params.min_price = parseFloat(priceMin);
      if (priceMax) params.max_price = parseFloat(priceMax);

      // Handle sort
      if (sortBy === 'price_asc') {
        params.sort = 'price_asc';
      } else if (sortBy === 'price_desc') {
        params.sort = 'price_desc';
      } else if (sortBy === 'rating') {
        params.sort = 'rating';
      } else {
        params.sort = 'newest';
      }

      // Build query string
      const queryString = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryString.append(key, String(value));
        }
      });

      const response = await apiClient.get<BookListResponse>(
        `/api/v1/books?${queryString.toString()}`
      );
      setBooks(response);
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        setError((err as any).message);
      } else {
        setError('Failed to load books. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [
    searchQuery,
    selectedCategory,
    selectedConditions,
    priceMin,
    priceMax,
    sortBy,
    currentPage,
  ]);

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchBooks();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, fetchBooks]);

  // Fetch when other filters change
  useEffect(() => {
    if (searchTimeoutRef.current === undefined) {
      setCurrentPage(1);
      fetchBooks();
    }
  }, [selectedCategory, selectedConditions, priceMin, priceMax, sortBy, fetchBooks]);

  const handleConditionChange = (condition: BookCondition) => {
    const newConditions = new Set(selectedConditions);
    if (newConditions.has(condition)) {
      newConditions.delete(condition);
    } else {
      newConditions.add(condition);
    }
    setSelectedConditions(newConditions);
  };

  const handleAddToCart = (book: any) => {
    try {
      addToCart(
        book.id,
        book.title,
        book.author,
        parseFloat(book.price),
        book.primary_image,
        1
      );
      setCartMessage(`"${book.title}" added to cart!`);
      setTimeout(() => setCartMessage(null), 2000);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-8">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-4xl font-bold mb-2 text-[#1A1A1A]">
            Browse Books
          </h1>
          <p className="text-[#A4ACAF]">
            {books?.total ? `${books.total} books available` : 'Search our collection'}
          </p>
        </div>

        {/* Cart Message */}
        {cartMessage && (
          <div className="mb-6 p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-sm">
            <p className="text-sm text-[#10B981]">✓ {cartMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-sm shadow-sm border-l-4 border-[#4F46E5] space-y-6 sticky top-24">
              <h2 className="font-serif text-lg font-semibold text-[#1A1A1A]">
                Filters
              </h2>

              {/* Search */}
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Book title, author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-3">
                  Condition
                </label>
                <div className="space-y-2">
                  {CONDITIONS.map((condition) => (
                    <label key={condition.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedConditions.has(condition.value)}
                        onChange={() => handleConditionChange(condition.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-[#1A1A1A]">{condition.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-3">
                  Price Range
                </label>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => {
                      setPriceMin(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => {
                      setPriceMax(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-sm flex items-center justify-between">
                <p className="text-sm text-[#F43F5E]">{error}</p>
                <button
                  onClick={fetchBooks}
                  className="text-sm text-[#F43F5E] hover:underline font-medium"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-sm shadow-sm p-4 animate-pulse space-y-4"
                  >
                    <div className="aspect-[3/4] bg-[#E5E7EB] rounded-sm" />
                    <div className="h-4 bg-[#E5E7EB] rounded w-3/4" />
                    <div className="h-3 bg-[#E5E7EB] rounded w-1/2" />
                    <div className="h-3 bg-[#E5E7EB] rounded w-full" />
                  </div>
                ))}
              </div>
            )}

            {/* Books Grid */}
            {!loading && books && books.items.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {books.items.map((book) => (
                    <div key={book.id} className="flex flex-col h-full">
                      <BookCard
                        id={book.id}
                        title={book.title}
                        author={book.author}
                        price={parseFloat(book.price)}
                        condition={book.condition.toUpperCase() as BookCondition}
                        coverUrl={book.primary_image}
                        seller={book.seller.first_name}
                        rating={book.review_stats?.average_rating}
                        href={`/books/${book.id}`}
                      />
                      <button
                        onClick={() => handleAddToCart(book)}
                        className="mt-3 w-full bg-[#4F46E5] text-white font-medium py-2 rounded-sm hover:bg-[#3c37c4] transition-colors"
                      >
                        Add to Cart
                      </button>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-8 border-t border-[#E5E7EB]">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-6 py-2 border border-[#E5E7EB] rounded-sm font-medium hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Previous
                  </button>

                  <div className="text-sm text-[#A4ACAF]">
                    Page {currentPage} of {books.total_pages}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage >= books.total_pages}
                    className="px-6 py-2 border border-[#E5E7EB] rounded-sm font-medium hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </>
            )}

            {/* Empty State */}
            {!loading && (!books || books.items.length === 0) && !error && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="font-serif text-2xl font-bold text-[#1A1A1A] mb-2">
                  No books found
                </h3>
                <p className="text-[#A4ACAF] mb-6">
                  Try adjusting your filters or search query
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                    setSelectedConditions(new Set());
                    setPriceMin('');
                    setPriceMax('');
                    setSortBy('newest');
                    setCurrentPage(1);
                  }}
                  className="text-[#4F46E5] hover:underline font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
