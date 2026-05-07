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
} from '@/lib/motion';
import { AnimatedBar } from '@/components/motion/AnimatedBar';

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

type DateRange = '7' | '30' | '90';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function statusBadgeVariant(
  status: string
): 'success' | 'error' | 'pending' | 'warning' | 'neutral' {
  const s = status?.toUpperCase();
  if (['LIVE', 'ACCEPTED', 'COMPLETED'].includes(s)) return 'success';
  if (['REJECTED', 'FAILED'].includes(s)) return 'error';
  if (['PENDING', 'PROCESSING', 'IN_PROGRESS'].includes(s)) return 'pending';
  if (['PARTIAL'].includes(s)) return 'warning';
  return 'neutral';
}

function qualityScoreColor(score: number): string {
  if (score >= 98) return 'text-green-600';
  if (score >= 90) return 'text-amber-500';
  return 'text-red-600';
}

function qualityBarColor(score: number): string {
  if (score >= 98) return 'bg-green-500';
  if (score >= 90) return 'bg-amber-500';
  return 'bg-red-500';
}

// ─── Sub-nav ──────────────────────────────────────────────────────────────────

const subNav = [
  { label: 'Compliance', href: '/quality/compliance' },
  { label: 'Resubmissions', href: '/quality/resubmissions' },
  { label: 'Corrections', href: '/quality/corrections' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function QualityDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30');

  const { data: batchesData, isLoading, isError } = useQuery({
    queryKey: ['batches-quality', dateRange],
    queryFn: async () => {
      const res = await api.get<{ data: Batch[]; total: number }>(
        '/batches?limit=100'
      );
      return res.data;
    },
  });

  const batches: Batch[] = batchesData?.data ?? [];

  // Filter by date range
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(dateRange, 10));
    return d;
  }, [dateRange]);

  const filteredBatches = useMemo(
    () =>
      batches.filter((b) => {
        const created = new Date(b.created_at);
        return created >= cutoff;
      }),
    [batches, cutoff]
  );

  // KPI computations
  const stats = useMemo(() => {
    const total = filteredBatches.length;
    const totalRecords = filteredBatches.reduce(
      (s, b) => s + (b.total_records ?? 0),
      0
    );
    const totalAccepted = filteredBatches.reduce(
      (s, b) => s + (b.accepted_records ?? 0),
      0
    );
    const totalRejected = filteredBatches.reduce(
      (s, b) => s + (b.rejected_records ?? 0),
      0
    );
    const acceptanceRate =
      totalRecords > 0 ? ((totalAccepted / totalRecords) * 100).toFixed(1) : '—';

    // Derive error code frequencies from error_codes arrays
    const errorFreq: Record<string, number> = {};
    filteredBatches.forEach((b) => {
      (b.error_codes ?? []).forEach((code) => {
        errorFreq[code] = (errorFreq[code] ?? 0) + 1;
      });
    });
    const topErrors = Object.entries(errorFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Institution quality scores (group by institution)
    const instMap: Record<
      string,
      { name: string; totalRecords: number; accepted: number; lastDate: string }
    > = {};
    filteredBatches.forEach((b) => {
      const key = b.institution_id;
      if (!instMap[key]) {
        instMap[key] = {
          name: b.institution_name ?? b.institution_id,
          totalRecords: 0,
          accepted: 0,
          lastDate: b.created_at,
        };
      }
      instMap[key].totalRecords += b.total_records ?? 0;
      instMap[key].accepted += b.accepted_records ?? 0;
      if (new Date(b.created_at) > new Date(instMap[key].lastDate)) {
        instMap[key].lastDate = b.created_at;
      }
    });

    const leagueTable = Object.entries(instMap)
      .map(([id, inst]) => ({
        id,
        name: inst.name,
        score:
          inst.totalRecords > 0
            ? parseFloat(
                ((inst.accepted / inst.totalRecords) * 100).toFixed(1)
              )
            : 0,
        lastDate: inst.lastDate,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      total,
      totalRecords,
      totalAccepted,
      totalRejected,
      acceptanceRate,
      topErrors,
      leagueTable,
    };
  }, [filteredBatches]);

  // Recent batches for bottom table (last 10)
  const recentBatches = useMemo(
    () =>
      [...filteredBatches]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 10),
    [filteredBatches]
  );

  const maxErrorCount = stats.topErrors[0]?.[1] ?? 1;

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
            <span>Ecosystem</span>
            <span>/</span>
            <span className="text-secondary font-bold">Data Quality Dashboard</span>
          </nav>
          <h1 className="text-2xl font-bold text-primary">Data Quality Dashboard</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Monitor batch acceptance rates, error patterns, and institutional compliance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Date Range Filter */}
          <div className="flex rounded-lg border border-outline-variant overflow-hidden text-xs font-semibold relative">
            {(['7', '30', '90'] as DateRange[]).map((d) => (
              <button
                key={d}
                onClick={() => setDateRange(d)}
                className={`relative px-3 py-2 transition-colors ${
                  dateRange === d
                    ? 'text-white'
                    : 'bg-white text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                {dateRange === d && (
                  <motion.span
                    layoutId="quality-date-range-pill"
                    className="absolute inset-0 bg-primary-container rounded-none"
                    style={{ zIndex: 0 }}
                    transition={spring.crisp}
                  />
                )}
                <span className="relative z-10">
                  {d === '7' ? 'Last 7 days' : d === '30' ? 'Last 30 days' : 'Last 90 days'}
                </span>
              </button>
            ))}
          </div>
          <Button variant="primary" size="sm">
            Export Report
          </Button>
        </div>
      </div>

      {/* Sub-navigation */}
      <motion.div
        variants={staggerContainer(0.05)}
        initial="initial"
        animate="animate"
        className="flex gap-1 border-b border-outline-variant"
      >
        {subNav.map((item) => (
          <motion.a
            key={item.href}
            href={item.href}
            variants={staggerItem}
            whileHover={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
            className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary rounded-t-lg transition-colors block"
          >
            {item.label}
          </motion.a>
        ))}
      </motion.div>

      {/* Loading / Error */}
      {isLoading && <PageSpinner />}
      {isError && (
        <Alert variant="error">
          Failed to load batch data. Please try again.
        </Alert>
      )}

      {!isLoading && !isError && (
        <>
          {/* KPI Row */}
          <motion.div
            variants={staggerContainer(0.06)}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {/* Acceptance Rate */}
            <motion.div
              variants={staggerItem}
              transition={staggerItemTransition}
              whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}
              className="bg-white p-4 rounded-xl border border-outline-variant shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <motion.span
                  whileHover={{ rotate: 8, scale: 1.1 }}
                  transition={spring.crisp}
                  className="p-2 bg-green-50 rounded-lg inline-block"
                >
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </motion.span>
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...spring.crisp, delay: 0.3 }}
                  className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full"
                >
                  MTD
                </motion.span>
              </div>
              <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">Overall Acceptance Rate</p>
              <h3 className="text-3xl font-bold text-primary mt-1">{stats.acceptanceRate}%</h3>
            </motion.div>

            {/* Total Records */}
            <motion.div
              variants={staggerItem}
              transition={staggerItemTransition}
              whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}
              className="bg-white p-4 rounded-xl border border-outline-variant shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <motion.span
                  whileHover={{ rotate: 8, scale: 1.1 }}
                  transition={spring.crisp}
                  className="p-2 bg-surface-container-high rounded-lg inline-block"
                >
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4-8 4" />
                  </svg>
                </motion.span>
                <span className="text-[10px] font-bold text-gray-400 uppercase bg-surface-container px-2 py-1 rounded-full">
                  {dateRange}D
                </span>
              </div>
              <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">Total Records Processed</p>
              <h3 className="text-3xl font-bold text-primary mt-1">{formatNumber(stats.totalRecords)}</h3>
            </motion.div>

            {/* Total Rejections */}
            <motion.div
              variants={staggerItem}
              transition={staggerItemTransition}
              whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}
              className="bg-white p-4 rounded-xl border border-outline-variant shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <motion.span
                  whileHover={{ rotate: 8, scale: 1.1 }}
                  transition={spring.crisp}
                  className="p-2 bg-red-50 rounded-lg inline-block"
                >
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </motion.span>
              </div>
              <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">Total Rejections</p>
              <h3 className="text-3xl font-bold text-primary mt-1">{formatNumber(stats.totalRejected)}</h3>
            </motion.div>

            {/* Total Batches */}
            <motion.div
              variants={staggerItem}
              transition={staggerItemTransition}
              whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}
              className="bg-white p-4 rounded-xl border border-outline-variant shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <motion.span
                  whileHover={{ rotate: 8, scale: 1.1 }}
                  transition={spring.crisp}
                  className="p-2 bg-blue-50 rounded-lg inline-block"
                >
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </motion.span>
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...spring.crisp, delay: 0.3 }}
                  className="text-[10px] font-bold text-gray-400 uppercase bg-surface-container px-2 py-1 rounded-full"
                >
                  MTD
                </motion.span>
              </div>
              <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">Total Batches</p>
              <h3 className="text-3xl font-bold text-primary mt-1">{stats.total}</h3>
            </motion.div>
          </motion.div>

          {/* Analytics Grid */}
          <div className="grid grid-cols-12 gap-4">
            {/* Top Error Codes */}
            <div className="col-span-12 lg:col-span-8 bg-white p-6 rounded-xl border border-outline-variant shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-semibold text-primary">Top Error Codes by Frequency</h4>
                <span className="text-xs text-on-surface-variant">
                  {filteredBatches.length} batches in last {dateRange} days
                </span>
              </div>
              {stats.topErrors.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-on-surface-variant">
                  <motion.svg
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="w-8 h-8 mb-2 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </motion.svg>
                  <p className="text-sm font-medium">No error codes recorded in this period</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {stats.topErrors.map(([code, count], index) => (
                    <motion.div
                      key={code}
                      whileHover={{ scale: 1.01 }}
                      className="flex items-center gap-3"
                    >
                      <div className="text-[10px] font-bold text-on-surface-variant w-32 truncate" title={code}>
                        {code}
                      </div>
                      <div className="flex-1 bg-surface-container h-8 rounded relative overflow-hidden">
                        <AnimatedBar
                          pct={(count / maxErrorCount) * 100}
                          className="bg-primary-container h-full absolute top-0 left-0"
                          delay={index * 0.06}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-on-surface-variant">
                          {count.toLocaleString()}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Rejection Distribution */}
            <div className="col-span-12 lg:col-span-4 bg-white p-6 rounded-xl border border-outline-variant shadow-sm">
              <h4 className="text-lg font-semibold text-primary mb-6">Batch Status Distribution</h4>
              {(() => {
                const groups: Record<string, number> = {};
                filteredBatches.forEach((b) => {
                  const key = b.status ?? 'UNKNOWN';
                  groups[key] = (groups[key] ?? 0) + 1;
                });
                const total = filteredBatches.length || 1;
                const colors = [
                  'bg-primary',
                  'bg-secondary',
                  'bg-secondary-container',
                  'bg-outline-variant',
                  'bg-red-400',
                ];
                return (
                  <div className="space-y-4">
                    {Object.entries(groups).map(([status, count], i) => (
                      <div key={status} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{status}</span>
                          <span className="text-primary">{((count / total) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                          <AnimatedBar
                            pct={(count / total) * 100}
                            className={`${colors[i % colors.length]} h-full rounded-full`}
                            delay={i * 0.06}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Institution League Table */}
          {stats.leagueTable.length > 0 && (
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="p-5 border-b border-outline-variant flex justify-between items-center">
                <h4 className="text-lg font-semibold text-primary">Institution League Table</h4>
                <div className="flex gap-4 text-xs font-semibold text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> High Quality (&ge;98%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Needs Review (90–97%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Critical (&lt;90%)
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low border-b-2 border-primary-container text-[10px] uppercase tracking-widest font-bold text-primary">
                    <tr>
                      <th className="px-6 py-4">Rank</th>
                      <th className="px-6 py-4">Institution</th>
                      <th className="px-6 py-4 text-center">Quality Score</th>
                      <th className="px-6 py-4 text-right">Last Submission</th>
                    </tr>
                  </thead>
                  <motion.tbody
                    variants={staggerContainer(0.04)}
                    initial="initial"
                    animate="animate"
                  >
                    {stats.leagueTable.map((inst, i) => (
                      <motion.tr
                        key={inst.id}
                        variants={staggerItem}
                        {...(i === 0
                          ? {
                              animate: {
                                backgroundColor: ['#ffffff', '#f0fdf4', '#ffffff'],
                              },
                              transition: { delay: 0.8, duration: 1 },
                            }
                          : {})}
                        className="hover:bg-blue-50/30 transition-colors border-b border-outline-variant/50 even:bg-slate-50"
                      >
                        <td className="px-6 py-4 font-bold text-on-surface-variant">
                          {String(i + 1).padStart(2, '0')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <motion.div
                              whileHover={{ scale: 1.15 }}
                              transition={spring.crisp}
                              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold text-[10px] text-primary"
                            >
                              {inst.name.slice(0, 2).toUpperCase()}
                            </motion.div>
                            <span className="font-semibold">{inst.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                              <AnimatedBar
                                pct={inst.score}
                                className={`h-full ${qualityBarColor(inst.score)}`}
                                delay={i * 0.04}
                              />
                            </div>
                            <span className={`font-bold text-sm ${qualityScoreColor(inst.score)}`}>
                              {inst.score}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-on-surface-variant text-xs">
                          {new Date(inst.lastDate).toLocaleDateString()}
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Batches Table */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-5 border-b border-outline-variant">
              <h4 className="text-lg font-semibold text-primary">Recent Batches</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-low border-b-2 border-primary-container text-[10px] uppercase tracking-widest font-bold text-primary">
                  <tr>
                    <th className="px-6 py-4">Batch ID</th>
                    <th className="px-6 py-4">Institution</th>
                    <th className="px-6 py-4">Reporting Month</th>
                    <th className="px-6 py-4 text-right">Records</th>
                    <th className="px-6 py-4 text-right">Accepted</th>
                    <th className="px-6 py-4 text-right">Rejected</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Date</th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={staggerContainer(0.03)}
                  initial="initial"
                  animate="animate"
                >
                  {recentBatches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-on-surface-variant">
                        No batches found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    recentBatches.map((batch) => (
                      <motion.tr
                        key={batch.id}
                        variants={staggerItem}
                        className="hover:bg-blue-50/30 transition-colors border-b border-outline-variant/50 even:bg-slate-50"
                      >
                        <td className="px-6 py-3 font-mono text-xs text-secondary font-semibold">
                          {batch.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-6 py-3 font-medium">
                          {batch.institution_name ?? batch.institution_id}
                        </td>
                        <td className="px-6 py-3 text-on-surface-variant">
                          {batch.reporting_month}
                        </td>
                        <td className="px-6 py-3 text-right font-mono">
                          {batch.total_records?.toLocaleString() ?? '—'}
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-green-700">
                          {batch.accepted_records?.toLocaleString() ?? '—'}
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-red-700">
                          {batch.rejected_records?.toLocaleString() ?? '—'}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <Badge variant={statusBadgeVariant(batch.status)}>
                            {batch.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-right text-xs text-on-surface-variant">
                          {new Date(batch.created_at).toLocaleDateString()}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </motion.tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
