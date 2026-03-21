"use client";

import { useQuery } from "@tanstack/react-query";

import { getBook, getBooks } from "@/lib/api/books";
import type { BookQueryParams } from "@/lib/api/types";

export function useBooks(params?: BookQueryParams) {
  return useQuery({
    queryKey: ["books", params],
    queryFn: () => getBooks(params),
  });
}

export function useBook(bookId: string) {
  return useQuery({
    queryKey: ["book", bookId],
    queryFn: () => getBook(bookId),
    enabled: Boolean(bookId),
  });
}
