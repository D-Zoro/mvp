import type { BookFilters } from "@/types/book";
import type { ReviewFilters } from "@/types/review";

export const queryKeys = {
  books: {
    all: ["books"] as const,
    list: (filters: BookFilters) => ["books", "list", filters] as const,
    detail: (id: string) => ["books", "detail", id] as const,
    myListings: (filters?: BookFilters) => ["books", "my-listings", filters] as const,
    categories: () => ["books", "categories"] as const,
  },
  reviews: {
    list: (bookId: string, filters?: ReviewFilters) => ["reviews", bookId, filters] as const,
    stats: (bookId: string) => ["reviews", "stats", bookId] as const,
  },
  orders: {
    all: ["orders"] as const,
    list: (page?: number) => ["orders", "list", page] as const,
    detail: (id: string) => ["orders", "detail", id] as const,
  },
  auth: {
    me: () => ["auth", "me"] as const,
  },
};
