export type UserRole = "buyer" | "seller" | "admin";
export type OAuthProvider = "google" | "github" | "facebook";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  email_verified: boolean;
  is_active: boolean;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  oauth_provider: OAuthProvider | null;
  created_at: string;
  updated_at: string;
}

export interface UserBrief {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  new_password: string;
}

export interface VerifyEmailInput {
  token: string;
}
