import { create } from "zustand";

interface CartState {
  items: Record<string, number>;
  add: (bookId: string, quantity?: number) => void;
  remove: (bookId: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: {},
  add: (bookId, quantity = 1) => set((state) => ({ items: { ...state.items, [bookId]: (state.items[bookId] ?? 0) + quantity } })),
  remove: (bookId) =>
    set((state) => {
      const next = { ...state.items };
      delete next[bookId];
      return { items: next };
    }),
  clear: () => set({ items: {} }),
}));
