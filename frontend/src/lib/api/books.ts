import { apiRequest } from "@/lib/api/client";
import {
  Book,
  BookQueryParams,
  CreateBookRequest,
  PaginatedResponse,
  UpdateBookRequest,
} from "@/lib/api/types";

export const getBooks = (
  params?: BookQueryParams
): Promise<PaginatedResponse<Book>> =>
  apiRequest<PaginatedResponse<Book>>({
    url: "/books",
    method: "GET",
    params,
  });

export const getBook = (id: string): Promise<Book> =>
  apiRequest<Book>({
    url: `/books/${id}`,
    method: "GET",
  });

export const createBook = (data: CreateBookRequest): Promise<Book> =>
  apiRequest<Book, CreateBookRequest>({
    url: "/books",
    method: "POST",
    data,
  });

export const updateBook = (id: string, data: UpdateBookRequest): Promise<Book> =>
  apiRequest<Book, UpdateBookRequest>({
    url: `/books/${id}`,
    method: "PUT",
    data,
  });

export const deleteBook = (id: string): Promise<{ message?: string }> =>
  apiRequest<{ message?: string }>({
    url: `/books/${id}`,
    method: "DELETE",
  });
