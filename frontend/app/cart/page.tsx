'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/hooks';
import type { OrderResponse } from '@/types';

interface ShippingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { items, removeFromCart, updateQuantity, clearCart, total, isLoading } = useCart();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingData, setShippingData] = useState<ShippingFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-4">
              Your Cart
            </h1>
            <p className="text-[#A4ACAF] mb-6">
              Please log in to view and manage your cart.
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] py-12">
        <div className="container mx-auto px-6">
          <div className="text-center text-[#A4ACAF]">Loading your cart...</div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] py-12">
        <div className="container mx-auto px-6">
          <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-8">
            Your Cart
          </h1>
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
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <p className="text-[#A4ACAF] text-lg mb-6">Your cart is empty</p>
            <Link
              href="/browse"
              className="inline-block text-[#4F46E5] hover:underline font-medium"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleQuantityChange = (bookId: string, quantity: number) => {
    if (quantity > 0) {
      updateQuantity(bookId, quantity);
    }
  };

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate shipping data
      if (
        !shippingData.firstName ||
        !shippingData.lastName ||
        !shippingData.email ||
        !shippingData.address ||
        !shippingData.city ||
        !shippingData.state ||
        !shippingData.zipCode ||
        !shippingData.country
      ) {
        throw new Error('Please fill in all required fields');
      }

      // Create order
      const orderPayload = {
        items: items.map((item) => ({
          book_id: item.bookId,
          quantity: item.quantity,
        })),
        shipping_address: {
          first_name: shippingData.firstName,
          last_name: shippingData.lastName,
          email: shippingData.email,
          phone: shippingData.phone,
          address: shippingData.address,
          city: shippingData.city,
          state: shippingData.state,
          zip_code: shippingData.zipCode,
          country: shippingData.country,
        },
      };

      const order = await apiClient.post<OrderResponse>(
        '/api/v1/orders',
        orderPayload
      );

      // Clear cart on success
      clearCart();

      // Redirect to payment page
      router.push(`/checkout/payment/${order.id}`);
    } catch (err) {
      const message =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as any).message
          : 'Failed to create order. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-12">
      <div className="container mx-auto px-6">
        <div className="mb-8">
          <Link href="/browse" className="text-[#4F46E5] hover:underline text-sm font-medium">
            ← Continue Shopping
          </Link>
        </div>

        <h1 className="font-serif text-4xl font-bold text-[#1A1A1A] mb-12">
          Shopping Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.bookId}
                className="bg-white rounded-sm shadow-sm p-6 flex gap-6"
              >
                {item.image && (
                  <div className="w-20 h-28 bg-[#E5E7EB] rounded-sm flex-shrink-0 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex-1">
                  <Link href={`/books/${item.bookId}`}>
                    <h3 className="font-serif text-lg font-semibold text-[#1A1A1A] hover:text-[#4F46E5] transition-colors">
                      {item.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-[#A4ACAF] mb-4">by {item.author}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label htmlFor={`qty-${item.bookId}`} className="text-sm text-[#A4ACAF]">
                        Qty:
                      </label>
                      <input
                        id={`qty-${item.bookId}`}
                        type="number"
                        min="1"
                        max="99"
                        value={item.quantity}
                        onChange={(e) =>
                          handleQuantityChange(item.bookId, parseInt(e.target.value) || 1)
                        }
                        className="w-16 px-2 py-1 border border-[#E5E7EB] rounded-sm text-center"
                      />
                    </div>

                    <p className="font-mono font-semibold text-[#4F46E5]">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>

                    <button
                      onClick={() => removeFromCart(item.bookId)}
                      className="text-[#F43F5E] hover:bg-[#F43F5E]/10 px-3 py-1 rounded-sm transition-colors text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Shipping & Checkout */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-sm shadow-sm p-6 border-l-4 border-[#4F46E5]">
              <h3 className="font-serif text-lg font-semibold text-[#1A1A1A] mb-4">
                Order Summary
              </h3>

              <div className="space-y-2 mb-4 border-b border-[#E5E7EB] pb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#A4ACAF]">Subtotal</span>
                  <span className="text-[#1A1A1A] font-medium">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#A4ACAF]">Shipping</span>
                  <span className="text-[#1A1A1A] font-medium">Calculated at checkout</span>
                </div>
              </div>

              <div className="flex justify-between mb-6">
                <span className="font-semibold text-[#1A1A1A]">Total</span>
                <span className="font-mono text-2xl font-bold text-[#4F46E5]">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Shipping Form */}
            <div className="bg-white rounded-sm shadow-sm p-6">
              <h3 className="font-serif text-lg font-semibold text-[#1A1A1A] mb-4">
                Shipping Address
              </h3>

              {error && (
                <div className="mb-4 p-3 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-sm">
                  <p className="text-sm text-[#F43F5E]">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={shippingData.firstName}
                    onChange={handleShippingChange}
                    required
                    className="px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={shippingData.lastName}
                    onChange={handleShippingChange}
                    required
                    className="px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>

                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={shippingData.email}
                  onChange={handleShippingChange}
                  required
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />

                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  value={shippingData.phone}
                  onChange={handleShippingChange}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />

                <input
                  type="text"
                  name="address"
                  placeholder="Street Address"
                  value={shippingData.address}
                  onChange={handleShippingChange}
                  required
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="city"
                    placeholder="City"
                    value={shippingData.city}
                    onChange={handleShippingChange}
                    required
                    className="px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                  <input
                    type="text"
                    name="state"
                    placeholder="State"
                    value={shippingData.state}
                    onChange={handleShippingChange}
                    required
                    className="px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="zipCode"
                    placeholder="ZIP Code"
                    value={shippingData.zipCode}
                    onChange={handleShippingChange}
                    required
                    className="px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                  <input
                    type="text"
                    name="country"
                    placeholder="Country"
                    value={shippingData.country}
                    onChange={handleShippingChange}
                    required
                    className="px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#4F46E5] text-white font-medium py-3 rounded-sm hover:bg-[#3c37c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
                >
                  {isSubmitting ? 'Creating Order…' : 'Proceed to Payment'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
