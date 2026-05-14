"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query/keys";
import type { PaginatedResponse } from "@/types/common";
import type { Review, ReviewCreateInput, ReviewFilters, ReviewStats, ReviewUpdateInput } from "@/types/review";

export const useReviews = (bookId: string, filters?: ReviewFilters) =>
  useQuery({ queryKey: queryKeys.reviews.list(bookId, filters), queryFn: async () => (await apiClient.get<PaginatedResponse<Review>>(API.books.reviews(bookId), { params: filters })).data, enabled: Boolean(bookId) });
export const useReviewStats = (bookId: string) =>
  useQuery({ queryKey: queryKeys.reviews.stats(bookId), queryFn: async () => (await apiClient.get<ReviewStats>(API.books.reviewStats(bookId))).data, enabled: Boolean(bookId) });
export function useCreateReview(bookId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (input: ReviewCreateInput) => (await apiClient.post<Review>(API.books.reviews(bookId), input)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }) });
}
export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ id, input }: { id: string; input: ReviewUpdateInput }) => (await apiClient.put<Review>(API.reviews.update(id), input)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }) });
}
export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => (await apiClient.delete(API.reviews.delete(id))).data, onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }) });
}
