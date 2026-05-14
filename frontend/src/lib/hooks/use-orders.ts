"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query/keys";
import type { PaginatedResponse } from "@/types/common";
import type { CheckoutSession, Order, OrderCreateInput } from "@/types/order";

export const useOrders = (page?: number) =>
  useQuery({ queryKey: queryKeys.orders.list(page), queryFn: async () => (await apiClient.get<PaginatedResponse<Order>>(API.orders.list, { params: { page } })).data });
export const useOrder = (id: string) => useQuery({ queryKey: queryKeys.orders.detail(id), queryFn: async () => (await apiClient.get<Order>(API.orders.detail(id))).data, enabled: Boolean(id) });
export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (input: OrderCreateInput) => (await apiClient.post<Order>(API.orders.create, input)).data, onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.orders.all }) });
}
export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => (await apiClient.post<Order>(API.orders.cancel(id))).data, onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.orders.all }) });
}
export const useCheckout = () => useMutation({ mutationFn: async (orderId: string) => (await apiClient.post<CheckoutSession>(API.payments.checkout(orderId))).data });
