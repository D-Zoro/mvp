import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Book } from '@/lib/api/types';

export interface CartItem {
  book: Book;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (book: Book) => void;
  removeItem: (bookId: string) => void;
  updateQuantity: (bookId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (book: Book) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.book.id === book.id);
          
          if (existingItem) {
            // Check stock limit
            if (existingItem.quantity >= book.quantity) {
              return state;
            }
            
            return {
              items: state.items.map((item) =>
                item.book.id === book.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }
          
          return {
            items: [...state.items, { book, quantity: 1 }],
          };
        });
      },
      
      removeItem: (bookId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.book.id !== bookId),
        }));
      },
      
      updateQuantity: (bookId: string, quantity: number) => {
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((item) => item.book.id !== bookId),
            };
          }
          
          const cartItem = state.items.find((i) => i.book.id === bookId);
          
          // Check stock limit
          if (cartItem && quantity > cartItem.book.quantity) {
             // Cap at max stock
             return {
                items: state.items.map((item) =>
                  item.book.id === bookId ? { ...item, quantity: cartItem.book.quantity } : item
                ),
             };
          }

          return {
            items: state.items.map((item) =>
              item.book.id === bookId ? { ...item, quantity } : item
            ),
          };
        });
      },
      
      clearCart: () => set({ items: [] }),
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + parseFloat(item.book.price) * item.quantity,
          0
        );
      },
    }),
    {
      name: 'books4all-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
