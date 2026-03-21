import { apiRequest } from "@/lib/api/client";
import {
  CreateReviewRequest,
  PaginatedResponse,
  Review,
  UpdateReviewRequest,
} from "@/lib/api/types";

export interface ReviewQueryParams {
  page?: number;
  page_size?: number;
  min_rating?: number;
  verified_only?: boolean;
}

export interface ReviewStats {
  average_rating: number;
  rating_distribution: Record<string, number>;
  total_reviews: number;
}

export const getReviews = (
  bookId: string,
  params?: ReviewQueryParams
): Promise<PaginatedResponse<Review>> =>
  apiRequest<PaginatedResponse<Review>>({
    url: `/books/${bookId}/reviews`,
    method: "GET",
    params,
  });

export const createReview = (
  bookId: string,
  data: CreateReviewRequest
): Promise<Review> =>
  apiRequest<Review, CreateReviewRequest>({
    url: `/books/${bookId}/reviews`,
    method: "POST",
    data,
  });

export const getReviewStats = (bookId: string): Promise<ReviewStats> =>
  apiRequest<ReviewStats>({
    url: `/books/${bookId}/reviews/stats`,
    method: "GET",
  });

export const updateReview = (
  reviewId: string,
  data: UpdateReviewRequest
): Promise<Review> =>
  apiRequest<Review, UpdateReviewRequest>({
    url: `/reviews/${reviewId}`,
    method: "PUT",
    data,
  });

export const deleteReview = (reviewId: string): Promise<{ message?: string }> =>
  apiRequest<{ message?: string }>({
    url: `/reviews/${reviewId}`,
    method: "DELETE",
  });
