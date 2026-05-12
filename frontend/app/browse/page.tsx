'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BookCard from '@/components/BookCard';
import { apiClient } from '@/lib/api';
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

  const handleAddToCart = (bookId: string) => {
    // Store in cart (implementation in Wave 3)
    console.log('Add to cart:', bookId);
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
                        onClick={() => handleAddToCart(book.id)}
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
    price: 21.00,
    condition: 'good' as const,
    seller: 'Sarah Chen',
    rating: 4.9,
    href: '/books/5',
  },
  {
    id: '6',
    title: 'Modest Proposal & Other Satires',
    author: 'Jonathan Swift',
    price: 14.25,
    condition: 'fair' as const,
    seller: 'Tom Anderson',
    rating: 4.5,
    href: '/books/6',
  },
  {
    id: '7',
    title: 'The Second Sex',
    author: 'Simone de Beauvoir',
    price: 28.99,
    condition: 'good' as const,
    seller: 'Lisa Rodriguez',
    rating: 4.9,
    href: '/books/7',
  },
  {
    id: '8',
    title: 'Infinite Jest',
    author: 'David Foster Wallace',
    price: 16.50,
    condition: 'fair' as const,
    seller: 'John Murphy',
    rating: 4.4,
    href: '/books/8',
  },
  {
    id: '9',
    title: 'The Stranger',
    author: 'Albert Camus',
    price: 11.75,
    condition: 'like_new' as const,
    seller: 'Anna Zhang',
    rating: 4.7,
    href: '/books/9',
  },
];

export default function BrowsePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9F7F2]">
      <Header />

      <main className="flex-1">
        {/* Page Header */}
        <section className="container mx-auto px-6 py-12 border-b border-[#E5E7EB]">
          <h1 className="font-serif text-4xl font-bold mb-4">Browse All Books</h1>
          <p className="text-[#A4ACAF] max-w-2xl">
            Explore our collection of carefully curated used books. Filter by genre,
            condition, or price to find exactly what you&rsquo;re looking for.
          </p>
        </section>

        {/* Filters & Content */}
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Sidebar Filters */}
            <aside className="lg:col-span-1">
              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-xs font-semibold text-[#A4ACAF] text-transform uppercase letter-spacing-wide mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Title, author, ISBN…"
                    className="w-full"
                  />
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-xs font-semibold text-[#A4ACAF] text-transform uppercase letter-spacing-wide mb-3">
                    Price Range
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="price" value="0-10" />
                      <span className="text-sm">Under $10</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="price" value="10-20" />
                      <span className="text-sm">$10 – $20</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="price" value="20-50" />
                      <span className="text-sm">$20 – $50</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="price" value="50+" />
                      <span className="text-sm">$50+</span>
                    </label>
                  </div>
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-xs font-semibold text-[#A4ACAF] text-transform uppercase letter-spacing-wide mb-3">
                    Condition
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="condition" value="like_new" />
                      <span className="text-sm">Like New</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="condition" value="good" />
                      <span className="text-sm">Good</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="condition" value="fair" />
                      <span className="text-sm">Fair</span>
                    </label>
                  </div>
                </div>

                {/* Genre */}
                <div>
                  <label className="block text-xs font-semibold text-[#A4ACAF] text-transform uppercase letter-spacing-wide mb-3">
                    Genre
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="genre" value="fiction" />
                      <span className="text-sm">Fiction</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="genre" value="nonfiction" />
                      <span className="text-sm">Non-Fiction</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="genre" value="academic" />
                      <span className="text-sm">Academic</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="genre" value="poetry" />
                      <span className="text-sm">Poetry</span>
                    </label>
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-xs font-semibold text-[#A4ACAF] text-transform uppercase letter-spacing-wide mb-3">
                    Seller Rating
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="rating" value="4.5+" />
                      <span className="text-sm">4.5+ ★</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="rating" value="4.0+" />
                      <span className="text-sm">4.0+ ★</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="rating" value="3.5+" />
                      <span className="text-sm">3.5+ ★</span>
                    </label>
                  </div>
                </div>

                <button className="w-full bg-[#4F46E5] text-white font-medium py-2 rounded-sm hover:bg-[#3c37c4] transition-colors">
                  Apply Filters
                </button>
              </div>
            </aside>

            {/* Books Grid */}
            <div className="lg:col-span-4">
              {/* Sort Options */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#E5E7EB]">
                <p className="text-sm text-[#A4ACAF]">
                  Showing <span className="font-semibold">{books.length}</span> books
                </p>
                <select className="text-sm border-b-2 border-[#E5E7EB] focus:border-b-2 focus:border-[#4F46E5] bg-transparent">
                  <option>Sort: Newest</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Rating: High to Low</option>
                </select>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {books.map((book) => (
                  <BookCard key={book.id} {...book} />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex justify-center gap-2 mt-12 pt-8 border-t border-[#E5E7EB]">
                <button className="px-3 py-2 border border-[#E5E7EB] rounded-sm hover:bg-white transition-colors">
                  ←
                </button>
                {[1, 2, 3, 4, 5].map((page) => (
                  <button
                    key={page}
                    className={`px-3 py-2 rounded-sm transition-colors ${
                      page === 1
                        ? 'bg-[#4F46E5] text-white'
                        : 'border border-[#E5E7EB] hover:bg-white'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button className="px-3 py-2 border border-[#E5E7EB] rounded-sm hover:bg-white transition-colors">
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
