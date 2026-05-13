'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks';

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // If user accesses /checkout directly without an order, redirect to /cart
    if (!isRedirecting && isAuthenticated) {
      setIsRedirecting(true);
      // In a real scenario, we would check if there's a valid pending order
      // For now, redirect to cart to start the checkout flow
      setTimeout(() => {
        router.push('/cart');
      }, 1000);
    }
  }, [isAuthenticated, isRedirecting, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-4">
              Checkout
            </h1>
            <p className="text-[#A4ACAF] mb-6">
              Please log in to proceed with checkout.
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

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-12">
      <div className="container mx-auto px-6">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-4">
            Redirecting to Cart…
          </h1>
          <p className="text-[#A4ACAF] mb-6">
            Please wait while we set up your checkout.
          </p>
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-[#E5E7EB] border-t-[#4F46E5] rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
