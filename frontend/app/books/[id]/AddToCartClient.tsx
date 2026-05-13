'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/hooks';

interface AddToCartClientProps {
  bookId: string;
  title: string;
  author: string;
  price: number;
  image?: string;
}

export default function AddToCartClient({
  bookId,
  title,
  author,
  price,
  image,
}: AddToCartClientProps) {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      setMessage('Please log in to add items to cart');
      return;
    }

    addToCart(bookId, title, author, price, image, quantity);
    setMessage(`Added ${quantity} copy(ies) to cart!`);
    setTimeout(() => setMessage(null), 2000);
  };

  return (
    <>
      {message && (
        <div className="mb-4 p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-sm">
          <p className="text-sm text-[#10B981]">✓ {message}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="quantity" className="block text-sm font-semibold text-[#A4ACAF] mb-2">
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            min="1"
            max="99"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
          />
        </div>

        <button
          onClick={handleAddToCart}
          className="w-full bg-[#4F46E5] text-white font-medium py-3 rounded-sm hover:bg-[#3c37c4] transition-colors"
        >
          Add to Cart
        </button>
      </div>
    </>
  );
}
