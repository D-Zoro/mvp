'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingCart, User, Menu, LogOut, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const { user, logout, isLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
  };

  const navLinks = [
    { label: 'Categories', href: '/books' },
    { label: 'Deals', href: '/books' },
    { label: 'New Arrivals', href: '/books' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/20 backdrop-blur-xl shadow-[0_20px_40px_rgba(115,46,228,0.06)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="font-headline text-lg font-bold text-primary hover:opacity-80 transition-opacity"
          >
            Books4All
          </Link>

          {/* Navigation Links - Hidden on Mobile */}
          <nav className="hidden md:flex gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-on-surface hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
             {/* Search Bar - Hidden on Mobile */}
            <div className="hidden md:flex items-center bg-surface-container-low rounded-xl px-4 py-2 w-64">
              <Search className="w-4 h-4 text-on-surface/60" />
              <input
                type="text"
                placeholder="Search books..."
                className="bg-transparent ml-2 flex-1 text-sm outline-none text-on-surface placeholder:text-on-surface/50"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Cart Icon */}
              <Link
                href="/cart"
                className="p-2 hover:bg-surface-container-low rounded-lg transition-colors relative"
                aria-label="Shopping cart"
              >
                <ShoppingCart className="w-5 h-5 text-on-surface" />
              </Link>

              {/* Auth Buttons / User Menu */}
              {isLoading ? (
                <div className="w-8 h-8 bg-surface-container-low rounded-full animate-pulse" />
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-2 hover:bg-surface-container-low rounded-lg transition-colors"
                    aria-label="User menu"
                  >
                    <User className="w-5 h-5 text-on-surface" />
                    <span className="hidden sm:inline text-sm font-medium text-on-surface">
                      {user.first_name || 'User'}
                    </span>
                  </button>

                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-lg py-2 z-10 border border-outline/10">
                      <Link
                        href="/dashboard"
                        className="block px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error-container/10 transition-colors flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-bold text-primary hover:bg-primary-container/10 rounded-lg transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 text-sm font-bold bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                  >
                    Register
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 hover:bg-surface-container-low rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? (
                  <X className="w-5 h-5 text-on-surface" />
                ) : (
                  <Menu className="w-5 h-5 text-on-surface" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="md:hidden pb-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="block px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {/* Mobile Search Bar */}
            <div className="px-4 py-2">
              <div className="flex items-center bg-surface-container-low rounded-xl px-4 py-2">
                <Search className="w-4 h-4 text-on-surface/60" />
                <input
                  type="text"
                  placeholder="Search books..."
                  className="bg-transparent ml-2 flex-1 text-sm outline-none text-on-surface placeholder:text-on-surface/50"
                />
              </div>
            </div>
            {/* Mobile Auth Buttons */}
            {!user && (
              <div className="px-4 py-2 space-y-2">
                <Link
                  href="/login"
                  className="block w-full px-4 py-2 text-sm font-medium text-center text-primary hover:opacity-80 transition-opacity border border-primary rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="block w-full px-4 py-2 text-sm font-medium text-center bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
