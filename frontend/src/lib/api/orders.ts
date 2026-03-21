import { apiRequest } from "@/lib/api/client";
import { CreateOrderRequest, Order, PaginatedResponse } from "@/lib/api/types";

export interface OrderQueryParams {
  status?: string;
  page?: number;
  page_size?: number;
}

export const getOrders = (
  params?: OrderQueryParams
): Promise<PaginatedResponse<Order>> =>
  apiRequest<PaginatedResponse<Order>>({
    url: "/orders",
    method: "GET",
    params,
  });

export const getOrder = (id: string): Promise<Order> =>
  apiRequest<Order>({
    url: `/orders/${id}`,
    method: "GET",
  });

export const createOrder = (data: CreateOrderRequest): Promise<Order> =>
  apiRequest<Order, CreateOrderRequest>({
    url: "/orders",
    method: "POST",
    data,
  });

export const cancelOrder = (id: string): Promise<Order> =>
  apiRequest<Order>({
    url: `/orders/${id}/cancel`,
    method: "POST",
  });
