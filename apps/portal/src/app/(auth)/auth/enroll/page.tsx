'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Shield } from '@/lib/icons';
import QRCode from 'qrcode';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  spring,
  scaleIn,
  staggerContainer,
  staggerItem,
  staggerItemTransition,
  shakeX,
  shakeTransition,
} from '@/lib/motion';

interface EnrollData {
  secret: string;
  qr_uri: string;
}

export default function MFAEnrollPage() {
  const router = useRouter();
  const { partialToken, setToken, setUser } = useAuthStore();
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const initEnroll = async () => {
      try {
        const res = await api.post('/auth/mfa/enroll', {
          partial_token: partialToken,
        });
        setEnrollData(res.data);
        const dataUrl = await QRCode.toDataURL(res.data.qr_uri, { width: 224, margin: 2 });
        setQrDataUrl(dataUrl);
      } catch {
        setError('Failed to initialize MFA enrollment. Please go back and try again.');
      } finally {
        setInitLoading(false);
      }
    };
    initEnroll();
  }, [partialToken]);

  const handleChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const newDigits = [...digits];
    newDigits[idx] = val;
    setDigits(newDigits);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
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
      const res = await api.post('/auth/mfa/confirm', {
        partial_token: partialToken,
        totp_code: code,
        secret: enrollData?.secret,
      });
      const { access_token } = res.data;
      setToken(access_token);
      // Decode JWT payload to populate user store
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-[#c3c6d1] shadow-sm">
        <nav className="flex justify-between items-center w-full px-6 md:px-12 max-w-[1280px] mx-auto h-16">
          <span className="text-2xl font-bold text-[#001e40]">MFCB Portal</span>
        </nav>
      </header>

      {/* Main */}
      <main className="flex-grow flex items-center justify-center p-6 md:p-16">
        <motion.div
          className="w-full max-w-3xl bg-white rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] border border-[#c3c6d1] overflow-hidden"
          variants={scaleIn}
          initial="initial"
          animate="animate"
          transition={spring.crisp}
        >
          {/* Header */}
          <motion.div
            className="p-12 text-center border-b border-[#c3c6d1] bg-[#f7f9fb]"
            variants={staggerContainer(0.08)}
            initial="initial"
            animate="animate"
          >
            <motion.div
              className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#003366] text-white mb-4"
              variants={staggerItem}
              transition={staggerItemTransition}
            >
              <ShieldCheck className="h-6 w-6" />
            </motion.div>
            <motion.h1
              className="text-3xl font-semibold text-[#001e40]"
              variants={staggerItem}
              transition={staggerItemTransition}
            >
              Enable Multi-Factor Authentication
            </motion.h1>
            <motion.p
              className="text-[#43474f] text-base mt-2"
              variants={staggerItem}
              transition={staggerItemTransition}
            >
              Enhance your account security with institutional-grade protection.
            </motion.p>
          </motion.div>

          {/* Stepper */}
          <div className="px-12 py-6 bg-[#f2f4f6]/50">
            <div className="flex items-center justify-between max-w-md mx-auto">
              {[
                { n: 1, label: 'Setup', active: true },
                { n: 2, label: 'Scan', active: true },
                { n: 3, label: 'Verify', active: false },
              ].map((step, i, arr) => (
                <React.Fragment key={step.n}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                        step.active
                          ? 'border-[#001e40] bg-[#001e40] text-white'
                          : 'border-[#c3c6d1] text-[#43474f]'
                      }`}
                    >
                      {step.n}
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        step.active ? 'text-[#001e40]' : 'text-[#43474f]'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      className={`flex-grow h-[2px] mx-2 ${
                        i === 0 ? 'bg-[#001e40]' : 'bg-[#c3c6d1]'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-12 space-y-12">
            <AnimatePresence mode="wait">
              {initLoading ? (
                <motion.div
                  key="loading"
                  className="flex items-center justify-center py-12"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={spring.soft}
                >
                  <svg className="animate-spin h-8 w-8 text-[#28628f]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={spring.soft}
                >
                  {/* Steps 1 & 2 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                    {/* Instructions */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-[#001e40]">Step 1: Install Authenticator</h3>
                        <p className="text-sm text-[#43474f]">
                          Install an authenticator app like{' '}
                          <strong>Google Authenticator</strong> or{' '}
                          <strong>Microsoft Authenticator</strong> on your mobile device.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-[#001e40]">Step 2: Scan QR Code</h3>
                        <p className="text-sm text-[#43474f]">
                          Open the app and scan the QR code to link your Botswana Credit Bureau account.
                        </p>
                      </div>
                      {enrollData?.secret && (
                        <div className="bg-[#f2f4f6] p-4 rounded-lg border border-[#c3c6d1]">
                          <p className="text-xs text-[#43474f] uppercase font-semibold mb-1">
                            Can&apos;t scan? Enter manually:
                          </p>
                          <code className="text-[#001e40] font-mono text-base tracking-wider bg-white px-3 py-1 rounded block border border-[#c3c6d1] select-all">
                            {enrollData.secret}
                          </code>
                        </div>
                      )}
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center justify-center p-6 bg-white border border-[#c3c6d1] rounded-xl shadow-sm">
                      {qrDataUrl ? (
                        <motion.div
                          initial={{ opacity: 0, filter: 'blur(8px)', scale: 0.95 }}
                          animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                        >
                          <img
                            src={qrDataUrl}
                            alt="MFA QR Code — scan with your authenticator app"
                            className="w-48 h-48 md:w-56 md:h-56 object-contain"
                          />
                        </motion.div>
                      ) : (
                        <div className="w-48 h-48 bg-[#f2f4f6] border border-[#c3c6d1] rounded flex items-center justify-center">
                          <Shield className="h-12 w-12 text-[#737780]" />
                        </div>
                      )}
                      <div className="mt-6 flex items-center gap-2 text-[#43474f] text-xs">
                        <Lock className="h-4 w-4" />
                        <span>Secure encrypted link</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Verify */}
                  <div className="pt-12 border-t border-[#c3c6d1] mt-12">
                    <div className="max-w-md mx-auto text-center space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold text-[#001e40]">Step 3: Verify Setup</h3>
                        <p className="text-sm text-[#43474f]">
                          Enter the 6-digit code generated by your app to complete the enrollment.
                        </p>
                      </div>

                      <AnimatePresence>
                        {error && (
                          <motion.div
                            key="enroll-error"
                            className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
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

                      <form onSubmit={handleSubmit}>
                        <motion.div
                          className="flex justify-center gap-3 mb-6"
                          variants={staggerContainer(0.04)}
                          initial="initial"
                          animate="animate"
                        >
                          {digits.map((d, i) => (
                            <React.Fragment key={i}>
                              {i === 3 && <div className="w-4" />}
                              <motion.div
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
                                  placeholder="•"
                                  className="w-12 h-14 text-center text-2xl font-bold border border-[#c3c6d1] rounded-lg bg-white focus:ring-2 focus:ring-[#28628f] focus:border-[#28628f] outline-none transition-all"
                                />
                              </motion.div>
                            </React.Fragment>
                          ))}
                        </motion.div>

                        <div className="flex flex-col items-center gap-3">
                          <motion.button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#003366] text-white py-3 rounded-lg font-semibold shadow-sm hover:opacity-90 transition-all duration-200 disabled:opacity-60"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            transition={spring.crisp}
                          >
                            {loading ? 'Enabling...' : 'Enable MFA'}
                          </motion.button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await api.post('/auth/mfa/skip', { partial_token: partialToken });
                                const { access_token } = res.data;
                                setToken(access_token);
                                const p = JSON.parse(atob(access_token.split('.')[1]));
                                setUser({ id: p.sub, role: p.role, institutionId: p.institutionId ?? null, permissions: p.permissions ?? [] });
                                window.location.href = '/dashboard';
                              } catch {
                                router.push('/dashboard');
                              }
                            }}
                            className="text-sm text-[#28628f] hover:underline"
                          >
                            Skip for now
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer note */}
          <div className="px-12 py-4 bg-[#eceef0] border-t border-[#c3c6d1] flex items-center justify-center gap-2">
            <Lock className="h-4 w-4 text-[#43474f]" />
            <span className="text-xs text-[#43474f]">
              Botswana Credit Bureau Security Standard Protocol
            </span>
          </div>
        </motion.div>
      </main>

      <footer className="py-6 text-center text-xs text-[#43474f]">
        © 2024 Botswana Credit Bureau (MFCB). All rights reserved.
      </footer>
    </div>
  );
}
