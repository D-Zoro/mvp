'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/hooks';
import type { OrderListResponse, OrderResponse } from '@/types';

export default function OrdersPage() {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<OrderListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get<OrderListResponse>(
          `/api/v1/orders?page=${currentPage}&page_size=10`
        );
        setOrders(response);
      } catch (err) {
        if (typeof err === 'object' && err !== null && 'message' in err) {
          setError((err as any).message);
        } else {
          setError('Failed to load orders. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, currentPage]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-4">
              My Orders
            </h1>
            <p className="text-[#A4ACAF] mb-6">
              Please log in to view your orders.
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] py-12">
        <div className="container mx-auto px-6">
          <div className="text-center text-[#A4ACAF]">Loading your orders...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <p className="text-[#F43F5E] mb-6">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
              }}
              className="text-[#4F46E5] hover:underline font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-12">
      <div className="container mx-auto px-6">
        <h1 className="font-serif text-4xl font-bold text-[#1A1A1A] mb-2">
          My Orders
        </h1>
        <p className="text-[#A4ACAF] mb-12">
          {orders?.total ? `${orders.total} order${orders.total !== 1 ? 's' : ''}` : 'No orders yet'}
        </p>

        {!orders || orders.items.length === 0 ? (
          <div className="bg-white rounded-sm shadow-sm p-12 text-center">
            <svg
              className="w-24 h-24 text-[#A4ACAF] mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-[#A4ACAF] text-lg mb-6">No orders yet</p>
            <Link
              href="/browse"
              className="inline-block text-[#4F46E5] hover:underline font-medium"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.items.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white rounded-sm shadow-sm p-6 hover:shadow-md transition-shadow border-l-4 border-[#4F46E5]"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-[#A4ACAF] mb-1">Order ID</p>
                    <p className="font-mono text-sm font-semibold text-[#1A1A1A]">
                      {order.id.substring(0, 8).toUpperCase()}...
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-[#A4ACAF] mb-1">Date</p>
                    <p className="font-medium text-[#1A1A1A]">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-[#A4ACAF] mb-1">Status</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-sm text-sm font-semibold ${
                        order.status === 'PAID'
                          ? 'bg-[#10B981]/10 text-[#10B981]'
                          : order.status === 'SHIPPED'
                          ? 'bg-[#4F46E5]/10 text-[#4F46E5]'
                          : order.status === 'DELIVERED'
                          ? 'bg-[#059669]/10 text-[#059669]'
                          : order.status === 'CANCELLED'
                          ? 'bg-[#F43F5E]/10 text-[#F43F5E]'
                          : 'bg-[#A4ACAF]/10 text-[#A4ACAF]'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-[#A4ACAF] mb-1">Total</p>
                    <p className="font-mono text-lg font-bold text-[#4F46E5]">
                      ${parseFloat(order.total_amount).toFixed(2)}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[#A4ACAF]">
                  {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''} · View details →
                </p>
              </Link>
            ))}

            {/* Pagination */}
            {orders.total_pages > 1 && (
              <div className="flex items-center justify-between pt-8 border-t border-[#E5E7EB]">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-6 py-2 border border-[#E5E7EB] rounded-sm font-medium hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>

                <div className="text-sm text-[#A4ACAF]">
                  Page {currentPage} of {orders.total_pages}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage >= orders.total_pages}
                  className="px-6 py-2 border border-[#E5E7EB] rounded-sm font-medium hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
