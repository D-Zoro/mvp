'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

interface AuthFormProps {
  type: 'login' | 'register' | 'forgot-password' | 'reset-password';
  onSubmit?: (data: Record<string, string>) => Promise<void>;
}

export default function AuthForm({ type, onSubmit }: AuthFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="p-4 bg-[#F43F5E]/10 border-l-4 border-[#F43F5E] rounded-sm">
            <p className="text-sm text-[#F43F5E] font-medium">{error}</p>
          </div>
        )}

        {/* Login Form */}
        {type === 'login' && (
          <>
            <div>
              <label htmlFor="email" className="block">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password || ''}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4F46E5] text-white font-medium py-2.5 rounded-sm hover:bg-[#3c37c4] transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing In…' : 'Sign In'}
            </button>

            <div className="text-center space-y-3">
              <Link
                href="/auth/forgot-password"
                className="block text-sm text-[#4F46E5] hover:underline"
              >
                Forgot your password?
              </Link>
              <p className="text-sm text-[#A4ACAF]">
                Don't have an account?{' '}
                <Link
                  href="/auth/register"
                  className="text-[#4F46E5] hover:underline font-medium"
                >
                  Create one
                </Link>
              </p>
            </div>
          </>
        )}

        {/* Register Form */}
        {type === 'register' && (
          <>
            <div>
              <label htmlFor="name" className="block">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                placeholder="Jane Doe"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password || ''}
                onChange={handleChange}
                placeholder="Min. 8 characters"
                required
              />
              <p className="text-xs text-[#A4ACAF] mt-2">
                Must contain uppercase, lowercase, number, and special character.
              </p>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword || ''}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="terms"
                required
                className="mt-1"
              />
              <span className="text-sm text-[#A4ACAF]">
                I agree to the{' '}
                <Link
                  href="/terms"
                  className="text-[#4F46E5] hover:underline"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  href="/privacy"
                  className="text-[#4F46E5] hover:underline"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4F46E5] text-white font-medium py-2.5 rounded-sm hover:bg-[#3c37c4] transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>

            <p className="text-center text-sm text-[#A4ACAF]">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="text-[#4F46E5] hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </>
        )}

        {/* Forgot Password Form */}
        {type === 'forgot-password' && (
          <>
            <div>
              <label htmlFor="email" className="block">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
              <p className="text-xs text-[#A4ACAF] mt-2">
                We'll send you a link to reset your password.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4F46E5] text-white font-medium py-2.5 rounded-sm hover:bg-[#3c37c4] transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <p className="text-center text-sm text-[#A4ACAF]">
              <Link
                href="/auth/login"
                className="text-[#4F46E5] hover:underline font-medium"
              >
                Back to Sign In
              </Link>
            </p>
          </>
        )}

        {/* Reset Password Form */}
        {type === 'reset-password' && (
          <>
            <div>
              <label htmlFor="password" className="block">
                New Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password || ''}
                onChange={handleChange}
                placeholder="Min. 8 characters"
                required
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword || ''}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4F46E5] text-white font-medium py-2.5 rounded-sm hover:bg-[#3c37c4] transition-colors disabled:opacity-50"
            >
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>

            <p className="text-center text-sm text-[#A4ACAF]">
              <Link
                href="/auth/login"
                className="text-[#4F46E5] hover:underline font-medium"
              >
                Back to Sign In
              </Link>
            </p>
          </>
        )}
      </form>
    </div>
  );
}
