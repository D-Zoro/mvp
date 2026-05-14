import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  role: z.enum(["buyer", "seller"]).default("buyer"),
});

export const bookCreateSchema = z.object({
  title: z.string().min(1).max(500),
  author: z.string().min(1).max(255),
  isbn: z.string().min(10).max(20).optional().or(z.literal("")),
  description: z.string().max(5000).optional(),
  condition: z.enum(["new", "like_new", "good", "acceptable"]),
  price: z.coerce.number().positive().max(10000),
  quantity: z.coerce.number().int().min(1).max(1000).default(1),
  images: z.array(z.string().url()).max(10).optional(),
  category: z.string().max(100).optional(),
  publisher: z.string().max(255).optional(),
  publication_year: z.coerce.number().int().min(1000).max(2100).optional(),
  language: z.string().max(50).default("English"),
  page_count: z.coerce.number().int().min(1).max(50000).optional(),
});

export const shippingAddressSchema = z.object({
  full_name: z.string().min(1).max(200),
  address_line1: z.string().min(1).max(255),
  address_line2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postal_code: z.string().min(1).max(20),
  country: z.string().min(2).max(100).default("US"),
  phone: z.string().max(20).optional(),
});

export const reviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});
