'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { apiClient } from '@/lib/api';
import type { PasswordResetConfirm } from '@/types';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new one.');
    }
  }, [token]);

  const handleResetPassword = async (formData: Record<string, string>) => {
    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!token) {
        throw new Error('Invalid reset token');
      }

      const request: PasswordResetConfirm = {
        token,
        new_password: formData.password,
      };

      await apiClient.post('/api/v1/auth/reset-password', request);
      setSubmitted(true);
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        setError((err as any).message);
      } else {
        setError('Failed to reset password. Please try again.');
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
            Set New Password
          </h1>
          <p className="text-[#A4ACAF]">
            {submitted
              ? 'Your password has been reset successfully'
              : 'Enter your new password below'}
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white border-l-4 border-[#4F46E5] rounded-sm p-8 shadow-sm">
          {submitted ? (
            <div className="space-y-6">
              <div className="p-4 bg-[#10B981]/10 border border-[#10B981]/30 rounded-sm">
                <p className="text-sm text-[#10B981] font-medium">
                  ✓ Password reset successfully!
                </p>
              </div>
              <p className="text-sm text-[#A4ACAF]">
                You can now sign in with your new password.
              </p>
              <a
                href="/auth/login"
                className="block text-center bg-[#4F46E5] text-white font-medium py-2.5 rounded-sm hover:bg-[#3c37c4] transition-colors"
              >
                Sign In
              </a>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-sm">
                  <p className="text-sm text-[#F43F5E]">{error}</p>
                </div>
              )}
              {token && (
                <AuthForm type="reset-password" onSubmit={handleResetPassword} />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="text-center text-sm text-[#A4ACAF]">
            <a href="/auth/login" className="text-[#4F46E5] hover:underline font-medium">
              Back to Sign In
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
