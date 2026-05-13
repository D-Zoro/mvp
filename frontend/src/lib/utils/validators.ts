/**
 * Form Validation Schemas using Zod
 * Type-safe validation for all frontend forms and API requests
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const BookConditionEnum = z.enum(['new', 'like_new', 'good', 'acceptable']);
export const BookStatusEnum = z.enum(['draft', 'active', 'sold', 'archived']);
export const OrderStatusEnum = z.enum(['pending', 'payment_processing', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded']);
export const UserRoleEnum = z.enum(['buyer', 'seller', 'admin']);
export const OAuthProviderEnum = z.enum(['google', 'facebook', 'github']);

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * User registration form validation schema
 */
export const registerSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirm_password: z
      .string({ required_error: 'Please confirm your password' })
      .min(1, 'Please confirm your password'),
    first_name: z
      .string()
      .max(100, 'First name must be 100 characters or less')
      .optional()
      .nullable(),
    last_name: z
      .string()
      .max(100, 'Last name must be 100 characters or less')
      .optional()
      .nullable(),
    role: UserRoleEnum.default('buyer').optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Email verification schema
 */
export const emailVerificationSchema = z.object({
  token: z.string({ required_error: 'Verification token is required' }).min(1, 'Verification token is required'),
});

export type EmailVerificationData = z.infer<typeof emailVerificationSchema>;

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export type PasswordResetRequestData = z.infer<typeof passwordResetRequestSchema>;

/**
 * Password reset confirmation schema
 */
export const passwordResetConfirmSchema = z
  .object({
    token: z.string({ required_error: 'Reset token is required' }).min(1, 'Reset token is required'),
    new_password: z
      .string({ required_error: 'New password is required' })
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirm_password: z
      .string({ required_error: 'Please confirm your new password' })
      .min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type PasswordResetConfirmData = z.infer<typeof passwordResetConfirmSchema>;

/**
 * OAuth callback schema
 */
export const oauthCallbackSchema = z.object({
  code: z.string({ required_error: 'OAuth code is required' }).min(1, 'OAuth code is required'),
  state: z.string().optional().nullable(),
});

export type OAuthCallbackData = z.infer<typeof oauthCallbackSchema>;

// ============================================================================
// BOOK SCHEMAS
// ============================================================================

/**
 * Book creation form validation schema
 */
export const bookCreateSchema = z.object({
  title: z
    .string({ required_error: 'Book title is required' })
    .min(1, 'Book title is required')
    .max(500, 'Book title must be 500 characters or less'),
  author: z
    .string({ required_error: 'Author name is required' })
    .min(1, 'Author name is required')
    .max(255, 'Author name must be 255 characters or less'),
  condition: BookConditionEnum,
  price: z
    .union([z.number(), z.string().transform((val) => parseFloat(val))])
    .pipe(z.number().positive('Price must be greater than 0').max(10000, 'Price cannot exceed $10,000')),
  isbn: z
    .string()
    .min(10, 'ISBN must be 10-20 characters')
    .max(20, 'ISBN must be 10-20 characters')
    .optional()
    .nullable(),
  description: z
    .string()
    .max(5000, 'Description must be 5000 characters or less')
    .optional()
    .nullable(),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(1000, 'Quantity cannot exceed 1000')
    .default(1),
  images: z
    .array(z.string().url('Each image must be a valid URL'))
    .max(10, 'Maximum 10 images allowed')
    .optional()
    .nullable(),
  category: z
    .string()
    .max(100, 'Category must be 100 characters or less')
    .optional()
    .nullable(),
  publisher: z
    .string()
    .max(255, 'Publisher must be 255 characters or less')
    .optional()
    .nullable(),
  publication_year: z
    .number()
    .int('Publication year must be a whole number')
    .min(1000, 'Publication year must be 1000 or later')
    .max(2100, 'Publication year cannot exceed 2100')
    .optional()
    .nullable(),
  language: z
    .string()
    .max(50, 'Language must be 50 characters or less')
    .default('English'),
  page_count: z
    .number()
    .int('Page count must be a whole number')
    .min(1, 'Page count must be at least 1')
    .max(50000, 'Page count cannot exceed 50000')
    .optional()
    .nullable(),
  status: BookStatusEnum.default('draft').optional(),
});

export type BookCreateFormData = z.infer<typeof bookCreateSchema>;

/**
 * Book update form validation schema (all fields optional)
 */
export const bookUpdateSchema = bookCreateSchema.partial();

export type BookUpdateFormData = z.infer<typeof bookUpdateSchema>;

// ============================================================================
// ORDER SCHEMAS
// ============================================================================

/**
 * Shipping address validation schema
 */
export const shippingAddressSchema = z.object({
  full_name: z
    .string({ required_error: 'Full name is required' })
    .min(1, 'Full name is required')
    .max(200, 'Full name must be 200 characters or less'),
  address_line1: z
    .string({ required_error: 'Street address is required' })
    .min(1, 'Street address is required')
    .max(255, 'Street address must be 255 characters or less'),
  address_line2: z
    .string()
    .max(255, 'Address line 2 must be 255 characters or less')
    .optional()
    .nullable(),
  city: z
    .string({ required_error: 'City is required' })
    .min(1, 'City is required')
    .max(100, 'City must be 100 characters or less'),
  state: z
    .string({ required_error: 'State/Province is required' })
    .min(1, 'State/Province is required')
    .max(100, 'State/Province must be 100 characters or less'),
  postal_code: z
    .string({ required_error: 'Postal code is required' })
    .min(1, 'Postal code is required')
    .max(20, 'Postal code must be 20 characters or less'),
  country: z
    .string()
    .min(2, 'Country must be 2 characters or more')
    .max(100, 'Country must be 100 characters or less')
    .default('US'),
  phone: z
    .string()
    .max(20, 'Phone number must be 20 characters or less')
    .optional()
    .nullable(),
});

export type ShippingAddressFormData = z.infer<typeof shippingAddressSchema>;

/**
 * Order item creation schema
 */
export const orderItemCreateSchema = z.object({
  book_id: z.string({ required_error: 'Book ID is required' }).uuid('Invalid book ID'),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100')
    .default(1),
});

export type OrderItemCreateFormData = z.infer<typeof orderItemCreateSchema>;

/**
 * Order creation form validation schema
 */
export const orderCreateSchema = z.object({
  items: z
    .array(orderItemCreateSchema)
    .min(1, 'At least one item is required')
    .max(50, 'Maximum 50 items per order'),
  shipping_address: shippingAddressSchema,
  notes: z
    .string()
    .max(1000, 'Notes must be 1000 characters or less')
    .optional()
    .nullable(),
});

export type OrderCreateFormData = z.infer<typeof orderCreateSchema>;

// ============================================================================
// REVIEW SCHEMAS
// ============================================================================

/**
 * Book review creation form validation schema
 */
export const reviewCreateSchema = z.object({
  rating: z
    .number({ required_error: 'Rating is required' })
    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars'),
  comment: z
    .string()
    .max(2000, 'Review comment must be 2000 characters or less')
    .optional()
    .nullable(),
});

export type ReviewCreateFormData = z.infer<typeof reviewCreateSchema>;

/**
 * Book review update form validation schema
 */
export const reviewUpdateSchema = reviewCreateSchema.partial();

export type ReviewUpdateFormData = z.infer<typeof reviewUpdateSchema>;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate login form data
 */
export const validateLogin = (data: unknown) => loginSchema.safeParse(data);

/**
 * Validate registration form data
 */
export const validateRegister = (data: unknown) => registerSchema.safeParse(data);

/**
 * Validate email verification data
 */
export const validateEmailVerification = (data: unknown) => emailVerificationSchema.safeParse(data);

/**
 * Validate password reset request data
 */
export const validatePasswordResetRequest = (data: unknown) => passwordResetRequestSchema.safeParse(data);

/**
 * Validate password reset confirmation data
 */
export const validatePasswordResetConfirm = (data: unknown) => passwordResetConfirmSchema.safeParse(data);

/**
 * Validate OAuth callback data
 */
export const validateOAuthCallback = (data: unknown) => oauthCallbackSchema.safeParse(data);

/**
 * Validate book creation data
 */
export const validateBookCreate = (data: unknown) => bookCreateSchema.safeParse(data);

/**
 * Validate book update data
 */
export const validateBookUpdate = (data: unknown) => bookUpdateSchema.safeParse(data);

/**
 * Validate shipping address data
 */
export const validateShippingAddress = (data: unknown) => shippingAddressSchema.safeParse(data);

/**
 * Validate order item creation data
 */
export const validateOrderItemCreate = (data: unknown) => orderItemCreateSchema.safeParse(data);

/**
 * Validate order creation data
 */
export const validateOrderCreate = (data: unknown) => orderCreateSchema.safeParse(data);

/**
 * Validate review creation data
 */
export const validateReviewCreate = (data: unknown) => reviewCreateSchema.safeParse(data);

/**
 * Validate review update data
 */
export const validateReviewUpdate = (data: unknown) => reviewUpdateSchema.safeParse(data);

// ============================================================================
// HELPER FUNCTION FOR VALIDATION ERRORS
// ============================================================================

/**
 * Extract first error message from Zod validation result
 */
export function getFirstErrorMessage<T>(result: z.SafeParseReturnType<unknown, T>): string | null {
  if (result.success) {
    return null;
  }
  const error = result.error.errors[0];
  return error?.message || 'Validation failed';
}

/**
 * Get all error messages keyed by field path
 */
export function getErrorMessages<T>(result: z.SafeParseReturnType<unknown, T>): Record<string, string> {
  if (result.success) {
    return {};
  }
  const errors: Record<string, string> = {};
  for (const error of result.error.errors) {
    const path = error.path.join('.');
    errors[path] = error.message;
  }
  return errors;
}
