'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
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
} from '@/lib/motion';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  error_codes?: string[];
  created_at: string;
  processed_at?: string;
}

interface ResubmissionRow {
  id: string;
  institutionId: string;
  institutionName: string;
  reportingMonth: string;
  sequenceNumber: number;
  totalRecords: number;
  acceptedRecords: number;
  rejectedRecords: number;
  status: string;
  createdAt: string;
  // improvement relative to sequence 1 of the same institution + month
  baselineRejected: number | null;
  improvementPct: number | null;
}

type FilterTab = 'ALL' | 'FAILED' | 'SUCCESS';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getImprovementBadge(pct: number | null): {
  label: string;
  className: string;
} {
  if (pct === null) return { label: '0% (BASELINE)', className: 'bg-red-100 text-red-800' };
  if (pct >= 80) return { label: `${pct}% IMPROVEMENT`, className: 'bg-green-100 text-green-800' };
  if (pct >= 30) return { label: `${pct}% IMPROVEMENT`, className: 'bg-blue-100 text-blue-800' };
  return { label: `${pct}% IMPROVEMENT`, className: 'bg-yellow-100 text-yellow-800' };
}

function statusBadgeVariant(
  status: string
): 'success' | 'error' | 'pending' | 'warning' | 'neutral' {
  const s = status?.toUpperCase();
  if (['LIVE', 'ACCEPTED', 'COMPLETED'].includes(s)) return 'success';
  if (['REJECTED', 'FAILED'].includes(s)) return 'error';
  if (['PENDING', 'PROCESSING', 'IN_PROGRESS', 'SUBMITTED'].includes(s)) return 'pending';
  if (['PARTIAL'].includes(s)) return 'warning';
  return 'neutral';
}

// Sparkline SVG — simple path showing rejection trend (from high to low ideally)
function Sparkline({ value }: { value: number }) {
  // value 0-100: higher means more improvement (line goes down = fewer errors)
  const y = Math.max(2, 28 - (value / 100) * 26);
  return (
    <svg
      viewBox="0 0 100 30"
      className="w-20 h-8 mx-auto"
      style={{ stroke: '#003366', strokeWidth: 2, fill: 'none' }}
    >
      <path d={`M0,${28 - (value / 100) * 26} Q50,15 100,${y}`} />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ResubmissionsPage() {
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [institutionFilter, setInstitutionFilter] = useState<string>('ALL');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');

  const { data: batchesData, isLoading, isError } = useQuery({
    queryKey: ['batches-resubmissions'],
    queryFn: async () => {
      const res = await api.get<{ data: Batch[]; total: number }>(
        '/batches?limit=50'
      );
      return res.data;
    },
  });

  const allBatches: Batch[] = batchesData?.data ?? [];

  // Resubmissions: sequence_number > 1
  const resubmitBatches = useMemo(
    () => allBatches.filter((b) => (b.sequence_number ?? 1) > 1),
    [allBatches]
  );

  // Build baseline map: institution_id + reporting_month → seq 1 batch
  const baselineMap = useMemo(() => {
    const map: Record<string, Batch> = {};
    allBatches.forEach((b) => {
      if ((b.sequence_number ?? 1) === 1) {
        const key = `${b.institution_id}|${b.reporting_month}`;
        // keep earliest sequence 1
        if (!map[key]) map[key] = b;
      }
    });
    return map;
  }, [allBatches]);

  // Build enriched rows
  const rows: ResubmissionRow[] = useMemo(
    () =>
      resubmitBatches.map((b) => {
        const key = `${b.institution_id}|${b.reporting_month}`;
        const baseline = baselineMap[key];
        const baselineRejected = baseline?.rejected_records ?? null;
        let improvementPct: number | null = null;
        if (baselineRejected !== null && baselineRejected > 0) {
          const improvement =
            ((baselineRejected - (b.rejected_records ?? 0)) / baselineRejected) *
            100;
          improvementPct = Math.max(0, Math.round(improvement));
        }
        return {
          id: b.id,
          institutionId: b.institution_id,
          institutionName: b.institution_name ?? b.institution_id,
          reportingMonth: b.reporting_month,
          sequenceNumber: b.sequence_number,
          totalRecords: b.total_records,
          acceptedRecords: b.accepted_records,
          rejectedRecords: b.rejected_records,
          status: b.status,
          createdAt: b.created_at,
          baselineRejected,
          improvementPct,
        };
      }),
    [resubmitBatches, baselineMap]
  );

  // Unique institutions & months for filters
  const institutionOptions = useMemo(() => {
    const names = new Set(rows.map((r) => r.institutionName));
    return ['ALL', ...Array.from(names)];
  }, [rows]);

  const monthOptions = useMemo(() => {
    const months = new Set(rows.map((r) => r.reportingMonth));
    return ['ALL', ...Array.from(months).sort().reverse()];
  }, [rows]);

  // Apply filters
  const filteredRows = useMemo(() => {
    return rows
      .filter((r) => {
        const tabMatch =
          filterTab === 'ALL' ||
          (filterTab === 'FAILED' &&
            ['REJECTED', 'FAILED'].includes(r.status?.toUpperCase())) ||
          (filterTab === 'SUCCESS' &&
            ['LIVE', 'ACCEPTED', 'COMPLETED'].includes(r.status?.toUpperCase()));
        const instMatch =
          institutionFilter === 'ALL' ||
          r.institutionName === institutionFilter;
        const monthMatch =
          monthFilter === 'ALL' || r.reportingMonth === monthFilter;
        return tabMatch && instMatch && monthMatch;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [rows, filterTab, institutionFilter, monthFilter]);

  // Summary metrics
  const metrics = useMemo(() => {
    const avgAttempts =
      rows.length > 0
        ? (
            rows.reduce((s, r) => s + r.sequenceNumber, 0) / rows.length
          ).toFixed(1)
        : '—';
    const totalCorrected = rows.reduce(
      (s, r) =>
        s +
        (r.baselineRejected !== null
          ? Math.max(0, r.baselineRejected - r.rejectedRecords)
          : 0),
      0
    );
    const avgImprovement =
      rows.filter((r) => r.improvementPct !== null).length > 0
        ? Math.round(
            rows
              .filter((r) => r.improvementPct !== null)
              .reduce((s, r) => s + (r.improvementPct ?? 0), 0) /
              rows.filter((r) => r.improvementPct !== null).length
          )
        : null;
    return { avgAttempts, totalCorrected, avgImprovement };
  }, [rows]);

  return (
    <motion.div
      className="p-6 space-y-6"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-gray-400 mb-1">
            <Link href="/quality" className="hover:text-secondary transition-colors">
              Data Quality
            </Link>
            <span>/</span>
            <span className="text-secondary font-bold">Resubmission History</span>
          </nav>
          <h1 className="text-2xl font-bold text-primary">Resubmission History</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Track how institutions improve their data quality across multiple submission attempts.
          </p>
        </div>
        <Button variant="primary" size="sm">
          Export Audit Trail
        </Button>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-1 border-b border-outline-variant">
        <Link
          href="/quality"
          className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-t-lg transition-colors"
        >
          Quality Dashboard
        </Link>
        <Link
          href="/quality/compliance"
          className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-t-lg transition-colors"
        >
          Compliance
        </Link>
        <span className="px-4 py-2 text-sm font-semibold text-primary border-b-2 border-primary">
          Resubmissions
        </span>
        <Link
          href="/quality/corrections"
          className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-t-lg transition-colors"
        >
          Corrections
        </Link>
      </div>

      {/* Loading / Error */}
      {isLoading && <PageSpinner />}
      {isError && (
        <Alert variant="error">
          Failed to load batch data. Please try again.
        </Alert>
      )}

      {!isLoading && !isError && (
        <>
          {/* Metrics Row */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            variants={staggerContainer(0.06)}
            initial="initial"
            animate="animate"
          >
            <motion.div
              variants={staggerItem}
              transition={staggerItemTransition}
              whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
              className="bg-white border border-outline-variant p-5 rounded-xl shadow-sm flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-on-surface-variant">Average Attempts per Cycle</p>
                <p className="text-2xl font-bold text-primary">{metrics.avgAttempts}</p>
              </div>
            </motion.div>

            <motion.div
              variants={staggerItem}
              transition={staggerItemTransition}
              whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
              className="bg-white border border-outline-variant p-5 rounded-xl shadow-sm flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-on-surface-variant">Total Records Corrected</p>
                <p className="text-2xl font-bold text-primary">
                  {metrics.totalCorrected.toLocaleString()}
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={staggerItem}
              transition={staggerItemTransition}
              whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
              className="bg-white border border-outline-variant p-5 rounded-xl shadow-sm flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-on-surface-variant">Avg. Improvement Rate</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {metrics.avgImprovement !== null ? `+${metrics.avgImprovement}%` : '—'}
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-4 border-b border-outline-variant flex flex-wrap justify-between items-center gap-3 bg-surface">
              <h4 className="text-[11px] font-bold text-primary uppercase tracking-widest">
                Detailed Submission Log
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                {/* Institution filter */}
                <select
                  value={institutionFilter}
                  onChange={(e) => setInstitutionFilter(e.target.value)}
                  className="border border-outline-variant rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                >
                  {institutionOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === 'ALL' ? 'All Institutions' : opt}
                    </option>
                  ))}
                </select>

                {/* Month filter */}
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="border border-outline-variant rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                >
                  {monthOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === 'ALL' ? 'All Months' : opt}
                    </option>
                  ))}
                </select>

                {/* Tab filter */}
                <div className="flex border border-outline-variant rounded-lg overflow-hidden text-xs font-semibold">
                  {(['ALL', 'FAILED', 'SUCCESS'] as FilterTab[]).map((tab) => (
                    <motion.button
                      key={tab}
                      onClick={() => setFilterTab(tab)}
                      className={`px-3 py-1.5 transition-colors ${
                        filterTab === tab
                          ? 'bg-surface-container-high text-primary'
                          : 'text-on-surface-variant hover:bg-surface-container'
                      }`}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring.crisp}
                    >
                      {tab}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-surface border-b-2 border-primary-container text-[10px] uppercase tracking-widest font-bold text-primary">
                  <tr>
                    <th className="px-6 py-4">Attempt #</th>
                    <th className="px-6 py-4">Institution</th>
                    <th className="px-6 py-4">Reporting Month</th>
                    <th className="px-6 py-4">Submitted At</th>
                    <th className="px-6 py-4 text-right">Records</th>
                    <th className="px-6 py-4">Accepted / Rejected</th>
                    <th className="px-6 py-4">Improvement</th>
                    <th className="px-6 py-4 text-center">Error Trend</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <motion.tbody
                  className="divide-y divide-outline-variant"
                  variants={staggerContainer(0.06)}
                  initial="initial"
                  animate="animate"
                >
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-6 py-16 text-center text-on-surface-variant"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-10 h-10 text-outline-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="font-medium">No resubmissions found</p>
                          <p className="text-xs">
                            Resubmissions appear when a batch has sequence_number &gt; 1.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => {
                      const improvBadge = getImprovementBadge(row.improvementPct);
                      const accRate =
                        row.totalRecords > 0
                          ? ((row.acceptedRecords / row.totalRecords) * 100).toFixed(1)
                          : '—';
                      return (
                        <motion.tr
                          key={row.id}
                          variants={staggerItem}
                          transition={staggerItemTransition}
                          className="hover:bg-blue-50/20 transition-colors even:bg-slate-50"
                        >
                          <td className="px-6 py-4 font-semibold text-primary">
                            Attempt {row.sequenceNumber}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-bold text-[10px] text-primary shrink-0">
                                {row.institutionName.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-medium truncate max-w-[140px]">
                                {row.institutionName}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant">
                            {row.reportingMonth}
                          </td>
                          <td className="px-6 py-4 text-xs text-on-surface-variant whitespace-nowrap">
                            {new Date(row.createdAt).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-6 py-4 text-right font-mono">
                            {row.totalRecords?.toLocaleString() ?? '—'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                <span className="text-xs text-green-700 font-medium">
                                  {row.acceptedRecords?.toLocaleString() ?? '—'} Accepted
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                <span className="text-xs text-red-700 font-medium">
                                  {row.rejectedRecords?.toLocaleString() ?? '—'} Rejected
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <motion.span
                              className={`px-2 py-1 rounded text-[11px] font-bold ${improvBadge.className}`}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={spring.crisp}
                            >
                              {improvBadge.label}
                            </motion.span>
                          </td>
                          <td className="px-6 py-4">
                            <Sparkline value={row.improvementPct ?? 0} />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={spring.crisp}
                              className="inline-flex"
                            >
                              <Badge variant={statusBadgeVariant(row.status)}>
                                {row.status}
                              </Badge>
                            </motion.span>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </motion.tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 bg-surface border-t border-outline-variant flex justify-between items-center">
              <p className="text-xs text-on-surface-variant">
                Showing {filteredRows.length} resubmission{filteredRows.length !== 1 ? 's' : ''} (batches with sequence &gt; 1)
              </p>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
