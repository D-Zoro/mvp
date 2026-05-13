'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CartItem {
  bookId: string;
  title: string;
  author: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Cart {
  items: CartItem[];
}

const CART_STORAGE_KEY = 'books4all_cart';

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const cart: Cart = JSON.parse(stored);
        setItems(cart.items || []);
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (!isLoading) {
      try {
        const cart: Cart = { items };
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      } catch (error) {
        console.error('Failed to save cart to localStorage:', error);
      }
    }
  }, [items, isLoading]);

  const addToCart = useCallback((
    bookId: string,
    title: string,
    author: string,
    price: number,
    image?: string,
    quantity: number = 1
  ) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.bookId === bookId);

      if (existingItem) {
        return prevItems.map((item) =>
          item.bookId === bookId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [
        ...prevItems,
        {
          bookId,
          title,
          author,
          price,
          quantity,
          image,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((bookId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.bookId !== bookId));
  }, []);

  const updateQuantity = useCallback((bookId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(bookId);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.bookId === bookId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    total,
    itemCount,
    isLoading,
  };
}
