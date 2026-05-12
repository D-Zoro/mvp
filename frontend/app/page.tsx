import BookCard from '@/components/BookCard';
import Link from 'next/link';

// Mock data for demo
const featuredBooks = [
  {
    id: '1',
    title: 'The Elements of Style',
    author: 'William Strunk Jr.',
    price: 12.99,
    condition: 'like_new' as const,
    seller: 'Jane Smith',
    rating: 4.8,
    href: '/books/1',
  },
  {
    id: '2',
    title: 'On Typography',
    author: 'Erik Spiekermann',
    price: 24.50,
    condition: 'good' as const,
    seller: 'Marcus Lee',
    rating: 4.9,
    href: '/books/2',
  },
  {
    id: '3',
    title: 'Thinking with Type',
    author: 'Ellen Lupton',
    price: 18.75,
    condition: 'fair' as const,
    seller: 'Emma Wilson',
    rating: 4.6,
    href: '/books/3',
  },
  {
    id: '4',
    title: 'A Room of One\'s Own',
    author: 'Virginia Woolf',
    price: 9.99,
    condition: 'like_new' as const,
    seller: 'David Park',
    rating: 4.7,
    href: '/books/4',
  },
  {
    id: '5',
    title: 'The Craft of Research',
    author: 'Wayne C. Booth',
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
];

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 items-center">
          {/* Left: Text (occupies 3/5) */}
          <div className="md:col-span-3 space-y-6">
            <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight">
              Discover Curated Books,{' '}
              <span className="text-[#4F46E5]">Purposefully</span>
            </h1>

            <p className="text-lg text-[#A4ACAF] leading-relaxed max-w-lg">
              Books4All is a modern marketplace for quality used books. No clutter. No
              noise. Just beautiful books, trusted sellers, and thoughtful curation.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/browse"
                className="inline-block bg-[#4F46E5] text-white font-medium px-8 py-3 rounded-sm hover:bg-[#3c37c4] transition-colors text-center"
              >
                Start Browsing
              </Link>
              <Link
                href="/sell"
                className="inline-block border-2 border-[#1A1A1A] text-[#1A1A1A] font-medium px-8 py-3 rounded-sm hover:bg-[#1A1A1A] hover:text-white transition-colors text-center"
              >
                Become a Seller
              </Link>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-8 border-t border-[#E5E7EB]">
              <div>
                <div className="font-mono font-bold text-2xl text-[#4F46E5]">
                  12.5k+
                </div>
                <p className="text-sm text-[#A4ACAF]">Books Listed</p>
              </div>
              <div>
                <div className="font-mono font-bold text-2xl text-[#4F46E5]">
                  3.8k+
                </div>
                <p className="text-sm text-[#A4ACAF]">Trusted Sellers</p>
              </div>
              <div>
                <div className="font-mono font-bold text-2xl text-[#4F46E5]">
                  98%
                </div>
                <p className="text-sm text-[#A4ACAF]">Positive Reviews</p>
              </div>
            </div>
          </div>

          {/* Right: Whitespace (occupies 2/5) – breathing room */}
          <div className="hidden md:block md:col-span-2" />
        </div>
      </section>

      {/* Featured Books Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="mb-12">
          <h2 className="font-serif text-3xl font-bold mb-2">Featured This Week</h2>
          <p className="text-[#A4ACAF]">
            Hand-picked selections from our most trusted sellers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredBooks.map((book) => (
            <BookCard key={book.id} {...book} />
          ))}
        </div>

        <div className="text-center pt-12">
          <Link
            href="/browse"
            className="inline-block text-[#4F46E5] font-medium hover:underline"
          >
            View All Books →
          </Link>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white border-t border-[#E5E7EB] py-16">
        <div className="container mx-auto px-6">
          <h2 className="font-serif text-3xl font-bold mb-12 text-center">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                number: '1',
                title: 'Browse & Discover',
                description:
                  'Explore our curated collection of quality used books across all genres and subjects.',
              },
              {
                number: '2',
                title: 'Review & Verify',
                description:
                  'Read detailed condition reports and seller reviews before making a purchase decision.',
              },
              {
                number: '3',
                title: 'Order & Receive',
                description:
                  'Complete checkout securely and receive your books with care and attention to detail.',
              },
            ].map((step) => (
              <div key={step.number} className="text-center space-y-4">
                <div className="inline-block w-12 h-12 border-2 border-[#4F46E5] rounded-sm flex items-center justify-center">
                  <span className="font-serif font-bold text-lg text-[#4F46E5]">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-serif font-semibold text-xl">{step.title}</h3>
                <p className="text-[#A4ACAF] max-w-xs mx-auto">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="bg-[#4F46E5] text-white rounded-sm p-12 text-center space-y-6">
          <h2 className="font-serif text-3xl font-bold">Ready to Sell?</h2>
          <p className="text-lg opacity-90 max-w-lg mx-auto">
            Turn your bookshelf into income. Join thousands of sellers who trust
            Books4All.
          </p>
          <Link
            href="/auth/register?role=seller"
            className="inline-block bg-white text-[#4F46E5] font-medium px-8 py-3 rounded-sm hover:bg-opacity-90 transition-colors"
          >
            List Your Books
          </Link>
        </div>
      </section>
    </>
  );
}
