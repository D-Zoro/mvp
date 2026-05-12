import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#E5E7EB] mt-16">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company */}
          <div>
            <h4 className="font-serif text-sm font-semibold mb-4">Books4All</h4>
            <p className="text-sm text-[#A4ACAF] leading-relaxed">
              A modern marketplace for curated, quality used books. Buy. Sell. Discover.
            </p>
          </div>

          {/* Browse */}
          <div>
            <h4 className="font-sans text-xs font-semibold text-[#A4ACAF] text-transform uppercase letter-spacing-wide mb-4">
              Browse
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/browse"
                  className="text-sm text-[#4F46E5] hover:underline"
                >
                  All Books
                </Link>
              </li>
              <li>
                <Link
                  href="/browse?category=fiction"
                  className="text-sm text-[#4F46E5] hover:underline"
                >
                  Fiction
                </Link>
              </li>
              <li>
                <Link
                  href="/browse?category=nonfiction"
                  className="text-sm text-[#4F46E5] hover:underline"
                >
                  Non-Fiction
                </Link>
              </li>
              <li>
                <Link
                  href="/browse?category=academic"
                  className="text-sm text-[#4F46E5] hover:underline"
                >
                  Academic
                </Link>
              </li>
            </ul>
          </div>

          {/* Seller */}
          <div>
            <h4 className="font-sans text-xs font-semibold text-[#A4ACAF] text-transform uppercase letter-spacing-wide mb-4">
              Sell
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/sell"
                  className="text-sm text-[#4F46E5] hover:underline"
                >
                  How to Sell
                </Link>
              </li>
              <li>
                <Link
                  href="/seller-dashboard"
                  className="text-sm text-[#4F46E5] hover:underline"
                >
                  Seller Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-sm text-[#4F46E5] hover:underline"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-sans text-xs font-semibold text-[#A4ACAF] text-transform uppercase letter-spacing-wide mb-4">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-[#4F46E5] hover:underline"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-[#4F46E5] hover:underline"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-[#4F46E5] hover:underline"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <hr />

        <div className="flex flex-col md:flex-row items-center justify-between pt-8">
          <p className="text-sm text-[#A4ACAF] mb-4 md:mb-0">
            © {new Date().getFullYear()} Books4All. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a
              href="https://twitter.com"
              aria-label="Twitter"
              className="text-[#4F46E5] hover:text-[#3c37c4] transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.29 20c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 2.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 01.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
            <a
              href="https://instagram.com"
              aria-label="Instagram"
              className="text-[#4F46E5] hover:text-[#3c37c4] transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 0C4.477 0 0 4.477 0 10c0 5.523 4.477 10 10 10s10-4.477 10-10S15.523 0 10 0zm5.518 4.79a1.555 1.555 0 100-3.11 1.555 1.555 0 000 3.11zm-9.64 5.386a3.107 3.107 0 116.214 0 3.107 3.107 0 01-6.214 0zm11.034 7.02a2.076 2.076 0 01-2.076 2.076H6.164a2.076 2.076 0 01-2.076-2.077v-6.052h1.664a.535.535 0 00.51-.745 3.969 3.969 0 000-4.096.535.535 0 00-.51-.744H4.088V4.79a2.076 2.076 0 012.076-2.076h7.712a2.076 2.076 0 012.076 2.077v9.41z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
