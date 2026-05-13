import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import CancelOrderClient from './CancelOrderClient';
import type { OrderResponse } from '@/types';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const order = await apiClient.get<OrderResponse>(`/api/v1/orders/${id}`);

    const canCancel = order.status === 'PENDING' || order.status === 'PAYMENT_PROCESSING';

    return (
      <div className="min-h-screen bg-[#F9F7F2] py-12">
        <div className="container mx-auto px-6">
          {/* Breadcrumb */}
          <div className="mb-8">
            <Link href="/orders" className="text-[#4F46E5] hover:underline text-sm font-medium">
              ← Back to Orders
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Header */}
              <div className="bg-white rounded-sm shadow-sm p-6 border-l-4 border-[#4F46E5]">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-2">
                      Order {order.id.substring(0, 8).toUpperCase()}
                    </h1>
                    <p className="text-[#A4ACAF]">
                      Placed on {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <span
                    className={`px-4 py-2 rounded-sm font-semibold text-sm ${
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

                {/* Order Timeline */}
                {order.status !== 'CANCELLED' && (
                  <div className="space-y-3 pt-6 border-t border-[#E5E7EB]">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          order.status === 'PAID' ||
                          order.status === 'SHIPPED' ||
                          order.status === 'DELIVERED'
                            ? 'bg-[#10B981]'
                            : 'bg-[#E5E7EB]'
                        }`}
                      />
                      <span className="text-sm text-[#1A1A1A]">Order placed</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          order.status === 'SHIPPED' || order.status === 'DELIVERED'
                            ? 'bg-[#10B981]'
                            : 'bg-[#E5E7EB]'
                        }`}
                      />
                      <span className="text-sm text-[#1A1A1A]">Payment processed</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          order.status === 'SHIPPED' || order.status === 'DELIVERED'
                            ? 'bg-[#10B981]'
                            : 'bg-[#E5E7EB]'
                        }`}
                      />
                      <span className="text-sm text-[#1A1A1A]">Shipped</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          order.status === 'DELIVERED' ? 'bg-[#10B981]' : 'bg-[#E5E7EB]'
                        }`}
                      />
                      <span className="text-sm text-[#1A1A1A]">Delivered</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="bg-white rounded-sm shadow-sm p-6">
                <h2 className="font-serif text-lg font-semibold text-[#1A1A1A] mb-6">
                  Order Items
                </h2>

                <div className="space-y-4">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item: any, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] last:border-b-0"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-[#1A1A1A]">{item.book?.title || 'Book'}</p>
                          <p className="text-sm text-[#A4ACAF]">
                            {item.book?.author || 'Unknown Author'} · Qty: {item.quantity}
                          </p>
                        </div>

                        <p className="font-mono font-semibold text-[#4F46E5]">
                          ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[#A4ACAF]">No items in this order</p>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white rounded-sm shadow-sm p-6">
                <h2 className="font-serif text-lg font-semibold text-[#1A1A1A] mb-4">
                  Shipping Address
                </h2>

                <div className="text-[#1A1A1A] space-y-1">
                  {order.shipping_address && (
                    <>
                      <p className="font-medium">
                        {order.shipping_address.first_name} {order.shipping_address.last_name}
                      </p>
                      <p className="text-sm text-[#A4ACAF]">{order.shipping_address.address}</p>
                      <p className="text-sm text-[#A4ACAF]">
                        {order.shipping_address.city}, {order.shipping_address.state}{' '}
                        {order.shipping_address.zip_code}
                      </p>
                      <p className="text-sm text-[#A4ACAF]">{order.shipping_address.country}</p>
                      {order.shipping_address.phone && (
                        <p className="text-sm text-[#A4ACAF]">{order.shipping_address.phone}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Order Summary */}
              <div className="bg-white rounded-sm shadow-sm p-6 border-l-4 border-[#4F46E5]">
                <h3 className="font-serif text-lg font-semibold text-[#1A1A1A] mb-6">
                  Order Summary
                </h3>

                <div className="space-y-3 mb-6 pb-6 border-b border-[#E5E7EB]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A4ACAF]">Subtotal</span>
                    <span className="text-[#1A1A1A] font-medium">
                      ${parseFloat(order.total_amount).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-[#A4ACAF]">Shipping</span>
                    <span className="text-[#1A1A1A] font-medium">Free</span>
                  </div>
                </div>

                <div className="flex justify-between mb-6">
                  <span className="font-semibold text-[#1A1A1A]">Total</span>
                  <span className="font-mono text-2xl font-bold text-[#4F46E5]">
                    ${parseFloat(order.total_amount).toFixed(2)}
                  </span>
                </div>

                {canCancel && <CancelOrderClient orderId={id} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
