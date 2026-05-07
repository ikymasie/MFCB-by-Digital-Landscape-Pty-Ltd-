'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Mail, Lock, LogIn, ShieldCheck } from '@/lib/icons';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  spring,
  fadeUp,
  fadeUpTransition,
  staggerContainer,
  staggerItem,
  staggerItemTransition,
  shakeX,
  shakeTransition,
} from '@/lib/motion';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setPartialToken } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      const res = await api.post('/auth/login', data);
      const { partial_token, next_step } = res.data;
      setPartialToken(partial_token);
      if (next_step === 'ENROLL_MFA') {
        router.push('/auth/enroll');
      } else {
        router.push('/auth/mfa');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setServerError(
        error?.response?.data?.message ?? 'Invalid email or password. Please try again.'
      );
    }
  };

  return (
    <motion.main
      className="min-h-screen flex flex-col justify-center items-center p-6 bg-[#f7f9fb]"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      <div className="w-full max-w-[480px] flex flex-col items-center">
        {/* Login Card */}
        <div className="w-full bg-white shadow-[0px_4px_12px_rgba(0,0,0,0.05)] border border-[#c3c6d1] rounded-lg p-16 flex flex-col items-center">
          {/* Branding */}
          <motion.div
            className="mb-12 flex flex-col items-center gap-4"
            variants={staggerContainer(0.08)}
            initial="initial"
            animate="animate"
          >
            <motion.div
              className="w-16 h-16 bg-[#003366] rounded-lg flex items-center justify-center mb-1"
              initial={{ scale: 0.6, rotate: -15, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={spring.crisp}
            >
              <Building2 className="w-10 h-10 text-white" />
            </motion.div>
            <motion.h1
              className="text-2xl font-semibold text-[#001e40] text-center"
              variants={staggerItem}
              transition={staggerItemTransition}
            >
              MFCB Portal Sign In
            </motion.h1>
            <motion.p
              className="text-sm text-[#43474f] text-center px-4"
              variants={staggerItem}
              transition={staggerItemTransition}
            >
              Enter your credentials to access the secure Botswana Credit Bureau management dashboard.
            </motion.p>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                key="server-error"
                className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
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

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
            {/* Email */}
            <motion.div
              className="flex flex-col gap-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring.soft, delay: 0.2 }}
            >
              <label
                htmlFor="email"
                className="text-xs font-semibold text-[#191c1e] uppercase tracking-wider"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#737780]" />
                </div>
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  placeholder="e.g. name@institution.bw"
                  className="w-full pl-12 pr-4 py-3 bg-white border border-[#c3c6d1] rounded text-sm text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#97ccfe] focus:border-[#28628f] transition-all"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </motion.div>

            {/* Password */}
            <motion.div
              className="flex flex-col gap-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring.soft, delay: 0.3 }}
            >
              <div className="flex justify-between items-end">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold text-[#191c1e] uppercase tracking-wider"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#737780]" />
                </div>
                <input
                  {...register('password')}
                  id="password"
                  type="password"
                  placeholder="Enter secure password"
                  className="w-full pl-12 pr-4 py-3 bg-white border border-[#c3c6d1] rounded text-sm text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#97ccfe] focus:border-[#28628f] transition-all"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </motion.div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-6 bg-[#003366] text-white font-semibold text-sm rounded hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <LogIn className="h-4 w-4" />
                </>
              )}
            </motion.button>

            {/* Forgot password */}
            <div className="flex justify-center pt-1">
              <motion.a
                href="/auth/reset"
                className="text-sm text-[#28628f] hover:underline transition-colors"
                whileHover={{ x: 2 }}
                transition={spring.crisp}
              >
                Forgot password?
              </motion.a>
            </div>
          </form>
        </div>

        {/* Security disclaimer */}
        <motion.div
          className="mt-12 w-full flex gap-4 items-center p-4 bg-[#f2f4f6] border border-[#c3c6d1] rounded-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.soft, delay: 0.5 }}
        >
          <ShieldCheck className="h-5 w-5 text-[#28628f] flex-shrink-0" />
          <p className="text-sm text-[#43474f]">
            This is a secure system authorized by the{' '}
            <span className="font-bold">Bank of Botswana</span>. All access and activity is
            logged and monitored.
          </p>
        </motion.div>

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="text-sm text-[#737780]">
            © 2026 Botswana Credit Bureau (MFCB). All rights reserved.
          </p>
        </footer>
      </div>
    </motion.main>
  );
}
