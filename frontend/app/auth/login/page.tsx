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

          {/* OAuth Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-[#E5E7EB]" />
            <span className="text-sm text-[#A4ACAF]">or continue with</span>
            <div className="flex-1 h-px bg-[#E5E7EB]" />
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/oauth/google`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-[#E5E7EB] rounded-sm hover:bg-[#F9F7F2] transition-colors font-medium text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 21c-4.963 0-9-4.037-9-9s4.037-9 9-9 9 4.037 9 9-4.037 9-9 9z"
                  clipRule="evenodd"
                />
              </svg>
              Google
            </a>

            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/oauth/github`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-[#E5E7EB] rounded-sm hover:bg-[#F9F7F2] transition-colors font-medium text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
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
