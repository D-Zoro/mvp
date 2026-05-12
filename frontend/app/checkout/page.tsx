'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { createOrder } from '@/lib/api/orders';
import { createCheckoutSession } from '@/lib/api/payments';
import { CreateOrderRequest, ShippingAddress } from '@/lib/api/types';
import AuthGuard from '@/components/auth/AuthGuard';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = getTotalPrice();

  const [address, setAddress] = useState<ShippingAddress>({
    full_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    phone: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddress((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (items.length === 0) {
        throw new Error('Cart is empty');
      }

      const orderData: CreateOrderRequest = {
        items: items.map((item) => ({
          book_id: item.book.id,
          quantity: item.quantity,
        })),
        shipping_address: address,
      };

      // 1. Create Order
      const order = await createOrder(orderData);

      // 2. Create Checkout Session
      const session = await createCheckoutSession(order.id);

      // 3. Clear Cart (optional, maybe better after successful payment via webhook/success page)
      // clearCart(); 

      // 4. Redirect to Stripe
      window.location.href = session.checkout_url;
    } catch (err: any) {
      setError(err.message || 'Failed to process checkout');
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
        <AuthGuard allowedRoles={['buyer', 'seller', 'admin']}>
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
                <p className="mb-8">Add some books to your cart before checking out.</p>
                <button
                onClick={() => router.push('/books')}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90"
                >
                Browse Books
                </button>
            </div>
        </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles={['buyer', 'seller', 'admin']}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-card rounded-lg p-6 shadow-sm border h-fit">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4 mb-4">
              {items.map((item) => (
                <div key={item.book.id} className="flex justify-between items-center text-sm">
                  <span>
                    {item.book.title} x {item.quantity}
                  </span>
                  <span>${(parseFloat(item.book.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Shipping Form */}
          <div className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  required
                  value={address.full_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address Line 1</label>
                <input
                  type="text"
                  name="address_line1"
                  required
                  value={address.address_line1}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  name="address_line2"
                  value={address.address_line2}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={address.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    required
                    value={address.state}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Postal Code</label>
                  <input
                    type="text"
                    name="postal_code"
                    required
                    value={address.postal_code}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={address.country}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone (Optional)</label>
                <input
                  type="tel"
                  name="phone"
                  value={address.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isLoading ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
