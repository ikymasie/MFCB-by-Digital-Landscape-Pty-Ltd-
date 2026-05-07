'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ArrowLeft, Eye, EyeOff } from '@/lib/icons';
import api from '@/lib/api';
import {
  spring,
  scaleIn,
  staggerContainer,
  staggerItem,
  staggerItemTransition,
  shakeX,
  shakeTransition,
} from '@/lib/motion';

const passwordSchema = z
  .object({
    new_password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least 1 number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least 1 special character'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score === 2) return { score, label: 'Fair', color: 'bg-amber-500' };
  if (score === 3) return { score, label: 'Good', color: 'bg-yellow-500' };
  if (score === 4) return { score, label: 'Strong', color: 'bg-emerald-500' };
  return { score, label: 'Very Strong', color: 'bg-emerald-600' };
}

function NewPasswordResetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const passwordValue = watch('new_password') ?? '';
  const strength = getPasswordStrength(passwordValue);

  const checks = [
    { label: 'Minimum 12 characters', met: passwordValue.length >= 12 },
    { label: 'At least 1 uppercase letter', met: /[A-Z]/.test(passwordValue) },
    { label: 'At least 1 lowercase letter', met: /[a-z]/.test(passwordValue) },
    { label: 'At least 1 number', met: /[0-9]/.test(passwordValue) },
    { label: 'At least 1 special character', met: /[^A-Za-z0-9]/.test(passwordValue) },
  ];

  const onSubmit = async (data: PasswordForm) => {
    setServerError(null);
    if (!token) {
      setServerError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }
    try {
      await api.post('/auth/password-reset/confirm', {
        token,
        new_password: data.new_password,
      });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setServerError(
        error?.response?.data?.message ??
          'Failed to reset password. The link may be expired or invalid.'
      );
    }
  };

  if (!token) {
    return (
      <main className="flex-grow flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[480px]">
          <motion.div
            className="bg-white border border-[#c3c6d1] rounded-xl p-12 shadow-[0px_4px_12px_rgba(0,0,0,0.05)]"
            variants={scaleIn}
            initial="initial"
            animate="animate"
            transition={spring.crisp}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-semibold text-[#001e40]">Invalid Reset Link</h1>
              <p className="text-[#43474f]">
                This password reset link is invalid or missing a token. Please request a new reset link.
              </p>
              <a
                href="/auth/reset"
                className="mt-4 inline-flex items-center gap-2 text-[#28628f] hover:underline font-medium text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Request new reset link
              </a>
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[480px]">
        {/* Logo Section */}
        <motion.div
          className="flex justify-center mb-12"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.soft, delay: 0.05 }}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-[#003366] rounded-lg flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#001e40]">Botswana Credit Bureau</span>
          </div>
        </motion.div>

        {/* Central Secure Card */}
        <motion.div
          className="bg-white border border-[#c3c6d1] rounded-xl p-12 shadow-[0px_4px_12px_rgba(0,0,0,0.05)]"
          variants={scaleIn}
          initial="initial"
          animate="animate"
          transition={spring.crisp}
        >
          <motion.header
            className="mb-6"
            variants={staggerContainer(0.08)}
            initial="initial"
            animate="animate"
          >
            <motion.h1
              className="text-3xl font-semibold text-[#191c1e] mb-2"
              variants={staggerItem}
              transition={staggerItemTransition}
            >
              Create New Password
            </motion.h1>
            <motion.p
              className="text-base text-[#43474f]"
              variants={staggerItem}
              transition={staggerItemTransition}
            >
              Please choose a strong password to secure your account.
            </motion.p>
          </motion.header>

          <AnimatePresence>
            {success && (
              <motion.div
                key="success-banner"
                className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={spring.soft}
              >
                <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-green-800 font-medium">
                  Password updated successfully! Redirecting to login...
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {serverError && (
              <motion.div
                key="server-error"
                className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
                variants={shakeX}
                animate="animate"
                transition={shakeTransition}
                initial={{ opacity: 0, height: 0 }}
                exit={{ opacity: 0, height: 0 }}
              >
                {serverError}
              </motion.div>
            )}
          </AnimatePresence>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* New Password */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring.soft, delay: 0.2 }}
            >
              <label
                className="text-sm font-semibold text-[#191c1e] uppercase tracking-wider"
                htmlFor="new_password"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  {...register('new_password')}
                  id="new_password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter secure password"
                  className="w-full bg-white border border-[#737780] rounded-lg px-4 py-3 pr-12 text-base focus:ring-2 focus:ring-[#97ccfe] focus:border-[#28628f] transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#43474f] hover:text-[#001e40]"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.new_password && (
                <p className="text-xs text-red-600">{errors.new_password.message}</p>
              )}
            </motion.div>

            {/* Password Strength Checklist */}
            <motion.div
              className="bg-[#f2f4f6] rounded-lg p-4 space-y-4 border border-[#c3c6d1]/30"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring.soft, delay: 0.28 }}
            >
              <p className="text-xs font-semibold text-[#43474f] uppercase tracking-wider mb-2">
                Password Requirements
              </p>
              <div className="grid grid-cols-1 gap-2">
                {checks.map((check) => (
                  <div key={check.label} className="flex items-center gap-2">
                    {check.met ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-[#737780] flex-shrink-0" />
                    )}
                    <span className={`text-sm ${check.met ? 'text-emerald-700 font-medium' : 'text-[#43474f]'}`}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Strength Meter */}
              {passwordValue.length > 0 && (
                <div className="mt-2 pt-2">
                  <div className="w-full bg-[#e0e3e5] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`${strength.color} h-full rounded-full transition-all duration-300`}
                      style={{ width: `${(strength.score / 5) * 100}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 uppercase font-semibold tracking-wider ${
                    strength.score <= 1 ? 'text-red-600' :
                    strength.score === 2 ? 'text-amber-600' :
                    strength.score === 3 ? 'text-yellow-600' :
                    'text-emerald-600'
                  }`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Confirm Password */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring.soft, delay: 0.36 }}
            >
              <label
                className="text-sm font-semibold text-[#191c1e] uppercase tracking-wider"
                htmlFor="confirm_password"
              >
                Confirm Password
              </label>
              <input
                {...register('confirm_password')}
                id="confirm_password"
                type="password"
                placeholder="Repeat new password"
                className="w-full bg-white border border-[#737780] rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-[#97ccfe] focus:border-[#28628f] transition-all outline-none"
              />
              {errors.confirm_password && (
                <p className="text-xs text-red-600">{errors.confirm_password.message}</p>
              )}
            </motion.div>

            {/* Action Button */}
            <motion.div
              className="pt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.soft, delay: 0.44 }}
            >
              <motion.button
                type="submit"
                disabled={isSubmitting || success}
                className="w-full bg-[#003366] text-white font-semibold text-sm py-3 px-12 rounded-lg shadow-sm hover:brightness-110 transition-all uppercase tracking-widest disabled:opacity-60 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.crisp}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </motion.button>
            </motion.div>
          </form>

          <footer className="mt-12 pt-6 border-t border-[#c3c6d1] text-center">
            <motion.a
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#175683] hover:text-[#001e40] transition-colors"
              whileHover={{ x: -2 }}
              transition={spring.crisp}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </motion.a>
          </footer>
        </motion.div>

        {/* Contextual Security Notice */}
        <motion.div
          className="mt-12 flex items-start gap-4 px-4 text-[#43474f]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.soft, delay: 0.5 }}
        >
          <ShieldCheck className="h-5 w-5 text-[#28628f] flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            Your data is protected by industry-standard 256-bit AES encryption. MFCB follows
            strict protocols mandated by the Bank of Botswana for sensitive financial data management.
          </p>
        </motion.div>
      </div>
    </main>
  );
}

export default function NewPasswordResetPage() {
  return (
    <Suspense fallback={
      <main className="flex-grow flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#43474f]">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </main>
    }>
      <NewPasswordResetContent />
    </Suspense>
  );
}
