import type { UserBrief } from "./auth";

export type BookCondition = "new" | "like_new" | "good" | "acceptable";
export type BookStatus = "draft" | "active" | "sold" | "archived";

export interface BookBrief {
  id: string;
  title: string;
  author: string;
  images: string[] | null;
}

export interface Book extends BookBrief {
  seller_id: string;
  isbn: string | null;
  description: string | null;
  condition: BookCondition;
  price: string;
  quantity: number;
  status: BookStatus;
  category: string | null;
  publisher: string | null;
  publication_year: number | null;
  language: string;
  page_count: number | null;
  seller: UserBrief | null;
  created_at: string;
  updated_at: string;
}

export interface BookCreateInput {
  title: string;
  author: string;
  condition: BookCondition;
  price: number;
  isbn?: string;
  description?: string;
  quantity?: number;
  images?: string[];
  category?: string;
  publisher?: string;
  publication_year?: number;
  language?: string;
  page_count?: number;
  status?: BookStatus;
}

export type BookUpdateInput = Partial<BookCreateInput>;

export interface BookFilters {
  query?: string;
  category?: string;
  condition?: BookCondition;
  min_price?: number;
  max_price?: number;
  seller_id?: string;
  status?: BookStatus;
  sort_by?: "created_at" | "price" | "title";
  sort_order?: "asc" | "desc";
  page?: number;
  per_page?: number;
}
