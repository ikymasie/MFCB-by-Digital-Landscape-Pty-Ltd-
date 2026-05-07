'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import {
  spring,
  fadeUp,
  fadeUpTransition,
  staggerContainer,
  staggerItem,
  staggerItemTransition,
  expandHeight,
  expandTransition,
} from '@/lib/motion';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Institution {
  id: string;
  name: string;
  srn: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface Batch {
  id: string;
  institution_id: string;
  institution_name?: string;
  reporting_month: string;
  sequence_number: number;
  status: string;
  total_records: number;
  accepted_records: number;
  rejected_records: number;
  created_at: string;
}

type SubmissionStatus = 'ON_TIME' | 'OVERDUE' | 'NOT_SUBMITTED' | 'ALL';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentReportingMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function deriveSubmissionStatus(
  institutionId: string,
  batches: Batch[]
): 'ON_TIME' | 'OVERDUE' | 'NOT_SUBMITTED' {
  const currentMonth = getCurrentReportingMonth();
  const monthBatches = batches.filter(
    (b) =>
      b.institution_id === institutionId &&
      b.reporting_month === currentMonth
  );
  if (monthBatches.length === 0) return 'NOT_SUBMITTED';
  const hasLive = monthBatches.some((b) => b.status?.toUpperCase() === 'LIVE');
  if (hasLive) return 'ON_TIME';
  const hasPending = monthBatches.some((b) =>
    ['PENDING', 'PROCESSING', 'IN_PROGRESS', 'SUBMITTED'].includes(
      b.status?.toUpperCase()
    )
  );
  return hasPending ? 'ON_TIME' : 'OVERDUE';
}

function calcAcceptanceRate(institutionId: string, batches: Batch[]): string {
  const instBatches = batches.filter(
    (b) => b.institution_id === institutionId && b.total_records > 0
  );
  if (instBatches.length === 0) return '—';
  const totalRecords = instBatches.reduce(
    (s, b) => s + (b.total_records ?? 0),
    0
  );
  const totalAccepted = instBatches.reduce(
    (s, b) => s + (b.accepted_records ?? 0),
    0
  );
  return totalRecords > 0
    ? `${((totalAccepted / totalRecords) * 100).toFixed(1)}%`
    : '—';
}

function lastSubmissionDate(
  institutionId: string,
  batches: Batch[]
): string | null {
  const instBatches = batches
    .filter((b) => b.institution_id === institutionId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  return instBatches[0]?.created_at ?? null;
}

function submissionStatusBadge(
  status: 'ON_TIME' | 'OVERDUE' | 'NOT_SUBMITTED'
): { variant: 'success' | 'error' | 'neutral'; label: string } {
  switch (status) {
    case 'ON_TIME':
      return { variant: 'success', label: 'On Time' };
    case 'OVERDUE':
      return { variant: 'error', label: 'Overdue' };
    case 'NOT_SUBMITTED':
      return { variant: 'neutral', label: 'Not Submitted' };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComplianceMonitorPage() {
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch institutions
  const {
    data: institutionsData,
    isLoading: institutionsLoading,
    isError: institutionsError,
  } = useQuery({
    queryKey: ['institutions-compliance'],
    queryFn: async () => {
      const res = await api.get<{ data: Institution[]; total: number }>(
        '/institutions?status=ACTIVE'
      );
      return res.data;
    },
  });

  // Fetch recent batches for compliance calculations
  const { data: batchesData } = useQuery({
    queryKey: ['batches-compliance'],
    queryFn: async () => {
      const res = await api.get<{ data: Batch[]; total: number }>(
        '/batches?limit=100'
      );
      return res.data;
    },
  });

  const institutions: Institution[] = institutionsData?.data ?? [];
  const batches: Batch[] = batchesData?.data ?? [];

  // Build enriched rows
  const rows = useMemo(
    () =>
      institutions.map((inst) => {
        const submStatus = deriveSubmissionStatus(inst.id, batches);
        const acceptRate = calcAcceptanceRate(inst.id, batches);
        const lastDate = lastSubmissionDate(inst.id, batches);
        return { inst, submStatus, acceptRate, lastDate };
      }),
    [institutions, batches]
  );

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === 'ALL' || row.submStatus === statusFilter;
      const matchesSearch =
        searchQuery.trim() === '' ||
        row.inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.inst.srn?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [rows, statusFilter, searchQuery]);

  // Summary counts
  const summaryCounts = useMemo(() => {
    const onTime = rows.filter((r) => r.submStatus === 'ON_TIME').length;
    const overdue = rows.filter((r) => r.submStatus === 'OVERDUE').length;
    const notSubmitted = rows.filter(
      (r) => r.submStatus === 'NOT_SUBMITTED'
    ).length;
    const complianceRate =
      rows.length > 0
        ? ((onTime / rows.length) * 100).toFixed(1)
        : '—';
    return { onTime, overdue, notSubmitted, complianceRate };
  }, [rows]);

  const isLoading = institutionsLoading;
  const isError = institutionsError;

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
      className="p-6 space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex text-[10px] uppercase tracking-widest text-gray-400 mb-1 gap-2">
            <Link href="/quality" className="hover:text-secondary transition-colors">
              Data Quality
            </Link>
            <span>/</span>
            <span className="text-secondary font-bold">Compliance Monitor</span>
          </nav>
          <h1 className="text-2xl font-bold text-primary">Submission Compliance Monitor</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Monitor institutional reporting health and data submission consistency across the financial network.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => alert('Export functionality coming soon.')}
          className="inline-flex items-center justify-center px-4 py-2 bg-primary-container text-white text-sm font-semibold rounded-lg shadow-sm"
        >
          Export Report
        </motion.button>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-1 border-b border-outline-variant">
        <Link
          href="/quality"
          className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-t-lg transition-colors"
        >
          Quality Dashboard
        </Link>
        <span className="px-4 py-2 text-sm font-semibold text-primary border-b-2 border-primary">
          Compliance
        </span>
        <Link
          href="/quality/resubmissions"
          className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-t-lg transition-colors"
        >
          Resubmissions
        </Link>
        <Link
          href="/quality/corrections"
          className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-t-lg transition-colors"
        >
          Corrections
        </Link>
      </div>

      {/* Loading / Error */}
      {isLoading && <PageSpinner />}
      <AnimatePresence>
        {isError && (
          <motion.div
            variants={expandHeight}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={expandTransition}
            className="overflow-hidden"
          >
            <Alert variant="error">
              Failed to load institutions. Please try again.
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {!isLoading && !isError && (
        <>
          {/* KPI Summary Cards */}
          <motion.div
            variants={staggerContainer(0.06)}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <motion.div
              variants={staggerItem}
              transition={staggerItemTransition}
              className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Overall Compliance Rate
                </p>
                <h2 className="text-3xl font-bold text-primary mt-2">
                  {summaryCounts.complianceRate}%
                </h2>
              </div>
              <div className="flex items-center gap-1 text-xs text-green-600 font-semibold mt-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>{summaryCounts.onTime} of {rows.length} institutions compliant</span>
              </div>
            </motion.div>

            <motion.div
              variants={staggerItem}
              transition={staggerItemTransition}
              className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Currently Overdue
                </p>
                <h2 className="text-3xl font-bold text-red-600 mt-2">
                  {summaryCounts.overdue}{' '}
                  <span className="text-lg font-normal text-on-surface-variant">Institutions</span>
                </h2>
              </div>
              <div className="flex items-center gap-1 text-xs text-red-600 font-semibold mt-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>Requires manual intervention</span>
              </div>
            </motion.div>

            <motion.div
              variants={staggerItem}
              transition={staggerItemTransition}
              className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Not Yet Submitted
                </p>
                <h2 className="text-3xl font-bold text-primary mt-2">
                  {summaryCounts.notSubmitted}{' '}
                  <span className="text-lg font-normal text-on-surface-variant">Institutions</span>
                </h2>
              </div>
              <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Current reporting month</span>
              </div>
            </motion.div>

            <motion.div
              variants={staggerItem}
              transition={staggerItemTransition}
              className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Active Institutions
                </p>
                <h2 className="text-3xl font-bold text-primary mt-2">{institutions.length}</h2>
              </div>
              <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Registered and active</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search institution or SRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary w-72"
              />
            </div>

            {/* Status filter buttons */}
            <div className="flex rounded-lg border border-outline-variant overflow-hidden text-xs font-semibold relative">
              {(
                [
                  { key: 'ALL', label: 'All' },
                  { key: 'ON_TIME', label: 'On Time' },
                  { key: 'OVERDUE', label: 'Overdue' },
                  { key: 'NOT_SUBMITTED', label: 'Not Submitted' },
                ] as { key: SubmissionStatus; label: string }[]
              ).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`relative px-3 py-2 transition-colors ${
                    statusFilter === f.key
                      ? 'text-white'
                      : 'bg-white text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  {statusFilter === f.key && (
                    <motion.span
                      layoutId="compliance-filter-pill"
                      className="absolute inset-0 bg-primary-container"
                      style={{ zIndex: 0 }}
                      transition={spring.crisp}
                    />
                  )}
                  <span className="relative z-10">{f.label}</span>
                </button>
              ))}
            </div>

            <span className="text-xs text-on-surface-variant ml-auto">
              Showing {filteredRows.length} of {rows.length} institutions
            </span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-low border-b-2 border-primary-container text-[10px] uppercase tracking-widest font-bold text-primary">
                  <tr>
                    <th className="px-6 py-4">Institution Name</th>
                    <th className="px-6 py-4">SRN</th>
                    <th className="px-6 py-4">Last Submission</th>
                    <th className="px-6 py-4 text-center">Submission Status</th>
                    <th className="px-6 py-4 text-right">Acceptance Rate</th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={staggerContainer(0.06)}
                  initial="initial"
                  animate="animate"
                >
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-16 text-center text-on-surface-variant"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-10 h-10 text-outline-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                          </svg>
                          <p className="font-medium">No institutions found</p>
                          <p className="text-xs">Try adjusting your filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map(({ inst, submStatus, acceptRate, lastDate }) => {
                      const badge = submissionStatusBadge(submStatus);
                      return (
                        <motion.tr
                          key={inst.id}
                          variants={staggerItem}
                          className="hover:bg-blue-50/30 transition-colors border-b border-outline-variant/50 even:bg-slate-50"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold text-[10px] text-primary shrink-0">
                                {inst.name.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-semibold">{inst.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">
                            {inst.srn ?? '—'}
                          </td>
                          <td className="px-6 py-4 text-xs text-on-surface-variant">
                            {lastDate
                              ? new Date(lastDate).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <AnimatePresence mode="wait">
                              <motion.span
                                key={badge.label}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={spring.crisp}
                                className="inline-block"
                              >
                                <Badge variant={badge.variant}>{badge.label}</Badge>
                              </motion.span>
                            </AnimatePresence>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold">
                            <span
                              className={
                                acceptRate === '—'
                                  ? 'text-on-surface-variant'
                                  : parseFloat(acceptRate) >= 98
                                  ? 'text-green-600'
                                  : parseFloat(acceptRate) >= 90
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                              }
                            >
                              {acceptRate}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </motion.tbody>
              </table>
            </div>
            <div className="p-4 bg-surface-container-low border-t border-outline-variant flex justify-between items-center">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase">
                Showing {filteredRows.length} of {rows.length} institutions &mdash; Current reporting month: {getCurrentReportingMonth()}
              </span>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
