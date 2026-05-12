'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { apiClient } from '@/lib/api';
import { setTokens } from '@/lib/auth';
import type { LoginRequest, AuthResponse } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (formData: Record<string, string>) => {
    try {
      const loginRequest: LoginRequest = {
        email: formData.email,
        password: formData.password,
      };

      const response = await apiClient.post<AuthResponse>(
        '/api/v1/auth/login',
        loginRequest
      );

      // Store tokens
      setTokens(response.access_token, response.refresh_token);

      // Redirect to browse page
      router.push('/browse');
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        setError((err as any).message);
      } else {
        setError('Login failed. Please check your credentials.');
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
            Welcome Back
          </h1>
          <p className="text-[#A4ACAF]">
            Sign in to your Books4All account
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white border-l-4 border-[#4F46E5] rounded-sm p-8 shadow-sm">
          {error && (
            <div className="mb-6 p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-sm">
              <p className="text-sm text-[#F43F5E]">{error}</p>
            </div>
          )}
          <AuthForm type="login" onSubmit={handleLogin} />
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-[#A4ACAF]">
          Don't have an account?{' '}
          <a href="/auth/register" className="text-[#4F46E5] hover:underline font-medium">
            Create one
          </a>
        </div>
      </div>
    </div>
  );
}
