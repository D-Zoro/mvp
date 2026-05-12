'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  
  const total = getTotalPrice();

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
          <p className="mb-8 text-gray-600">Looks like you haven't added any books yet.</p>
          <Link href="/books">
            <button className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors">
              Start Shopping
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
      
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6 space-y-6">
          {items.map((item) => (
            <div key={item.book.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-6 last:border-0 last:pb-0">
              <div className="flex items-center space-x-4 mb-4 sm:mb-0 w-full sm:w-auto">
                <div className="w-16 h-24 bg-gray-200 rounded-md overflow-hidden flex-shrink-0 relative">
                  {item.book.images && item.book.images.length > 0 ? (
                    <img src={item.book.images[0]} alt={item.book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Img</div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{item.book.title}</h3>
                  <p className="text-gray-500 text-sm">{item.book.author}</p>
                  <p className="text-primary font-bold mt-1">${parseFloat(item.book.price).toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end mt-4 sm:mt-0">
                <div className="flex items-center border rounded-md">
                  <button
                    onClick={() => updateQuantity(item.book.id, item.quantity - 1)}
                    className="px-3 py-1 hover:bg-gray-100 disabled:opacity-50 text-gray-600"
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span className="px-3 py-1 font-medium min-w-[2rem] text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.book.id, item.quantity + 1)}
                    className="px-3 py-1 hover:bg-gray-100 disabled:opacity-50 text-gray-600"
                    disabled={item.quantity >= item.book.quantity}
                  >
                    +
                  </button>
                </div>
                
                <button
                  onClick={() => removeItem(item.book.id)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium px-2"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-gray-50 p-6 flex flex-col sm:flex-row justify-between items-center border-t gap-4">
          <div className="text-center sm:text-left">
            <span className="text-gray-600 block text-sm">Subtotal</span>
            <span className="text-2xl font-bold">${total.toFixed(2)}</span>
          </div>
          
          <Link href="/checkout" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
              Proceed to Checkout
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
