'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, ChevronRight, Clock } from '@/lib/icons';
import api from '@/lib/api';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import {
  spring,
  fadeUp,
  fadeUpTransition,
  staggerContainer,
  staggerItem,
  staggerItemTransition,
  expandTransition,
} from '@/lib/motion';

// ── Types ────────────────────────────────────────────────────────────────────

type SearchType = 'OMANG' | 'PASSPORT' | 'ACCOUNT_NUMBER' | 'CELLULAR' | 'SURNAME_DOB';

interface InquireResponse {
  inquiry_id: string;
  result: 'MATCH' | 'NO_MATCH' | 'MATCH_REVIEW_REQUIRED';
  borrower_id?: string;
}

interface RecentInquiry {
  inquiry_id: string;
  search_type: string;
  masked_value: string;
  result: string;
  created_at: string;
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const baseSchema = z.object({
  search_type: z.enum(['OMANG', 'PASSPORT', 'ACCOUNT_NUMBER', 'CELLULAR', 'SURNAME_DOB']),
  inquiry_reason: z.string().min(1, 'Inquiry reason is required'),
  consent_reference: z.string().min(1, 'Customer consent reference is required'),
  omang: z.string().optional(),
  passport: z.string().optional(),
  account_number: z.string().optional(),
  cellular: z.string().optional(),
  surname: z.string().optional(),
  date_of_birth: z.string().optional(),
});

const searchSchema = baseSchema.superRefine((data, ctx) => {
  switch (data.search_type) {
    case 'OMANG':
      if (!data.omang || !/^\d{9}$/.test(data.omang)) {
        ctx.addIssue({ code: 'custom', path: ['omang'], message: 'Omang must be exactly 9 digits' });
      }
      break;
    case 'PASSPORT':
      if (!data.passport || data.passport.trim().length === 0) {
        ctx.addIssue({ code: 'custom', path: ['passport'], message: 'Passport number is required' });
      }
      break;
    case 'ACCOUNT_NUMBER':
      if (!data.account_number || data.account_number.trim().length === 0) {
        ctx.addIssue({ code: 'custom', path: ['account_number'], message: 'Account number is required' });
      }
      break;
    case 'CELLULAR':
      if (!data.cellular || !/^\d{10}$/.test(data.cellular)) {
        ctx.addIssue({ code: 'custom', path: ['cellular'], message: 'Cellular must be exactly 10 digits' });
      }
      break;
    case 'SURNAME_DOB':
      if (!data.surname || data.surname.trim().length === 0) {
        ctx.addIssue({ code: 'custom', path: ['surname'], message: 'Surname is required' });
      }
      if (!data.date_of_birth) {
        ctx.addIssue({ code: 'custom', path: ['date_of_birth'], message: 'Date of birth is required' });
      }
      break;
  }
});

type SearchForm = z.infer<typeof searchSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

const SEARCH_TYPES: { value: SearchType; label: string }[] = [
  { value: 'OMANG', label: 'Omang (National ID)' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'ACCOUNT_NUMBER', label: 'Account Number' },
  { value: 'CELLULAR', label: 'Cellular Number' },
  { value: 'SURNAME_DOB', label: 'Surname + Date of Birth' },
];

const INQUIRY_REASONS = [
  { value: 'Credit Application', label: 'Credit Application' },
  { value: 'Account Review', label: 'Account Review' },
  { value: 'Debt Collection', label: 'Debt Collection' },
  { value: 'Pre-Employment Screen', label: 'Pre-Employment Screen' },
  { value: 'Regulatory Compliance', label: 'Regulatory Compliance' },
];

// ── Helper: format date as CCYYMMDD ──────────────────────────────────────────

function formatDateToCCYYMMDD(dateStr: string): string {
  // Input expected as YYYY-MM-DD from date input
  return dateStr.replace(/-/g, '');
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BorrowerSearchPage() {
  const router = useRouter();
  const [activeSearchType, setActiveSearchType] = useState<SearchType>('OMANG');
  const [noMatchAlert, setNoMatchAlert] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SearchForm>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      search_type: 'OMANG',
      inquiry_reason: '',
      consent_reference: '',
    },
  });

  // Recent inquiries
  const { data: recentData, isLoading: recentLoading } = useQuery<RecentInquiry[]>({
    queryKey: ['reports-recent'],
    queryFn: async () => {
      try {
        const res = await api.get('/reports/history?limit=5');
        return res.data?.data ?? res.data ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

  const handleSearchTypeChange = (type: SearchType) => {
    setActiveSearchType(type);
    setValue('search_type', type);
    setNoMatchAlert(false);
    setServerError(null);
  };

  const onSubmit = async (data: SearchForm) => {
    setNoMatchAlert(false);
    setServerError(null);

    // Build payload
    const payload: Record<string, string> = {
      search_type: data.search_type,
      inquiry_reason: data.inquiry_reason,
      consent_reference: data.consent_reference,
    };

    switch (data.search_type) {
      case 'OMANG':
        payload.identifier = data.omang!;
        break;
      case 'PASSPORT':
        payload.identifier = data.passport!;
        break;
      case 'ACCOUNT_NUMBER':
        payload.identifier = data.account_number!;
        break;
      case 'CELLULAR':
        payload.identifier = data.cellular!;
        break;
      case 'SURNAME_DOB':
        payload.surname = data.surname!;
        payload.date_of_birth = formatDateToCCYYMMDD(data.date_of_birth!);
        break;
    }

    try {
      const res = await api.post<InquireResponse>('/reports/inquire', payload);
      const { result, inquiry_id } = res.data;

      if (result === 'MATCH') {
        router.push(`/reports/${inquiry_id}`);
      } else if (result === 'NO_MATCH') {
        setNoMatchAlert(true);
      } else if (result === 'MATCH_REVIEW_REQUIRED') {
        router.push('/reports/match-resolution');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(e?.response?.data?.message ?? 'An error occurred while processing the inquiry. Please try again.');
    }
  };

  const maskValue = (value: string) => {
    if (!value || value.length < 4) return value;
    return value.slice(0, 4) + '****';
  };

  return (
    <motion.div
      className="flex flex-col gap-8"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Borrower Credit Search</h1>
          <p className="text-sm text-on-surface-variant">
            Access authoritative credit profiles for Botswana citizens and entities.
          </p>
        </div>
        {/* Security Notice Card */}
        <motion.div
          className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex items-center gap-3 max-w-xs"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...spring.soft, delay: 0.2 }}
        >
          <Shield className="h-5 w-5 text-secondary flex-shrink-0" />
          <p className="text-xs text-on-surface-variant leading-tight">
            Session secured by <span className="font-bold">256-bit encryption</span>. All queries are audited.
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Search Card */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            {/* Search Type Tabs */}
            <div className="flex border-b border-outline-variant overflow-x-auto">
              {SEARCH_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleSearchTypeChange(type.value)}
                  className={[
                    'relative flex-1 min-w-[120px] py-4 px-3 text-xs font-semibold tracking-wide uppercase transition-colors whitespace-nowrap',
                    activeSearchType === type.value
                      ? 'text-primary bg-surface-container-lowest'
                      : 'text-on-surface-variant hover:bg-surface-container',
                  ].join(' ')}
                >
                  {type.label}
                  {activeSearchType === type.value && (
                    <motion.span
                      layoutId="reports-tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              <input type="hidden" {...register('search_type')} />

              {/* Conditional ID Fields */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSearchType}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ ...spring.soft }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {activeSearchType === 'OMANG' && (
                    <div className="sm:col-span-2">
                      <Input
                        label="Omang ID Number"
                        placeholder="e.g. 123456712"
                        maxLength={9}
                        {...register('omang')}
                        error={errors.omang?.message}
                        hint="9-digit national identity number"
                      />
                    </div>
                  )}

                  {activeSearchType === 'PASSPORT' && (
                    <div className="sm:col-span-2">
                      <Input
                        label="Passport Number"
                        placeholder="e.g. B1234567"
                        {...register('passport')}
                        error={errors.passport?.message}
                        hint="Alphanumeric passport document number"
                      />
                    </div>
                  )}

                  {activeSearchType === 'ACCOUNT_NUMBER' && (
                    <div className="sm:col-span-2">
                      <Input
                        label="Account Number"
                        placeholder="Enter account number"
                        {...register('account_number')}
                        error={errors.account_number?.message}
                      />
                    </div>
                  )}

                  {activeSearchType === 'CELLULAR' && (
                    <div className="sm:col-span-2">
                      <Input
                        label="Cellular Number"
                        placeholder="e.g. 0712345678"
                        maxLength={10}
                        {...register('cellular')}
                        error={errors.cellular?.message}
                        hint="10-digit mobile number"
                      />
                    </div>
                  )}

                  {activeSearchType === 'SURNAME_DOB' && (
                    <>
                      <Input
                        label="Surname"
                        placeholder="e.g. Molefe"
                        {...register('surname')}
                        error={errors.surname?.message}
                      />
                      <Input
                        label="Date of Birth"
                        type="date"
                        {...register('date_of_birth')}
                        error={errors.date_of_birth?.message}
                        hint="Will be submitted as CCYYMMDD"
                      />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Inquiry Metadata */}
              <motion.div
                className="bg-surface-container-low p-4 rounded-lg"
                whileHover={{ y: -1, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                transition={spring.crisp}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Inquiry Metadata
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Inquiry Reason"
                    options={INQUIRY_REASONS}
                    placeholder="Select reason..."
                    {...register('inquiry_reason')}
                    error={errors.inquiry_reason?.message}
                  />
                  <Input
                    label="Customer Consent Reference"
                    placeholder="e.g. CONS-2025-XXXX"
                    {...register('consent_reference')}
                    error={errors.consent_reference?.message}
                  />
                </div>
              </motion.div>

              {/* Alerts */}
              <AnimatePresence>
                {noMatchAlert && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}
                    transition={expandTransition}
                  >
                    <Alert variant="warning" title="No Match Found" onClose={() => setNoMatchAlert(false)}>
                      No matching borrower was found for the provided search criteria. Please verify the
                      details and try again.
                    </Alert>
                  </motion.div>
                )}
                {serverError && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}
                    transition={expandTransition}
                  >
                    <Alert variant="error" title="Inquiry Failed" onClose={() => setServerError(null)}>
                      {serverError}
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <div className="flex justify-end pt-2">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={spring.crisp}
                >
                  <Button type="submit" loading={isSubmitting} size="lg">
                    <Search className="h-4 w-4" />
                    {isSubmitting ? 'Processing...' : 'Initiate Search'}
                  </Button>
                </motion.div>
              </div>
            </form>
          </div>
        </div>

        {/* Side Panel */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          {/* Security Notice */}
          <motion.div
            className="bg-primary text-on-primary rounded-xl overflow-hidden relative"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring.soft, delay: 0.2 }}
          >
            <div className="relative p-6 z-10">
              <Shield className="h-10 w-10 mb-3 opacity-90" />
              <h3 className="text-lg font-bold mb-2">Security &amp; Privacy</h3>
              <p className="text-sm opacity-90 leading-relaxed mb-4">
                All credit searches are strictly regulated under the Botswana Financial Intelligence
                Act. Unauthorized access is a criminal offense and is logged with IP and timestamp
                metadata.
              </p>
              <motion.div
                className="flex flex-col gap-2"
                variants={staggerContainer(0.1)}
                initial="initial"
                animate="animate"
              >
                <motion.div
                  className="flex items-center gap-2 bg-white/10 p-3 rounded-lg text-sm font-semibold"
                  variants={staggerItem}
                  transition={staggerItemTransition}
                >
                  <span className="text-xs">&#10003;</span> Verified Consent Required
                </motion.div>
                <motion.div
                  className="flex items-center gap-2 bg-white/10 p-3 rounded-lg text-sm font-semibold"
                  variants={staggerItem}
                  transition={staggerItemTransition}
                >
                  <span className="text-xs">&#10003;</span> Full Audit Trail Active
                </motion.div>
              </motion.div>
            </div>
          </motion.div>

          {/* Recent Searches */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Searches
              </h4>
              <motion.div whileHover={{ x: 2 }} transition={spring.crisp}>
                <Link
                  href="/reports/history"
                  className="text-xs text-secondary hover:underline font-semibold"
                >
                  View All
                </Link>
              </motion.div>
            </div>

            {recentLoading ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : recentData && recentData.length > 0 ? (
              <motion.div
                className="space-y-1"
                variants={staggerContainer(0.05)}
                initial="initial"
                animate="animate"
              >
                {recentData.map((inquiry) => (
                  <motion.div
                    key={inquiry.inquiry_id}
                    variants={staggerItem}
                    whileHover={{ x: 3 }}
                    transition={spring.crisp}
                  >
                    <Link
                      href={`/reports/${inquiry.inquiry_id}`}
                      className="flex items-center justify-between p-3 hover:bg-surface-container rounded-lg transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-semibold text-on-surface">
                          {inquiry.search_type}
                        </p>
                        <p className="text-xs text-on-surface-variant font-mono">
                          {maskValue(inquiry.masked_value)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-on-surface-variant group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-6 opacity-50">
                <Search className="h-8 w-8 mx-auto mb-2 text-on-surface-variant" />
                <p className="text-sm text-on-surface-variant">No recent searches</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Link */}
      <div className="flex items-center justify-center">
        <motion.div whileHover={{ x: 2 }} transition={spring.crisp}>
          <Link
            href="/reports/history"
            className="inline-flex items-center gap-2 text-sm text-secondary hover:underline font-semibold"
          >
            <Clock className="h-4 w-4" />
            View Full Inquiry History
            <ChevronRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
