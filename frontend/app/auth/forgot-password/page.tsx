'use client';

import { useState } from 'react';
import AuthForm from '@/components/AuthForm';
import { apiClient } from '@/lib/api';
import type { PasswordResetRequest } from '@/types';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleForgotPassword = async (formData: Record<string, string>) => {
    try {
      const request: PasswordResetRequest = {
        email: formData.email,
      };

      await apiClient.post('/api/v1/auth/forgot-password', request);
      setEmail(formData.email);
      setSubmitted(true);
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        setError((err as any).message);
      } else {
        setError('Failed to send reset link. Please try again.');
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
            Reset Password
          </h1>
          <p className="text-[#A4ACAF]">
            {submitted
              ? 'Check your email for a password reset link'
              : 'Enter your email address and we\'ll send you a link to reset your password'}
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white border-l-4 border-[#4F46E5] rounded-sm p-8 shadow-sm">
          {submitted ? (
            <div className="space-y-6">
              <div className="p-4 bg-[#10B981]/10 border border-[#10B981]/30 rounded-sm">
                <p className="text-sm text-[#10B981] font-medium">
                  ✓ Reset link sent to {email}
                </p>
              </div>
              <p className="text-sm text-[#A4ACAF]">
                If you don't see an email, check your spam folder or try another account.
              </p>
              <a
                href="/auth/login"
                className="block text-center text-[#4F46E5] font-medium hover:underline"
              >
                Back to Sign In
              </a>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-sm">
                  <p className="text-sm text-[#F43F5E]">{error}</p>
                </div>
              )}
              <AuthForm type="forgot-password" onSubmit={handleForgotPassword} />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-[#A4ACAF]">
          <a href="/auth/login" className="text-[#4F46E5] hover:underline font-medium">
            Back to Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
