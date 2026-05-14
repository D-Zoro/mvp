import type { UserBrief } from "./auth";

export interface Review {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_verified_purchase: boolean;
  user: UserBrief | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewCreateInput {
  rating: number;
  comment?: string;
}

export interface ReviewUpdateInput {
  rating?: number;
  comment?: string;
}

export interface ReviewFilters {
  min_rating?: number;
  verified_only?: boolean;
  page?: number;
  per_page?: number;
}

export interface ReviewStats {
  book_id: string;
  total_reviews: number;
  average_rating: number | null;
  rating_distribution: Record<string, number>;
  verified_purchase_count: number;
}
