"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query/keys";
import type { Book, BookCreateInput, BookFilters, BookUpdateInput } from "@/types/book";
import type { PaginatedResponse } from "@/types/common";

const params = (filters?: object) =>
  Object.fromEntries(Object.entries(filters ?? {}).filter(([, value]) => value !== undefined && value !== "" && value !== null));

export const useBooks = (filters: BookFilters = {}) =>
  useQuery({ queryKey: queryKeys.books.list(filters), queryFn: async () => (await apiClient.get<PaginatedResponse<Book>>(API.books.list, { params: params(filters) })).data });
export const useBook = (id: string) => useQuery({ queryKey: queryKeys.books.detail(id), queryFn: async () => (await apiClient.get<Book>(API.books.detail(id))).data, enabled: Boolean(id) });
export const useMyListings = (filters?: BookFilters) =>
  useQuery({ queryKey: queryKeys.books.myListings(filters), queryFn: async () => (await apiClient.get<PaginatedResponse<Book>>(API.books.myListings, { params: params(filters) })).data });
export const useCategories = () => useQuery({ queryKey: queryKeys.books.categories(), queryFn: async () => (await apiClient.get<string[]>(API.books.categories)).data });

export function useCreateBook() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (input: BookCreateInput) => (await apiClient.post<Book>(API.books.create, input)).data, onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.books.all }) });
}

export function useUpdateBook(id: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (input: BookUpdateInput) => (await apiClient.put<Book>(API.books.update(id), input)).data, onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.books.all }) });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => (await apiClient.delete(API.books.delete(id))).data, onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.books.all }) });
}

export function usePublishBook() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => (await apiClient.post<Book>(API.books.publish(id))).data, onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.books.all }) });
}
