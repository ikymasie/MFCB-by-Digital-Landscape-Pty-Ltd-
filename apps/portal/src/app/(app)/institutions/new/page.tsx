'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Building2, ServerCog, Package, CheckSquare, ArrowRight, ArrowLeft, X } from '@/lib/icons';
import api from '@/lib/api';
import {
  spring, scaleIn, staggerContainer, staggerItem, staggerItemTransition,
} from '@/lib/motion';

// ─── Step schemas ──────────────────────────────────────────────────────────────
const step1Schema = z.object({
  name: z.string().min(2, 'Institution name is required'),
  supplier_reference_number: z.string().min(3, 'SRN is required'),
});

const step2Schema = z.object({
  integration_channel: z.enum(['REST_API', 'PORTAL_UPLOAD', 'SFTP'], {
    required_error: 'Please select an integration channel',
  }),
  allowed_ip_ranges: z.string().optional(),
});

const step3Schema = z.object({
  enabled_products: z.array(z.string()).min(1, 'Please select at least one product'),
});

type Step1Form = z.infer<typeof step1Schema>;
type Step2Form = z.infer<typeof step2Schema>;
type Step3Form = z.infer<typeof step3Schema>;

const ACCOUNT_TYPES = [
  { code: 'B', label: 'B — Bond Account' },
  { code: 'C', label: 'C — Credit Card' },
  { code: 'D', label: 'D — Debit Card' },
  { code: 'E', label: 'E — Education Loan' },
  { code: 'F', label: 'F — Furniture Account' },
  { code: 'G', label: 'G — Government Loan' },
  { code: 'H', label: 'H — Home Loan' },
  { code: 'I', label: 'I — Insurance' },
  { code: 'M', label: 'M — Motor Vehicle Loan' },
  { code: 'N', label: 'N — Personal Loan (Unsecured)' },
  { code: 'O', label: 'O — Other Credit' },
  { code: 'P', label: 'P — Payday Loan' },
  { code: 'R', label: 'R — Retail Account' },
  { code: 'S', label: 'S — Student Loan' },
  { code: 'T', label: 'T — Telco Account' },
  { code: 'U', label: 'U — Utility Account' },
  { code: 'V', label: 'V — Vehicle Finance' },
  { code: 'W', label: 'W — Working Capital Loan' },
  { code: 'X', label: 'X — Overdraft' },
  { code: 'Y', label: 'Y — General Business Credit' },
  { code: 'Z', label: 'Z — Micro-Finance' },
];

const STEP_CONFIG = [
  { key: 1, label: 'Institution Details', icon: Building2 },
  { key: 2, label: 'Integration Channel', icon: ServerCog },
  { key: 3, label: 'Products & Accounts', icon: Package },
  { key: 4, label: 'Review & Activate', icon: CheckSquare },
];

export default function NewInstitutionPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Accumulated form data across all steps
  const [formData, setFormData] = useState<{
    step1?: Step1Form;
    step2?: Step2Form;
    step3?: Step3Form;
  }>({});

  // Step 1
  const step1 = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: formData.step1,
  });

  // Step 2
  const step2 = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: formData.step2,
  });

  // Step 3
  const step3 = useForm<Step3Form>({
    resolver: zodResolver(step3Schema),
    defaultValues: formData.step3 ?? { enabled_products: [] },
  });

  const handleStep1 = step1.handleSubmit((data) => {
    setFormData((prev) => ({ ...prev, step1: data }));
    setCurrentStep(2);
  });

  const handleStep2 = step2.handleSubmit((data) => {
    setFormData((prev) => ({ ...prev, step2: data }));
    setCurrentStep(3);
  });

  const handleStep3 = step3.handleSubmit((data) => {
    setFormData((prev) => ({ ...prev, step3: data }));
    setCurrentStep(4);
  });

  const handleSubmit = async () => {
    if (!formData.step1 || !formData.step2 || !formData.step3) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        name: formData.step1.name,
        supplier_reference_number: formData.step1.supplier_reference_number,
        integration_channel: formData.step2.integration_channel,
        allowed_ip_ranges: formData.step2.allowed_ip_ranges
          ? formData.step2.allowed_ip_ranges.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        enabled_products: formData.step3.enabled_products,
      };
      const res = await api.post('/institutions', payload);
      const newId = res.data?.institution_id ?? res.data?.id;
      router.push(newId ? `/institutions/${newId}` : '/institutions');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSubmitError(e?.response?.data?.message ?? 'Failed to create institution. Please try again.');
      setIsSubmitting(false);
    }
  };

  const progressWidth = `${((currentStep - 1) / (STEP_CONFIG.length - 1)) * 100}%`;

  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      <main className="w-full max-w-[1280px] mx-auto px-6 py-12 flex flex-col gap-12">
        {/* Header & Breadcrumb */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#43474f] text-sm font-semibold">
            <span>Management</span>
            <ChevronRight className="h-4 w-4" />
            <span
              className="hover:text-[#001e40] cursor-pointer"
              onClick={() => router.push('/institutions')}
            >
              Institutions
            </span>
            <ChevronRight className="h-4 w-4" />
            <span>Institution Onboarding</span>
          </div>
          <h1 className="text-[40px] leading-[1.2] font-bold text-[#001e40] tracking-tight">
            Institution Onboarding
          </h1>
          <p className="text-base text-[#43474f] max-w-2xl">
            Register a new lending institution within the Botswana Credit Bureau ecosystem. Please ensure
            all information aligns with Section 15 regulatory requirements.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="relative w-full overflow-x-auto pb-4">
          <div className="flex justify-between items-start min-w-[600px] relative">
            {/* Track */}
            <div className="absolute top-[18px] left-0 w-full h-[2px] bg-[#c3c6d1] z-0" />
            <div
              className="absolute top-[18px] left-0 h-[2px] bg-[#001e40] z-0 transition-all duration-500"
              style={{ width: progressWidth }}
            />
            {/* Steps */}
            {STEP_CONFIG.map((step) => {
              const isActive = currentStep === step.key;
              const isDone = currentStep > step.key;
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isActive
                        ? 'bg-[#001e40] text-white'
                        : 'bg-[#e0e3e5] border border-[#737780] text-[#43474f]'
                    }`}
                  >
                    {isDone ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <step.icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold text-center ${
                      isActive ? 'text-[#001e40]' : isDone ? 'text-emerald-700' : 'text-[#43474f]'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Form Content */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <motion.div
              variants={scaleIn}
              initial="initial"
              animate="animate"
              transition={spring.crisp}
              className="bg-white p-8 lg:p-12 rounded-xl border border-[#c3c6d1] shadow-[0px_4px_12px_rgba(0,0,0,0.05)]"
            >

              {/* ─── STEP 1: Basic Info ─────────────────────────────────────── */}
              {currentStep === 1 && (
                <form onSubmit={handleStep1}>
                  <div className="flex items-center gap-3 mb-12">
                    <Building2 className="h-5 w-5 text-[#001e40]" />
                    <h2 className="text-2xl font-semibold text-[#001e40]">Institution Information</h2>
                  </div>
                  <motion.div
                    variants={staggerContainer(0.05)}
                    initial="initial"
                    animate="animate"
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    <motion.div
                      variants={staggerItem}
                      transition={staggerItemTransition}
                      className="flex flex-col gap-1 md:col-span-2"
                    >
                      <label className="text-sm font-semibold text-[#191c1e]">Institution Name</label>
                      <input
                        {...step1.register('name')}
                        type="text"
                        placeholder="e.g. Botswana National Commercial Bank"
                        className="w-full bg-white border border-[#737780] rounded px-4 py-2 text-base focus:border-[#28628f] focus:ring-1 focus:ring-[#28628f] transition-all outline-none"
                      />
                      {step1.formState.errors.name && (
                        <p className="text-xs text-red-600">{step1.formState.errors.name.message}</p>
                      )}
                    </motion.div>
                    <motion.div
                      variants={staggerItem}
                      transition={staggerItemTransition}
                      className="flex flex-col gap-1"
                    >
                      <label className="text-sm font-semibold text-[#191c1e]">
                        SRN (System Reference Number)
                      </label>
                      <input
                        {...step1.register('supplier_reference_number')}
                        type="text"
                        placeholder="SRN-000-0000"
                        className="w-full bg-white border border-[#737780] rounded px-4 py-2 text-base focus:border-[#28628f] transition-all outline-none"
                      />
                      {step1.formState.errors.supplier_reference_number && (
                        <p className="text-xs text-red-600">
                          {step1.formState.errors.supplier_reference_number.message}
                        </p>
                      )}
                    </motion.div>
                  </motion.div>
                  <div className="mt-16 pt-6 border-t border-[#c3c6d1] flex justify-between items-center">
                    <motion.a
                      href="#"
                      onClick={(e) => { e.preventDefault(); router.push('/institutions'); }}
                      whileHover={{ x: -2 }}
                      transition={spring.crisp}
                      className="flex items-center gap-2 text-sm font-semibold text-[#43474f] hover:text-[#001e40] transition-colors px-4 py-2 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                      Cancel Onboarding
                    </motion.a>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring.crisp}
                      className="flex items-center gap-2 text-sm font-semibold text-white bg-[#003366] px-8 py-2 rounded shadow-md hover:opacity-90 transition-all"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  </div>
                </form>
              )}

              {/* ─── STEP 2: Integration ────────────────────────────────────── */}
              {currentStep === 2 && (
                <form onSubmit={handleStep2}>
                  <div className="flex items-center gap-3 mb-12">
                    <ServerCog className="h-5 w-5 text-[#001e40]" />
                    <h2 className="text-2xl font-semibold text-[#001e40]">Integration Channel</h2>
                  </div>
                  <motion.div
                    variants={staggerContainer(0.05)}
                    initial="initial"
                    animate="animate"
                    className="space-y-6"
                  >
                    <motion.div
                      variants={staggerItem}
                      transition={staggerItemTransition}
                      className="flex flex-col gap-2"
                    >
                      <label className="text-sm font-semibold text-[#191c1e]">Integration Channel</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(['REST_API', 'PORTAL_UPLOAD', 'SFTP'] as const).map((channel) => {
                          const icons = { REST_API: '⚡', PORTAL_UPLOAD: '📤', SFTP: '🔒' };
                          const labels = { REST_API: 'REST API', PORTAL_UPLOAD: 'Portal Upload', SFTP: 'SFTP' };
                          const descs = {
                            REST_API: 'Real-time HTTP integration',
                            PORTAL_UPLOAD: 'Manual file uploads via portal',
                            SFTP: 'Automated secure file transfer',
                          };
                          return (
                            <label
                              key={channel}
                              className={`flex flex-col gap-2 p-4 border rounded-lg cursor-pointer transition-all ${
                                step2.watch('integration_channel') === channel
                                  ? 'border-[#001e40] bg-[#f2f4f6] ring-2 ring-[#003366]'
                                  : 'border-[#c3c6d1] hover:border-[#28628f] hover:bg-[#f7f9fb]'
                              }`}
                            >
                              <input
                                {...step2.register('integration_channel')}
                                type="radio"
                                value={channel}
                                className="sr-only"
                              />
                              <span className="text-2xl">{icons[channel]}</span>
                              <span className="text-sm font-semibold text-[#191c1e]">{labels[channel]}</span>
                              <span className="text-xs text-[#737780]">{descs[channel]}</span>
                            </label>
                          );
                        })}
                      </div>
                      {step2.formState.errors.integration_channel && (
                        <p className="text-xs text-red-600">
                          {step2.formState.errors.integration_channel.message}
                        </p>
                      )}
                    </motion.div>
                    <motion.div
                      variants={staggerItem}
                      transition={staggerItemTransition}
                      className="flex flex-col gap-1"
                    >
                      <label className="text-sm font-semibold text-[#191c1e]">
                        Allowed IP Ranges{' '}
                        <span className="text-[#737780] font-normal">(optional, comma-separated)</span>
                      </label>
                      <textarea
                        {...step2.register('allowed_ip_ranges')}
                        rows={3}
                        placeholder="e.g. 192.168.1.1/24, 41.21.192.5"
                        className="w-full bg-white border border-[#737780] rounded px-4 py-2 text-sm font-mono focus:border-[#28628f] transition-all outline-none"
                      />
                    </motion.div>
                  </motion.div>
                  <div className="mt-16 pt-6 border-t border-[#c3c6d1] flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="flex items-center gap-2 text-sm font-semibold text-[#43474f] hover:text-[#001e40] px-4 py-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring.crisp}
                      className="flex items-center gap-2 text-sm font-semibold text-white bg-[#003366] px-8 py-2 rounded shadow-md hover:opacity-90 transition-all"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  </div>
                </form>
              )}

              {/* ─── STEP 3: Products ───────────────────────────────────────── */}
              {currentStep === 3 && (
                <form onSubmit={handleStep3}>
                  <div className="flex items-center gap-3 mb-12">
                    <Package className="h-5 w-5 text-[#001e40]" />
                    <h2 className="text-2xl font-semibold text-[#001e40]">Products &amp; Account Types</h2>
                  </div>
                  <p className="text-sm text-[#43474f] mb-6">
                    Select the account types this institution is permitted to submit data for.
                  </p>
                  <motion.div
                    variants={staggerContainer(0.05)}
                    initial="initial"
                    animate="animate"
                    className="grid grid-cols-2 md:grid-cols-3 gap-3"
                  >
                    {ACCOUNT_TYPES.map(({ code, label }) => {
                      const selected = step3.watch('enabled_products')?.includes(code);
                      return (
                        <motion.div
                          key={code}
                          variants={staggerItem}
                          transition={staggerItemTransition}
                        >
                          <label
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all text-sm ${
                              selected
                                ? 'border-[#001e40] bg-[#f2f4f6] ring-2 ring-[#003366]'
                                : 'border-[#c3c6d1] hover:border-[#28628f] hover:bg-[#f7f9fb]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              value={code}
                              {...step3.register('enabled_products')}
                              className="w-4 h-4 rounded border-[#737780] text-[#001e40] focus:ring-[#003366]"
                            />
                            <span className="text-xs text-[#191c1e]">{label}</span>
                          </label>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                  {step3.formState.errors.enabled_products && (
                    <p className="text-xs text-red-600 mt-3">
                      {step3.formState.errors.enabled_products.message}
                    </p>
                  )}
                  <div className="mt-16 pt-6 border-t border-[#c3c6d1] flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="flex items-center gap-2 text-sm font-semibold text-[#43474f] hover:text-[#001e40] px-4 py-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring.crisp}
                      className="flex items-center gap-2 text-sm font-semibold text-white bg-[#003366] px-8 py-2 rounded shadow-md hover:opacity-90 transition-all"
                    >
                      Review
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  </div>
                </form>
              )}

              {/* ─── STEP 4: Review ─────────────────────────────────────────── */}
              {currentStep === 4 && formData.step1 && formData.step2 && formData.step3 && (
                <div>
                  <div className="flex items-center gap-3 mb-12">
                    <CheckSquare className="h-5 w-5 text-[#001e40]" />
                    <h2 className="text-2xl font-semibold text-[#001e40]">Review &amp; Activate</h2>
                  </div>
                  <p className="text-sm text-[#43474f] mb-8">
                    Please review all information before submitting.
                  </p>

                  {submitError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {submitError}
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Step 1 Review */}
                    <div className="bg-[#f2f4f6] rounded-xl p-6 border border-[#c3c6d1]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-[#001e40] uppercase tracking-wider">
                          Institution Details
                        </h3>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="text-xs text-[#28628f] hover:underline font-medium"
                        >
                          Edit
                        </button>
                      </div>
                      <dl className="grid grid-cols-2 gap-4">
                        <div>
                          <dt className="text-xs text-[#737780] font-semibold uppercase">Name</dt>
                          <dd className="text-sm text-[#191c1e] mt-1">{formData.step1.name}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[#737780] font-semibold uppercase">SRN</dt>
                          <dd className="text-sm text-[#191c1e] font-mono mt-1">
                            {formData.step1.supplier_reference_number}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Step 2 Review */}
                    <div className="bg-[#f2f4f6] rounded-xl p-6 border border-[#c3c6d1]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-[#001e40] uppercase tracking-wider">
                          Integration
                        </h3>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="text-xs text-[#28628f] hover:underline font-medium"
                        >
                          Edit
                        </button>
                      </div>
                      <dl className="grid grid-cols-2 gap-4">
                        <div>
                          <dt className="text-xs text-[#737780] font-semibold uppercase">Channel</dt>
                          <dd className="text-sm text-[#191c1e] mt-1">
                            {formData.step2.integration_channel.replace(/_/g, ' ')}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[#737780] font-semibold uppercase">
                            Allowed IPs
                          </dt>
                          <dd className="text-sm text-[#191c1e] font-mono mt-1">
                            {formData.step2.allowed_ip_ranges || '—'}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Step 3 Review */}
                    <div className="bg-[#f2f4f6] rounded-xl p-6 border border-[#c3c6d1]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-[#001e40] uppercase tracking-wider">
                          Products &amp; Account Types
                        </h3>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(3)}
                          className="text-xs text-[#28628f] hover:underline font-medium"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.step3.enabled_products.map((code) => (
                          <span
                            key={code}
                            className="px-3 py-1 bg-[#cee5ff] text-[#175683] rounded-full text-xs font-bold"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-[#c3c6d1] flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="flex items-center gap-2 text-sm font-semibold text-[#43474f] hover:text-[#001e40] px-4 py-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                    <motion.button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring.crisp}
                      className="flex items-center gap-2 text-sm font-semibold text-white bg-[#003366] px-8 py-3 rounded shadow-md hover:opacity-90 transition-all disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Creating Institution...
                        </>
                      ) : (
                        <>
                          Create Institution
                          <CheckSquare className="h-4 w-4" />
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right: Sidebar Context */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Tips Card */}
            <div className="bg-[#003366] text-[#799dd6] p-6 rounded-xl border border-[#001e40]/20 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                <h4 className="text-sm font-semibold text-white">Onboarding Guidance</h4>
              </div>
              <ul className="flex flex-col gap-2 text-sm opacity-90 list-disc ml-4">
                <li>Ensure the Legal Entity Name matches the Registrar of Companies record exactly.</li>
                <li>SRN will be validated against the Central Bank&apos;s institutional database.</li>
                <li>REST API requires IP whitelisting for production access.</li>
                <li>Products can be updated post-onboarding from the institution profile.</li>
              </ul>
            </div>

            {/* Progress Status Card */}
            <div className="bg-[#e6e8ea] p-6 rounded-xl border border-[#c3c6d1] flex flex-col gap-4">
              <h4 className="text-sm font-bold text-[#001e40]">Onboarding Progress</h4>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Completeness</span>
                  <span>{Math.round(((currentStep - 1) / 4) * 100)}%</span>
                </div>
                <div className="w-full bg-[#e0e3e5] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#001e40] h-full rounded-full transition-all duration-500"
                    style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 text-xs font-medium">
                {STEP_CONFIG.map((step) => (
                  <div key={step.key} className={`flex items-center gap-2 ${currentStep > step.key ? 'text-emerald-700' : currentStep === step.key ? 'text-[#001e40]' : 'text-[#737780]'}`}>
                    {currentStep > step.key ? (
                      <div className="w-3 h-3 rounded-full bg-emerald-600 flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className={`w-3 h-3 rounded-full border ${currentStep === step.key ? 'border-[#001e40] bg-[#001e40]' : 'border-[#737780]'}`} />
                    )}
                    {step.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
