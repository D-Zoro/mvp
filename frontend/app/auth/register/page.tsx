'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { apiClient } from '@/lib/api';
import { setTokens } from '@/lib/auth';
import type { RegisterRequest, AuthResponse, UserRole } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(
    (searchParams.get('role') as UserRole) || 'BUYER'
  );

  const handleRegister = async (formData: Record<string, string>) => {
    try {
      // Parse name
      const nameParts = (formData.name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const registerRequest: RegisterRequest = {
        email: formData.email,
        password: formData.password,
        first_name: firstName,
        last_name: lastName,
        role,
      };

      const response = await apiClient.post<AuthResponse>(
        '/api/v1/auth/register',
        registerRequest
      );

      // Store tokens
      setTokens(response.access_token, response.refresh_token);

      // Redirect based on role
      const destination = role === 'SELLER' ? '/seller/listings' : '/browse';
      router.push(destination);
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        setError((err as any).message);
      } else {
        setError('Registration failed. Please try again.');
      }
      throw err;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-8">
        {/* Heading */}
        <div className="text-center space-y-3">
          <h1 className="font-serif text-4xl font-bold text-[#1A1A1A]">
            Join Books4All
          </h1>
          <p className="text-[#A4ACAF]">
            Create an account to start buying and selling books
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white border-l-4 border-[#4F46E5] rounded-sm p-8 shadow-sm space-y-6">
          {/* Role Selector */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[#1A1A1A]">
              I want to
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="BUYER"
                  checked={role === 'BUYER'}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-[#1A1A1A]">Buy Books</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="SELLER"
                  checked={role === 'SELLER'}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-[#1A1A1A]">Sell Books</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-sm">
              <p className="text-sm text-[#F43F5E]">{error}</p>
            </div>
          )}

          <AuthForm type="register" onSubmit={handleRegister} />
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-[#A4ACAF]">
          Already have an account?{' '}
          <a href="/auth/login" className="text-[#4F46E5] hover:underline font-medium">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
