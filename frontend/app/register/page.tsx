'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'sonner';
import Link from 'next/link';
import type { LoginRequest, RegisterRequest, UserRole } from "@/lib/api/types";

const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['buyer', 'seller'] as const),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'buyer',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const [firstName, ...lastNameParts] = data.full_name.split(' ');
      const lastName = lastNameParts.join(' ');

      const registerData: RegisterRequest = {
        email: data.email,
        password: data.password,
        role: data.role as UserRole,
        first_name: firstName || '',
        last_name: lastName || '',
      };

      await registerUser(registerData);

      toast.success('Registration successful! Welcome to Books4All');
      router.push('/dashboard');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Registration failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-surface overflow-hidden">
      {/* Glassmorphism blobs */}
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

      {/* Register card */}
      <div className="relative flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl">
          {/* Title */}
          <h1 className="text-3xl font-headline font-bold text-center mb-2">
            Join Books4All
          </h1>

          {/* Subtitle */}
          <p className="text-outline text-center mb-8">
            Create your account to get started
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Full Name input */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-onSurface mb-2">
                Full Name
              </label>
              <input
                id="full_name"
                type="text"
                placeholder="John Doe"
                {...register('full_name')}
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-onSurface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
              {errors.full_name && (
                <p className="text-error text-sm mt-2">{errors.full_name.message}</p>
              )}
            </div>

            {/* Email input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-onSurface mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-onSurface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
              {errors.email && (
                <p className="text-error text-sm mt-2">{errors.email.message}</p>
              )}
            </div>

            {/* Password input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-onSurface mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-onSurface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
              {errors.password && (
                <p className="text-error text-sm mt-2">{errors.password.message}</p>
              )}
              <p className="text-outline text-xs mt-1">Minimum 8 characters</p>
            </div>

            {/* Confirm Password input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-onSurface mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-onSurface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
              {errors.confirmPassword && (
                <p className="text-error text-sm mt-2">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Role Toggle */}
            <div>
              <label className="block text-sm font-medium text-onSurface mb-3">
                Account Type
              </label>
              <div className="bg-surface-container-low p-1 rounded-full flex">
                {(['buyer', 'seller'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setValue('role', role)}
                    className={`w-1/2 text-center py-2 rounded-full transition-colors font-medium capitalize ${
                      selectedRole === role
                        ? 'bg-white shadow text-primary'
                        : 'text-outline'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center mt-6 text-sm text-outline">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
