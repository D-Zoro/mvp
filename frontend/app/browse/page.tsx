import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BookCard from '@/components/BookCard';

// Mock data
const books = [
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
