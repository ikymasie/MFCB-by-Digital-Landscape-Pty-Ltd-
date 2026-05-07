'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ArrowLeft, Mail } from '@/lib/icons';
import api from '@/lib/api';
import {
  spring,
  scaleIn,
  staggerContainer,
  staggerItem,
  staggerItemTransition,
} from '@/lib/motion';

const resetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordRequestPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetForm) => {
    setIsLoading(true);
    try {
      await api.post('/auth/password-reset/request', { email: data.email });
    } catch {
      // Intentionally ignore errors — no email enumeration
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[440px]">
        {/* Centered Secure Card */}
        <motion.div
          className="bg-white border border-[#c3c6d1] rounded-lg p-12 shadow-[0px_4px_12px_rgba(0,0,0,0.05)]"
          variants={scaleIn}
          initial="initial"
          animate="animate"
          transition={spring.crisp}
        >
          {/* Institution Identity */}
          <motion.div
            className="flex flex-col items-center mb-6"
            variants={staggerContainer(0.08)}
            initial="initial"
            animate="animate"
          >
            <motion.div
              className="w-16 h-16 bg-[#003366] rounded-full flex items-center justify-center mb-4 shadow-sm"
              variants={staggerItem}
              transition={staggerItemTransition}
            >
              <ShieldCheck className="w-8 h-8 text-white" />
            </motion.div>
            <motion.h1
              className="text-2xl font-semibold text-[#001e40] text-center"
              variants={staggerItem}
              transition={staggerItemTransition}
            >
              Reset Your Password
            </motion.h1>
            <motion.p
              className="text-base text-[#43474f] text-center mt-2"
              variants={staggerItem}
              transition={staggerItemTransition}
            >
              Enter your registered email address and we&apos;ll send you a link to reset your password.
            </motion.p>
          </motion.div>

          <AnimatePresence mode="wait">
            {submitted ? (
              /* Success State */
              <motion.div
                key="success"
                className="space-y-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={spring.soft}
              >
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">Check your inbox</p>
                    <p className="text-sm text-green-700 mt-1">
                      If an account exists with that email, a password reset link has been sent. Please check your email.
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[#43474f] text-center">
                  Didn&apos;t receive an email? Check your spam folder or{' '}
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="text-[#28628f] hover:underline font-medium"
                  >
                    try again
                  </button>
                  .
                </p>
              </motion.div>
            ) : (
              /* Form Section */
              <motion.form
                key="form"
                className="space-y-6"
                onSubmit={handleSubmit(onSubmit)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={spring.soft}
              >
                <motion.div
                  className="flex flex-col gap-2"
                  variants={staggerItem}
                  initial="initial"
                  animate="animate"
                  transition={{ ...staggerItemTransition, delay: 0.15 }}
                >
                  <label className="text-sm font-semibold text-[#191c1e]" htmlFor="email">
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
                      className="w-full h-12 pl-12 pr-4 bg-white border border-[#c3c6d1] rounded text-base focus:outline-none focus:ring-2 focus:ring-[#97ccfe] focus:border-[#28628f] transition-all"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-600">{errors.email.message}</p>
                  )}
                </motion.div>

                <motion.div
                  variants={staggerItem}
                  initial="initial"
                  animate="animate"
                  transition={{ ...staggerItemTransition, delay: 0.25 }}
                >
                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-[#003366] hover:opacity-90 text-white font-semibold text-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={spring.crisp}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </motion.button>
                </motion.div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer Link */}
          <div className="mt-12 pt-6 border-t border-[#c3c6d1] flex justify-center">
            <motion.a
              href="/login"
              className="flex items-center gap-2 text-[#28628f] hover:text-[#001e40] transition-colors text-sm font-medium group"
              whileHover={{ x: -2 }}
              transition={spring.crisp}
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Login
            </motion.a>
          </div>
        </motion.div>

        {/* Trust Indicator */}
        <motion.div
          className="mt-12 flex items-center gap-4 p-4 rounded-lg border border-dashed border-[#c3c6d1]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.soft, delay: 0.4 }}
        >
          <ShieldCheck className="h-5 w-5 text-[#737780] flex-shrink-0" />
          <p className="text-sm text-[#43474f]">
            Secure 256-bit encrypted authentication gateway.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
