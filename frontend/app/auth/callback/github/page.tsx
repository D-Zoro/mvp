'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { setTokens } from '@/lib/auth';

export default function GitHubCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Exchange code for tokens
        const response = await apiClient.post<{
          access_token: string;
          refresh_token: string;
        }>('/api/v1/auth/oauth/github/callback', { code, state });

        setTokens(response.access_token, response.refresh_token);
        router.push('/browse');
      } catch (err) {
        const message =
          typeof err === 'object' && err !== null && 'message' in err
            ? (err as any).message
            : 'Failed to authenticate with GitHub';
        setError(message);
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] py-12">
        <div className="container mx-auto px-6 max-w-md text-center">
          <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-4">
            Authentication Failed
          </h1>
          <p className="text-[#F43F5E] mb-6">{error}</p>
          <a
            href="/auth/login"
            className="inline-block text-[#4F46E5] hover:underline font-medium"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-12">
      <div className="container mx-auto px-6 max-w-md text-center">
        <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-4">
          Signing you in…
        </h1>
        <div className="inline-block">
          <div className="w-12 h-12 border-4 border-[#E5E7EB] border-t-[#4F46E5] rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
}
