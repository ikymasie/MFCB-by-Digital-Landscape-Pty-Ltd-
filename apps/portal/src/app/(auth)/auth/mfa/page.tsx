'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock } from '@/lib/icons';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  fadeUp,
  fadeUpTransition,
  staggerContainer,
  staggerItem,
  staggerItemTransition,
  shakeX,
  shakeTransition,
  spring,
} from '@/lib/motion';

export default function MFAPage() {
  const router = useRouter();
  const { partialToken, setToken, setUser } = useAuthStore();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const newDigits = [...digits];
    newDigits[idx] = val;
    setDigits(newDigits);
    if (val && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const newDigits = [...digits];
      pasted.split('').forEach((c, i) => { newDigits[i] = c; });
      setDigits(newDigits);
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login/verify-mfa', {
        partial_token: partialToken,
        totp_code: code,
      });
      const { access_token } = res.data;
      setToken(access_token);
      const payload = JSON.parse(atob(access_token.split('.')[1]));
      setUser({
        id: payload.sub,
        role: payload.role,
        institutionId: payload.institutionId ?? null,
        permissions: payload.permissions ?? [],
      });
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message ?? 'Invalid code. Please try again.');
      setDigits(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-[#c3c6d1] shadow-sm sticky top-0 z-50">
        <nav className="flex justify-between items-center w-full px-6 h-16 max-w-[1280px] mx-auto">
          <span className="text-2xl font-bold text-[#001e40]">Botswana Credit Bureau</span>
        </nav>
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          className="w-full max-w-md bg-white border border-[#c3c6d1] rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] overflow-hidden"
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={fadeUpTransition}
        >
          {/* Accent bar */}
          <motion.div
            className="h-1.5 bg-[#003366] w-full"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: 'left' }}
          />

          <div className="p-8 flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col items-center text-center gap-2">
              <motion.div
                className="w-16 h-16 bg-[#d5e3ff] rounded-full flex items-center justify-center mb-2"
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ShieldCheck className="h-8 w-8 text-[#001e40]" />
              </motion.div>
              <h1 className="text-3xl font-bold text-[#001e40]">Security Verification</h1>
              <p className="text-base text-[#43474f] max-w-[320px]">
                Enter the 6-digit code from your authenticator app to secure your account.
              </p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="mfa-error"
                  className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-center"
                  variants={shakeX}
                  animate="animate"
                  transition={shakeTransition}
                  initial={{ opacity: 0, height: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* OTP Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              <motion.div
                className="flex justify-between gap-2"
                variants={staggerContainer(0.04)}
                initial="initial"
                animate="animate"
              >
                {digits.map((d, i) => (
                  <motion.div
                    key={i}
                    variants={staggerItem}
                    transition={staggerItemTransition}
                    animate={{ scale: d ? [1, 1.15, 1] : 1 }}
                  >
                    <input
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onPaste={handlePaste}
                      aria-label={`Digit ${i + 1}`}
                      className="w-12 h-14 text-center text-2xl font-bold border border-[#c3c6d1] rounded-lg bg-white focus:outline-none focus:border-[#75AADB] focus:shadow-[0_0_0_2px_rgba(117,170,219,0.2)] transition-all"
                    />
                  </motion.div>
                ))}
              </motion.div>

              <div className="flex flex-col gap-3">
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#003366] text-white py-3 rounded-lg font-semibold text-sm hover:brightness-110 transition-all shadow-sm disabled:opacity-60"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={spring.crisp}
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </motion.button>
                <button
                  type="button"
                  className="w-full bg-transparent border border-[#28628f] text-[#28628f] py-3 rounded-lg font-semibold text-sm hover:bg-[#f2f4f6] transition-all"
                >
                  Use backup code
                </button>
              </div>
            </form>

            <div className="flex flex-col items-center gap-1 mt-2">
              <span className="text-sm text-[#43474f]">Didn&apos;t receive a code?</span>
              <button className="text-[#28628f] font-semibold text-sm hover:underline">
                Try again
              </button>
            </div>
          </div>

          {/* Security note */}
          <div className="bg-[#f2f4f6] p-4 border-t border-[#c3c6d1] flex items-start gap-2">
            <Lock className="h-4 w-4 text-[#737780] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#43474f] leading-snug">
              This is a secure institutional portal. For your protection, your session will
              automatically expire after 5 minutes of inactivity. Access is monitored and logged.
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-[#161e31] w-full py-12 px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-semibold text-sm text-white">Botswana Credit Bureau (MFCB)</span>
          <p className="text-sm text-[#bec6e0]">
            © 2024 Botswana Credit Bureau (MFCB). All rights reserved. Authorized by the Bank of Botswana.
          </p>
        </div>
        <motion.div
          className="flex gap-6"
          variants={staggerContainer(0.04)}
          initial="initial"
          animate="animate"
        >
          {['Privacy Policy', 'Terms of Service', 'Legal Disclaimer', 'Contact Support'].map((l) => (
            <motion.a
              key={l}
              href="#"
              className="text-sm text-[#bec6e0] hover:text-white transition-colors"
              variants={staggerItem}
            >
              {l}
            </motion.a>
          ))}
        </motion.div>
      </footer>
    </div>
  );
}
