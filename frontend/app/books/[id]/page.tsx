import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import type { BookResponse, ReviewListResponse, ReviewStats } from '@/types';

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    // Fetch book details, reviews, and stats in parallel
    const [book, reviewsData, stats] = await Promise.all([
      apiClient.get<BookResponse>(`/api/v1/books/${id}`),
      apiClient.get<ReviewListResponse>(`/api/v1/books/${id}/reviews?page=1&page_size=10`),
      apiClient.get<ReviewStats>(`/api/v1/books/${id}/reviews/stats`),
    ]).catch(() => {
      notFound();
    });

    return (
      <div className="min-h-screen bg-[#F9F7F2] py-8">
        <div className="container mx-auto px-6">
          {/* Breadcrumb */}
          <div className="mb-6 text-sm text-[#A4ACAF]">
            <Link href="/browse" className="text-[#4F46E5] hover:underline">
              Browse Books
            </Link>
            {' / '}
            <span>{book.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Left: Book Image */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-sm shadow-sm overflow-hidden sticky top-24">
                <div className="aspect-[3/4] bg-gradient-to-br from-[#F9F7F2] to-[#E5E7EB] flex items-center justify-center">
                  {book.primary_image ? (
                    <img
                      src={book.primary_image}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-8">
                      <svg
                        className="w-16 h-16 text-[#A4ACAF] mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17.25m20-11c5.5 0 10 4.745 10 11m-21-4.5h20.25"
                        />
                      </svg>
                      <span className="text-[#A4ACAF]">No cover image</span>
                    </div>
                  )}
                </div>

                {/* Price & Actions */}
                <div className="p-6 border-t border-[#E5E7EB] space-y-4">
                  <div>
                    <p className="text-[#A4ACAF] text-sm mb-1">Price</p>
                    <p className="font-mono text-3xl font-bold text-[#4F46E5]">
                      ${parseFloat(book.price).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[#A4ACAF] text-sm mb-1">Condition</p>
                    <span className="inline-block px-3 py-1 bg-[#4F46E5]/10 text-[#4F46E5] rounded-sm text-sm font-semibold">
                      {book.condition}
                    </span>
                  </div>

                  <button className="w-full bg-[#4F46E5] text-white font-medium py-3 rounded-sm hover:bg-[#3c37c4] transition-colors">
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Book Info */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title & Author */}
              <div>
                <h1 className="font-serif text-4xl font-bold text-[#1A1A1A] mb-2">
                  {book.title}
                </h1>
                <p className="text-lg text-[#A4ACAF] mb-4">by {book.author}</p>
              </div>

              {/* Seller */}
              {book.seller && (
                <div className="bg-white p-4 rounded-sm border-l-4 border-[#4F46E5]">
                  <p className="text-sm text-[#A4ACAF] mb-1">Sold by</p>
                  <p className="font-medium text-[#1A1A1A]">
                    {book.seller.first_name} {book.seller.last_name}
                  </p>
                </div>
              )}

              {/* Book Details */}
              <div className="bg-white p-6 rounded-sm shadow-sm space-y-4">
                <h3 className="font-serif text-lg font-semibold text-[#1A1A1A] border-b border-[#E5E7EB] pb-4">
                  Book Details
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {book.isbn && (
                    <>
                      <p className="text-sm text-[#A4ACAF]">ISBN</p>
                      <p className="font-mono text-sm text-[#1A1A1A]">{book.isbn}</p>
                    </>
                  )}

                  {book.category && (
                    <>
                      <p className="text-sm text-[#A4ACAF]">Category</p>
                      <p className="text-sm text-[#1A1A1A]">{book.category}</p>
                    </>
                  )}

                  {book.status && (
                    <>
                      <p className="text-sm text-[#A4ACAF]">Status</p>
                      <p className="text-sm text-[#1A1A1A] capitalize">{book.status}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              {book.description && (
                <div className="bg-white p-6 rounded-sm shadow-sm">
                  <h3 className="font-serif text-lg font-semibold text-[#1A1A1A] border-b border-[#E5E7EB] pb-4 mb-4">
                    Description
                  </h3>
                  <p className="text-[#1A1A1A] leading-relaxed whitespace-pre-wrap">
                    {book.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="bg-white rounded-sm shadow-sm overflow-hidden border-l-4 border-[#4F46E5]">
            {/* Reviews Header */}
            <div className="p-6 border-b border-[#E5E7EB]">
              <h2 className="font-serif text-2xl font-semibold text-[#1A1A1A] mb-4">
                Reviews
              </h2>

              {/* Rating Stats */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="font-mono text-4xl font-bold text-[#4F46E5]">
                    {stats.average_rating?.toFixed(1) || '—'}
                  </p>
                  <p className="text-sm text-[#A4ACAF]">
                    {stats.total_reviews || 0} review{stats.total_reviews !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Rating Distribution */}
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs text-[#A4ACAF] w-8">{star}★</span>
                      <div className="flex-1 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#4F46E5]"
                          style={{
                            width: `${stats.distribution?.[star as keyof typeof stats.distribution]
                              ? (stats.distribution[star as keyof typeof stats.distribution] / stats.total_reviews) * 100
                              : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-[#A4ACAF] w-8">
                        {stats.distribution?.[star as keyof typeof stats.distribution] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reviews List */}
            <div className="divide-y divide-[#E5E7EB]">
              {reviewsData.items.length > 0 ? (
                reviewsData.items.map((review) => (
                  <div key={review.id} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-[#1A1A1A]">
                          {review.reviewer.first_name} {review.reviewer.last_name}
                        </p>
                        <p className="text-xs text-[#A4ACAF]">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {review.is_verified_purchase && (
                        <span className="inline-block px-2 py-1 bg-[#10B981]/10 text-[#10B981] rounded-sm text-xs font-semibold">
                          ✓ Verified Purchase
                        </span>
                      )}
                    </div>

                    <div className="mb-2 text-[#4F46E5]">
                      {'★'.repeat(review.rating)}
                      {'☆'.repeat(5 - review.rating)}
                    </div>

                    <p className="text-[#1A1A1A] text-sm">{review.comment}</p>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <p className="text-[#A4ACAF]">No reviews yet. Be the first!</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {reviewsData.total_pages > 1 && (
              <div className="p-6 border-t border-[#E5E7EB] flex justify-center">
                <button className="text-[#4F46E5] hover:underline font-medium">
                  Load More Reviews
                </button>
              </div>
            )}
          </div>

          {/* Continue Shopping */}
          <div className="mt-12 text-center">
            <Link
              href="/browse"
              className="text-[#4F46E5] hover:underline font-medium"
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
