import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import type { OrderResponse } from '@/types';

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ order_id: string }>;
}) {
  const { order_id } = await params;

  try {
    // Fetch order details to get payment URL
    const order = await apiClient.get<OrderResponse>(`/api/v1/orders/${order_id}`);

    // Get Stripe checkout URL from backend
    const checkoutResponse = await apiClient.get<{ checkout_url: string }>(
      `/api/v1/payments/checkout/${order_id}`
    );

    // Redirect to Stripe
    if (checkoutResponse.checkout_url) {
      // Since this is a server component, we'll render a client component that does the redirect
      return <PaymentRedirectClient checkoutUrl={checkoutResponse.checkout_url} />;
    }

    return notFound();
  } catch (error) {
    notFound();
  }
}

// Client component to handle the redirect
import 'use client';
import { useEffect } from 'react';

function PaymentRedirectClient({ checkoutUrl }: { checkoutUrl: string }) {
  useEffect(() => {
    // Redirect to Stripe checkout
    window.location.href = checkoutUrl;
  }, [checkoutUrl]);

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-12">
      <div className="container mx-auto px-6">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-4">
            Processing Payment…
          </h1>
          <p className="text-[#A4ACAF] mb-6">
            Redirecting you to Stripe for secure payment.
          </p>
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-[#E5E7EB] border-t-[#4F46E5] rounded-full animate-spin"></div>
          </div>
          <p className="text-sm text-[#A4ACAF] mt-8">
            If you are not redirected automatically,{' '}
            <a href={checkoutUrl} className="text-[#4F46E5] hover:underline">
              click here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
