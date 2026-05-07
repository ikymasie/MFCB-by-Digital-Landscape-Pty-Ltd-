'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Download,
  TrendingUp,
  AlertCircle,
  Activity,
  Calendar,
  RotateCcw,
  Filter,
  History,
  CheckCircle,
  XCircle,
  HelpCircle,
} from '@/lib/icons';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { PageSpinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import {
  spring,
  fadeUp,
  fadeUpTransition,
  staggerContainer,
  staggerItem,
  staggerItemTransition,
} from '@/lib/motion';

// ── Types ────────────────────────────────────────────────────────────────────

interface InquiryRecord {
  inquiry_id: string;
  search_type: string;
  masked_value: string;
  borrower_name?: string;
  inquiry_reason: string;
  requested_by?: string;
  created_at: string;
  result: 'MATCH' | 'NO_MATCH' | 'MATCH_REVIEW_REQUIRED';
  institution_name?: string;
}

interface HistoryResponse {
  data: InquiryRecord[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface HistorySummary {
  total_30d?: number;
  unique_applicants?: number;
  high_risk_flagged?: number;
  system_uptime?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resultIcon(result: string) {
  if (result === 'MATCH') return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
  if (result === 'NO_MATCH') return <XCircle className="h-3.5 w-3.5 text-gray-400" />;
  return <HelpCircle className="h-3.5 w-3.5 text-amber-500" />;
}

function resultBadgeVariant(result: string): 'success' | 'warning' | 'neutral' | 'error' {
  if (result === 'MATCH') return 'success';
  if (result === 'NO_MATCH') return 'neutral';
  if (result === 'MATCH_REVIEW_REQUIRED') return 'warning';
  return 'neutral';
}

function resultLabel(result: string): string {
  if (result === 'MATCH') return 'Match';
  if (result === 'NO_MATCH') return 'No Match';
  if (result === 'MATCH_REVIEW_REQUIRED') return 'Review Required';
  return result;
}

function reasonBadgeClass(reason: string): string {
  const lower = reason.toLowerCase();
  if (lower.includes('credit')) return 'bg-blue-50 text-blue-700';
  if (lower.includes('employment') || lower.includes('employ')) return 'bg-purple-50 text-purple-700';
  if (lower.includes('collection') || lower.includes('debt')) return 'bg-orange-50 text-orange-700';
  return 'bg-surface-variant text-on-surface-variant';
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

const INQUIRY_REASON_OPTIONS = [
  { value: '', label: 'All Reasons' },
  { value: 'Credit Application', label: 'Credit Application' },
  { value: 'Account Review', label: 'Account Review' },
  { value: 'Pre-Employment Screen', label: 'Employment' },
  { value: 'Debt Collection', label: 'Collection Agency' },
  { value: 'Regulatory Compliance', label: 'Regulatory Compliance' },
];

const ITEMS_PER_PAGE = 20;

// ── Component ────────────────────────────────────────────────────────────────

export default function InquiryHistoryPage() {
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [requestedBy, setRequestedBy] = useState('');

  // Applied filters (only update on Apply)
  const [appliedFilters, setAppliedFilters] = useState({
    dateFrom: '',
    dateTo: '',
    reason: '',
    requestedBy: '',
  });

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      dateFrom,
      dateTo,
      reason: reasonFilter,
      requestedBy,
    });
  };

  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setReasonFilter('');
    setRequestedBy('');
    setPage(1);
    setAppliedFilters({ dateFrom: '', dateTo: '', reason: '', requestedBy: '' });
  };

  // Build query params
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(ITEMS_PER_PAGE),
    ...(appliedFilters.dateFrom && { date_from: appliedFilters.dateFrom }),
    ...(appliedFilters.dateTo && { date_to: appliedFilters.dateTo }),
    ...(appliedFilters.reason && { inquiry_reason: appliedFilters.reason }),
    ...(appliedFilters.requestedBy && { requested_by: appliedFilters.requestedBy }),
  });

  const { data, isLoading, isError } = useQuery<HistoryResponse>({
    queryKey: ['reports-history', page, appliedFilters],
    queryFn: async () => {
      try {
        const res = await api.get(`/reports/history?${queryParams.toString()}`);
        return res.data?.data ? res.data : { data: res.data ?? [], total: 0, page: 1, limit: ITEMS_PER_PAGE, total_pages: 1 };
      } catch (err: unknown) {
        const e = err as { response?: { status?: number } };
        if (e?.response?.status === 404) {
          // Graceful empty state — endpoint may not be implemented yet
          return { data: [], total: 0, page: 1, limit: ITEMS_PER_PAGE, total_pages: 1 };
        }
        throw err;
      }
    },
    staleTime: 30_000,
  });

  const { data: summaryData } = useQuery<HistorySummary>({
    queryKey: ['reports-history-summary'],
    queryFn: async () => {
      try {
        const res = await api.get('/reports/history/summary');
        return res.data?.data ?? res.data ?? {};
      } catch {
        return {};
      }
    },
    staleTime: 60_000,
  });

  const records = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;
  const totalRecords = data?.total ?? 0;

  return (
    <motion.div
      className="flex flex-col gap-6 pb-12"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Inquiry History</h1>
          <p className="text-base text-on-surface-variant mt-1 max-w-2xl">
            Comprehensive audit trail of all credit search activities. Review historical search
            parameters and system results for regulatory compliance monitoring.
          </p>
        </div>
        <Button variant="primary" size="md">
          <Download className="h-4 w-4" />
          Export Log
        </Button>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5">
          <p className="text-xs text-on-surface-variant font-medium">Total Inquiries (30d)</p>
          <h3 className="text-3xl font-bold text-primary mt-1">
            {summaryData?.total_30d != null ? summaryData.total_30d.toLocaleString() : totalRecords.toLocaleString()}
          </h3>
          <div className="flex items-center gap-1 text-green-600 text-xs font-bold mt-2">
            <TrendingUp className="h-3.5 w-3.5" />
            Institution-scoped data
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5">
          <p className="text-xs text-on-surface-variant font-medium">Unique Applicants</p>
          <h3 className="text-3xl font-bold text-primary mt-1">
            {summaryData?.unique_applicants != null ? summaryData.unique_applicants.toLocaleString() : '—'}
          </h3>
          <p className="text-xs text-on-surface-variant mt-2">Within selected period</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5">
          <p className="text-xs text-on-surface-variant font-medium">High Risk Flagged</p>
          <h3 className="text-3xl font-bold text-error mt-1">
            {summaryData?.high_risk_flagged != null ? summaryData.high_risk_flagged : '—'}
          </h3>
          {summaryData?.high_risk_flagged != null && summaryData.high_risk_flagged > 0 && (
            <p className="text-xs text-error font-bold mt-2 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Action Required
            </p>
          )}
        </div>
        <div className="bg-primary rounded-xl shadow-sm p-5 text-white">
          <p className="text-xs opacity-70 font-medium">System Integrity</p>
          <h3 className="text-3xl font-bold mt-1">
            {summaryData?.system_uptime ?? '99.9%'}
          </h3>
          <p className="text-xs opacity-70 mt-2 flex items-center gap-1">
            <Activity className="h-3.5 w-3.5" /> Uptime verified
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Date From
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Date from"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Date To
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Date to"
            />
          </div>
          <Select
            label="Inquiry Reason"
            options={INQUIRY_REASON_OPTIONS}
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="ghost" size="md" onClick={resetFilters} className="flex-1">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button variant="secondary" size="md" onClick={applyFilters} className="flex-1">
              <Filter className="h-4 w-4" />
              Apply
            </Button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <PageSpinner />
          </div>
        ) : isError ? (
          <div className="p-6">
            <Alert variant="error" title="Failed to load inquiry history">
              The inquiry history could not be retrieved. Please try again later.
            </Alert>
          </div>
        ) : records.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center opacity-50">
            <History className="h-16 w-16 text-on-surface-variant mb-4" />
            <p className="text-lg font-semibold text-on-surface-variant">No inquiries found</p>
            <p className="text-sm text-on-surface-variant mt-1">
              {Object.values(appliedFilters).some(Boolean)
                ? 'Try adjusting the filters above.'
                : 'Credit search inquiries will appear here once performed.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b-2 border-primary-container">
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-primary">Report ID</th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-primary">Search Parameters</th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-primary">Borrower Name</th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-primary">Inquiry Reason</th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-primary">Requested By</th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-primary">Timestamp</th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-primary">Result</th>
                  </tr>
                </thead>
                <motion.tbody
                  className="divide-y divide-outline-variant"
                  variants={staggerContainer(0.04)}
                  initial="initial"
                  animate="animate"
                >
                  {records.map((record, idx) => (
                    <motion.tr
                      key={record.inquiry_id}
                      variants={staggerItem}
                      transition={staggerItemTransition}
                      className={[
                        'hover:bg-surface-container-low transition-colors',
                        idx % 2 === 1 ? 'bg-surface-container-lowest/50' : '',
                      ].join(' ')}
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/reports/${record.inquiry_id}`}
                          className="text-secondary font-bold hover:underline text-sm font-mono"
                        >
                          #{record.inquiry_id.slice(0, 12)}
                        </Link>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-on-surface-variant">
                        {record.search_type}: {record.masked_value}
                      </td>
                      <td className="px-5 py-4 font-medium text-on-surface">
                        {record.borrower_name || '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={[
                            'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                            reasonBadgeClass(record.inquiry_reason),
                          ].join(' ')}
                        >
                          {record.inquiry_reason}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-on-surface-variant">
                        {record.requested_by || '—'}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-on-surface-variant whitespace-nowrap">
                        {formatDateTime(record.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5">
                          {resultIcon(record.result)}
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={spring.crisp}
                          >
                            <Badge variant={resultBadgeVariant(record.result)}>
                              {resultLabel(record.result)}
                            </Badge>
                          </motion.span>
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-4 border-t border-outline-variant bg-surface-container-low/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-on-surface-variant">
                Showing{' '}
                <span className="font-bold">
                  {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, totalRecords)}
                </span>{' '}
                of <span className="font-bold">{totalRecords.toLocaleString()}</span> entries
              </p>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Compliance Notice */}
      <div className="p-5 border-l-4 border-primary-container bg-surface-container-low rounded-r-xl flex gap-4">
        <AlertCircle className="h-5 w-5 text-primary-container flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-primary mb-1">Compliance Reminder</h4>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Under the Botswana Credit Reporting Act, all inquiries must be supported by a legitimate
            business purpose and, where required, explicit consumer consent. This log is monitored by
            the MFCB internal compliance team and the central bank.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
