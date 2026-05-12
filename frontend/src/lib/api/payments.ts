import { apiRequest } from './client';

export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
  order_id: string;
}

export const createCheckoutSession = (orderId: string): Promise<CheckoutSessionResponse> =>
  apiRequest<CheckoutSessionResponse>({
    url: `/payments/checkout/${orderId}`,
    method: "POST",
  });
