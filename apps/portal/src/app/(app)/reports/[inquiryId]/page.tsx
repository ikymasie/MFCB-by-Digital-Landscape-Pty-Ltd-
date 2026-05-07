'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  FileText,
  User,
  CreditCard,
  History,
  AlertTriangle,
  Search,
} from '@/lib/icons';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { AnimatedBar } from '@/components/motion/AnimatedBar';
import {
  spring,
  fadeUp,
  fadeUpTransition,
  staggerContainer,
  staggerItem,
  staggerItemTransition,
} from '@/lib/motion';

// ── Types ────────────────────────────────────────────────────────────────────
// NOTE: income field is NEVER typed or rendered — regulatory requirement.

interface BorrowerSummary {
  full_name: string;
  omang?: string;
  passport?: string;
  gender?: string;
  date_of_birth?: string;
  nationality?: string;
  address?: string;
}

interface CreditAccount {
  id: string;
  account_number: string;
  type: string;
  status: string;
  institution_name?: string;
  opened_date?: string;
  credit_limit?: number;
  current_balance?: number;
  monthly_instalment?: number;
  months_in_arrears?: number;
  last_payment_date?: string;
  repayment_history?: (number | null)[]; // array of 36 monthly values (0-9 or null)
}

interface StatusEvent {
  id: string;
  event_date: string;
  event_type: string;
  description: string;
  account_number?: string;
}

interface RecentInquiry {
  institution_name: string;
  purpose?: string;
  inquiry_date: string;
}

interface ReportData {
  inquiry_id: string;
  institution_name: string;
  created_at: string;
  result: string;
  borrower: BorrowerSummary;
  accounts: CreditAccount[];
  status_events: StatusEvent[];
  recent_inquiries?: RecentInquiry[];
  summary?: {
    total_active_accounts: number;
    total_exposure: number;
    monthly_instalment: number;
    adverse_accounts: number;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount?: number): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function resultBadgeVariant(result: string): 'success' | 'warning' | 'neutral' | 'error' {
  if (result === 'MATCH') return 'success';
  if (result === 'NO_MATCH') return 'neutral';
  if (result === 'MATCH_REVIEW_REQUIRED') return 'warning';
  return 'neutral';
}

function arrearsStatusColor(months: number | null): string {
  if (months === null) return 'bg-surface-variant text-on-surface-variant';
  if (months === 0) return 'bg-green-100 text-green-800';
  if (months <= 2) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

function arrearsLabel(months: number | null): string {
  if (months === null) return '—';
  if (months === 0) return 'Current';
  return `${months} month${months > 1 ? 's' : ''}`;
}

function repaymentColor(val: number | null): string {
  if (val === null) return 'bg-surface-variant text-on-surface-variant';
  if (val === 0) return 'bg-green-500 text-white';
  if (val <= 2) return 'bg-amber-500 text-white';
  return 'bg-red-600 text-white';
}

function repaymentLabel(val: number | null): string {
  if (val === null) return 'X';
  return String(val);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CreditReportPage() {
  const params = useParams<{ inquiryId: string }>();
  const router = useRouter();
  const { hasPermission } = useAuthStore();
  const canDownloadPdf = hasPermission('reports:pdf');

  const { data, isLoading, isError, error } = useQuery<ReportData>({
    queryKey: ['report', params.inquiryId],
    queryFn: async () => {
      const res = await api.get(`/reports/${params.inquiryId}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!params.inquiryId,
    retry: 1,
  });

  const handleDownloadPdf = () => {
    // Permission-gated: show informational toast / alert
    alert('PDF generation coming soon.');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <PageSpinner />
        <p className="mt-4 text-sm text-on-surface-variant">Loading credit report...</p>
      </div>
    );
  }

  if (isError || !data) {
    const errMsg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    return (
      <div className="max-w-xl mx-auto mt-12">
        <Alert variant="error" title="Failed to load report">
          {errMsg ?? 'The credit report could not be retrieved. The inquiry may not exist or you may not have access.'}
        </Alert>
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  const { borrower, accounts, status_events, summary, recent_inquiries } = data;

  return (
    <motion.div
      className="flex flex-col gap-6 pb-12"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      {/* Back Navigation */}
      <div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-sm text-secondary hover:underline font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          New Search
        </Link>
      </div>

      {/* ── Section 1: Report Header ──────────────────────────────────────── */}
      <motion.section
        className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4"
        whileHover={{ y: -2 }}
        transition={spring.crisp}
      >
        <motion.div
          variants={staggerContainer(0.08)}
          initial="initial"
          animate="animate"
        >
          <motion.p
            className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1"
            variants={staggerItem}
            transition={staggerItemTransition}
          >
            Official Credit Report
          </motion.p>
          <motion.h1
            className="text-3xl font-bold text-primary mb-2"
            variants={staggerItem}
            transition={staggerItemTransition}
          >
            {borrower.full_name || 'Unknown Borrower'}
          </motion.h1>
          <motion.p
            className="text-sm text-on-surface-variant"
            variants={staggerItem}
            transition={staggerItemTransition}
          >
            Reference: <span className="font-bold font-mono">{data.inquiry_id}</span>
          </motion.p>
          <motion.p
            className="text-sm text-on-surface-variant mt-0.5"
            variants={staggerItem}
            transition={staggerItemTransition}
          >
            Institution: <span className="font-semibold">{data.institution_name}</span>
          </motion.p>
        </motion.div>
        <div className="text-left sm:text-right flex flex-col gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Report Generated
            </p>
            <p className="text-lg font-semibold text-on-surface">{formatDate(data.created_at)}</p>
          </div>
          <Badge variant={resultBadgeVariant(data.result)}>
            {data.result.replace(/_/g, ' ')}
          </Badge>
          {canDownloadPdf && (
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.crisp}
            >
              <Button variant="secondary" size="sm" onClick={handleDownloadPdf}>
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </motion.div>
          )}
        </div>
      </motion.section>

      {/* ── Summary Metric Cards ──────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            className="bg-primary-container text-on-primary p-5 rounded-xl shadow-sm border border-primary relative overflow-hidden"
            whileHover={{ y: -2 }}
            transition={spring.crisp}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-on-primary-container mb-1">
              Active Accounts
            </p>
            <p className="text-4xl font-bold">
              <AnimatedNumber value={summary.total_active_accounts} />
            </p>
          </motion.div>
          <motion.div
            className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm"
            whileHover={{ y: -2 }}
            transition={spring.crisp}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Total Exposure (BWP)
            </p>
            <p className="text-xl font-bold text-on-surface">{formatCurrency(summary.total_exposure)}</p>
          </motion.div>
          <motion.div
            className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm"
            whileHover={{ y: -2 }}
            transition={spring.crisp}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Monthly Instalment (BWP)
            </p>
            <p className="text-xl font-bold text-on-surface">{formatCurrency(summary.monthly_instalment)}</p>
          </motion.div>
          <motion.div
            className="bg-red-50 border border-red-100 p-5 rounded-xl shadow-sm"
            whileHover={{ y: -2 }}
            transition={spring.crisp}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-1">
              Adverse Accounts
            </p>
            <p className="text-4xl font-bold text-red-700">
              <AnimatedNumber value={summary.adverse_accounts} />
            </p>
          </motion.div>
        </div>
      )}

      {/* ── Section 2: Borrower Summary ──────────────────────────────────── */}
      {/* NOTE: income is NEVER displayed — regulatory requirement */}
      <motion.section
        className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6"
        whileHover={{ y: -2 }}
        transition={spring.crisp}
      >
        <h2 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary-container" />
          Identity Details
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-3 bg-surface-container-low rounded-lg">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Full Name</p>
            <p className="text-sm font-medium text-on-surface">{borrower.full_name || '—'}</p>
          </div>
          {borrower.omang && (
            <div className="p-3 bg-surface-container-low rounded-lg">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Omang Number</p>
              <p className="text-sm font-mono text-on-surface">{borrower.omang}</p>
            </div>
          )}
          {borrower.passport && (
            <div className="p-3 bg-surface-container-low rounded-lg">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Passport</p>
              <p className="text-sm font-mono text-on-surface">{borrower.passport}</p>
            </div>
          )}
          {borrower.gender && (
            <div className="p-3 bg-surface-container-low rounded-lg">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Gender</p>
              <p className="text-sm text-on-surface capitalize">{borrower.gender}</p>
            </div>
          )}
          {borrower.date_of_birth && (
            <div className="p-3 bg-surface-container-low rounded-lg">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Date of Birth</p>
              <p className="text-sm text-on-surface">{formatDate(borrower.date_of_birth)}</p>
            </div>
          )}
          {borrower.nationality && (
            <div className="p-3 bg-surface-container-low rounded-lg">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Nationality</p>
              <p className="text-sm text-on-surface">{borrower.nationality}</p>
            </div>
          )}
          {borrower.address && (
            <div className="p-3 bg-surface-container-low rounded-lg col-span-2 md:col-span-3">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Address</p>
              <p className="text-sm text-on-surface">{borrower.address}</p>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Section 3: Credit Accounts Table ─────────────────────────────── */}
      <motion.section
        className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden"
        whileHover={{ y: -2 }}
        transition={spring.crisp}
      >
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary-container" />
            Credit Accounts
          </h2>
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            {accounts?.length ?? 0} Records
          </span>
        </div>

        {!accounts || accounts.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant opacity-50">
            <FileText className="h-12 w-12 mx-auto mb-3" />
            <p className="text-sm font-medium">No credit accounts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-primary-container text-on-primary text-xs font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">Institution</th>
                  <th className="px-5 py-3">Account #</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Opened</th>
                  <th className="px-5 py-3 text-right">Balance (BWP)</th>
                  <th className="px-5 py-3">Months Arrears</th>
                  <th className="px-5 py-3">Last Payment</th>
                </tr>
              </thead>
              <motion.tbody
                className="divide-y divide-outline-variant"
                variants={staggerContainer(0.03)}
                initial="initial"
                animate="animate"
              >
                {accounts.map((account, idx) => (
                  <motion.tr
                    key={account.id || idx}
                    variants={staggerItem}
                    transition={staggerItemTransition}
                    className="hover:bg-surface-container-low transition-colors"
                  >
                    <td className="px-5 py-4 font-medium text-on-surface">
                      {account.institution_name || '—'}
                    </td>
                    <td className="px-5 py-4 font-mono text-on-surface-variant">
                      {account.account_number || '—'}
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">{account.type || '—'}</td>
                    <td className="px-5 py-4">
                      <span
                        className={[
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase',
                          account.status === 'CURRENT'
                            ? 'bg-green-100 text-green-800'
                            : account.status === 'CLOSED'
                            ? 'bg-gray-100 text-gray-600'
                            : account.status === 'DEFAULT'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800',
                        ].join(' ')}
                      >
                        {account.status || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">
                      {formatDate(account.opened_date)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-on-surface">
                      {formatCurrency(account.current_balance)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={[
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold',
                          arrearsStatusColor(account.months_in_arrears ?? null),
                        ].join(' ')}
                      >
                        {arrearsLabel(account.months_in_arrears ?? null)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">
                      {formatDate(account.last_payment_date)}
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </motion.section>

      {/* ── Section 4: Repayment History (36-month grid) ─────────────────── */}
      {accounts && accounts.some((a) => a.repayment_history && a.repayment_history.length > 0) && (
        <motion.section
          className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6"
          whileHover={{ y: -2 }}
          transition={spring.crisp}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
            <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
              <History className="h-5 w-5 text-primary-container" />
              36-Month Repayment History
            </h2>
            <div className="flex flex-wrap gap-3 text-xs font-bold text-on-surface-variant uppercase">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> 0: Current
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> 1-2: Overdue
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> 3+: Default
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-surface-variant border border-outline-variant inline-block" /> X: No Data
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {accounts
              .filter((a) => a.repayment_history && a.repayment_history.length > 0)
              .map((account, idx) => (
                <div key={account.id || idx} className="flex items-center gap-4">
                  <div className="w-44 shrink-0">
                    <p className="text-xs font-semibold text-on-surface truncate">
                      {account.institution_name} ({account.account_number})
                    </p>
                  </div>
                  <div className="flex-1 overflow-x-auto pb-1">
                    <div className="flex gap-1 min-w-max">
                      {(account.repayment_history ?? []).slice(0, 36).map((val, i) => (
                        <div
                          key={i}
                          title={`Month ${i + 1}: ${val === null ? 'No Data' : val === 0 ? 'Current' : `${val} month(s) overdue`}`}
                          className={[
                            'w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold shrink-0',
                            repaymentColor(val),
                          ].join(' ')}
                        >
                          {repaymentLabel(val)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </motion.section>
      )}

      {/* ── Section 5: Status Events ──────────────────────────────────────── */}
      {status_events && status_events.length > 0 && (
        <motion.section
          className="bg-surface-container-lowest border border-red-100 rounded-xl shadow-sm p-6"
          whileHover={{ y: -2 }}
          transition={spring.crisp}
        >
          <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Status Events
          </h2>
          <div className="space-y-3">
            {status_events.map((event, idx) => (
              <div
                key={event.id || idx}
                className="p-4 bg-red-50/50 rounded-lg border border-red-100"
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                    {event.event_type}
                  </span>
                  <span className="text-xs font-mono text-on-surface-variant">
                    {formatDate(event.event_date)}
                  </span>
                </div>
                <p className="text-sm text-on-surface">{event.description}</p>
                {event.account_number && (
                  <p className="text-xs text-on-surface-variant mt-1 font-mono">
                    Account: {event.account_number}
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Recent Inquiries (from other institutions) ───────────────────── */}
      {recent_inquiries && recent_inquiries.length > 0 && (
        <motion.section
          className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6"
          whileHover={{ y: -2 }}
          transition={spring.crisp}
        >
          <h2 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-primary-container" />
            Recent Inquiries by Other Institutions
          </h2>
          <div className="space-y-2">
            {recent_inquiries.map((inq, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-3 border-b border-outline-variant/50 last:border-0"
              >
                <div>
                  <p className="text-sm font-semibold text-on-surface">{inq.institution_name}</p>
                  {inq.purpose && (
                    <p className="text-xs text-on-surface-variant uppercase tracking-wider">
                      {inq.purpose}
                    </p>
                  )}
                </div>
                <p className="text-xs font-mono text-on-surface-variant">{formatDate(inq.inquiry_date)}</p>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Legal Disclaimer */}
      <footer className="pt-4 border-t border-outline-variant text-center">
        <p className="text-xs text-on-surface-variant max-w-2xl mx-auto italic leading-relaxed">
          This report is confidential and intended solely for the use of the individual or entity to
          whom it is addressed. The Botswana Credit Bureau (MFCB) does not guarantee the 100%
          accuracy of data supplied by member institutions. Information is provided &apos;as is&apos; at the
          time of inquiry.
        </p>
        <p className="text-xs font-bold text-primary-container mt-2 tracking-widest uppercase">
          Institutional Integrity. Financial Precision.
        </p>
      </footer>
    </motion.div>
  );
}
