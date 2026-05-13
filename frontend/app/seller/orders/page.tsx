'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/hooks';
import type { OrderListResponse, OrderResponse } from '@/types';

export default function SellerOrdersPage() {
  const { isAuthenticated, user } = useAuth();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'SELLER') return;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get<OrderListResponse>(
          `/api/v1/orders/seller?page=${currentPage}&page_size=10`
        );

        setOrders(response.items);
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
  }, [isAuthenticated, user?.role, currentPage]);

  const handleMarkShipped = async (orderId: string) => {
    try {
      await apiClient.put(`/api/v1/orders/${orderId}`, { status: 'SHIPPED' });
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: 'SHIPPED' } : order
        )
      );
    } catch (err) {
      const message =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as any).message
          : 'Failed to update order. Please try again.';
      setError(message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-4">
              Sales Orders
            </h1>
            <p className="text-[#A4ACAF] mb-6">
              Please log in to view orders.
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

  if (user?.role !== 'SELLER') {
    return (
      <div className="min-h-screen bg-[#F9F7F2] py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-4">
              Sales Orders
            </h1>
            <p className="text-[#A4ACAF] mb-6">
              You must be a seller to view orders.
            </p>
            <Link
              href="/browse"
              className="inline-block text-[#4F46E5] hover:underline font-medium"
            >
              Back to Browse
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
          <div className="text-center text-[#A4ACAF]">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-12">
      <div className="container mx-auto px-6">
        <h1 className="font-serif text-4xl font-bold text-[#1A1A1A] mb-2">
          Sales Orders
        </h1>
        <p className="text-[#A4ACAF] mb-12">
          {orders.length} order{orders.length !== 1 ? 's' : ''}
        </p>

        {error && (
          <div className="mb-6 p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-sm">
            <p className="text-sm text-[#F43F5E]">{error}</p>
          </div>
        )}

        {orders.length === 0 ? (
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
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-[#A4ACAF] text-lg mb-6">No orders yet</p>
            <Link
              href="/seller/listings"
              className="inline-block text-[#4F46E5] hover:underline font-medium"
            >
              View Your Listings
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-sm shadow-sm p-6 border-l-4 border-[#4F46E5]"
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div>
                    <p className="text-sm text-[#A4ACAF] mb-1">Order ID</p>
                    <p className="font-mono text-sm font-semibold text-[#1A1A1A]">
                      {order.id.substring(0, 8).toUpperCase()}...
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-[#A4ACAF] mb-1">Buyer</p>
                    <p className="font-medium text-[#1A1A1A]">
                      {order.shipping_address?.first_name || 'Unknown'}{' '}
                      {order.shipping_address?.last_name || ''}
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
                          : 'bg-[#A4ACAF]/10 text-[#A4ACAF]'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-[#A4ACAF] mb-1">Total</p>
                    <p className="font-mono font-bold text-[#4F46E5]">
                      ${parseFloat(order.total_amount).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                  <p className="text-sm text-[#A4ACAF] mb-2">Items:</p>
                  <div className="space-y-1">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item: any, idx) => (
                        <p key={idx} className="text-sm text-[#1A1A1A]">
                          {item.book?.title || 'Book'} × {item.quantity}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-[#A4ACAF]">No items</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {order.status === 'PAID' && (
                  <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                    <button
                      onClick={() => handleMarkShipped(order.id)}
                      className="bg-[#10B981] text-white font-medium py-2 px-4 rounded-sm hover:bg-[#059669] transition-colors text-sm"
                    >
                      Mark as Shipped
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
