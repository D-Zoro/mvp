'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-50">
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-bold font-serif tracking-tight hover:text-[#4F46E5] transition-colors"
        >
          Books4All
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/browse"
            className="text-sm font-medium hover:text-[#4F46E5] transition-colors"
          >
            Browse
          </Link>
          <Link
            href="/sell"
            className="text-sm font-medium hover:text-[#4F46E5] transition-colors"
          >
            Sell
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium hover:text-[#4F46E5] transition-colors"
          >
            About
          </Link>
          <div className="flex items-center gap-4 ml-4 pl-4 border-l border-[#E5E7EB]">
            <Link
              href="/auth/login"
              className="text-sm font-medium hover:text-[#4F46E5] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="text-sm font-medium bg-[#4F46E5] text-white px-4 py-2 rounded-sm hover:bg-[#3c37c4] transition-colors"
            >
              Join
            </Link>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-[#E5E7EB] md:hidden">
            <div className="container mx-auto px-6 py-4 flex flex-col gap-4">
              <Link
                href="/browse"
                className="text-sm font-medium hover:text-[#4F46E5] transition-colors"
              >
                Browse
              </Link>
              <Link
                href="/sell"
                className="text-sm font-medium hover:text-[#4F46E5] transition-colors"
              >
                Sell
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium hover:text-[#4F46E5] transition-colors"
              >
                About
              </Link>
              <hr className="my-2" />
              <Link
                href="/auth/login"
                className="text-sm font-medium hover:text-[#4F46E5] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="text-sm font-medium bg-[#4F46E5] text-white px-4 py-2 rounded-sm hover:bg-[#3c37c4] transition-colors text-center"
              >
                Join
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
