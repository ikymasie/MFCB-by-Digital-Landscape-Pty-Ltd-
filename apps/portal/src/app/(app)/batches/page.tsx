'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Upload, BarChart2, ShieldCheck, AlertCircle, Clock, Search, SlidersHorizontal, ChevronLeft, ChevronRight, XCircle } from '@/lib/icons';
import {
  spring, fadeUp, fadeUpTransition, scaleIn, fadeIn,
  staggerContainer, staggerItem, staggerItemTransition,
  expandTransition, expandHeight,
} from '@/lib/motion';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { AnimatedBar } from '@/components/motion/AnimatedBar';

interface Batch {
  id: string;
  short_id?: string;
  institution_id: string;
  institution_name?: string;
  reporting_month: string;
  file_type: 'TEST' | 'LIVE';
  status: 'QUEUED' | 'VALIDATING' | 'PARSING' | 'FIELD_VALIDATION' | 'MASTERING' | 'COMPLETED' | 'FAILED';
  channel?: string;
  total_records?: number;
  accepted_count?: number;
  rejected_count?: number;
  submitted_at: string;
  created_at?: string;
}

interface BatchesResponse {
  data: Batch[];
  total: number;
  page: number;
  limit: number;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatReportingMonth(val: string) {
  if (!val) return '—';
  const d = new Date(val + '-01');
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

const IN_PROGRESS_STATUSES = new Set(['VALIDATING', 'PARSING', 'MASTERING']);

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    COMPLETED:        { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-600', label: 'COMPLETED' },
    VALIDATING:       { bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-600',    label: 'VALIDATING' },
    PARSING:          { bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-600',    label: 'PARSING' },
    FIELD_VALIDATION: { bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-600',    label: 'VALIDATING' },
    MASTERING:        { bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-600',    label: 'MASTERING' },
    FAILED:           { bg: 'bg-red-100',     text: 'text-red-800',     dot: 'bg-red-600',     label: 'FAILED' },
    QUEUED:           { bg: 'bg-amber-100',   text: 'text-amber-800',   dot: 'bg-amber-500',   label: 'QUEUED' },
  };
  const c = cfg[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400', label: status };
  const isInProgress = IN_PROGRESS_STATUSES.has(status);
  return (
    <span className={`${c.bg} ${c.text} px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-fit`}>
      {isInProgress ? (
        <motion.span
          className={`w-1.5 h-1.5 ${c.dot} rounded-full`}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      ) : (
        <span className={`w-1.5 h-1.5 ${c.dot} rounded-full`} />
      )}
      {c.label}
    </span>
  );
}

function FileTypeBadge({ type }: { type: 'TEST' | 'LIVE' }) {
  if (type === 'LIVE') {
    return <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">LIVE</span>;
  }
  return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">TEST</span>;
}

export default function BatchesPage() {
  const router = useRouter();
  const { user, hasPermission } = useAuthStore();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [search, setSearch] = useState('');

  const limit = 20;

  const { data, isLoading, isError, error } = useQuery<BatchesResponse>({
    queryKey: ['batches', page, statusFilter, monthFilter, user?.institutionId],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (monthFilter) params.from = monthFilter;
      if (user?.institutionId) params.institution_id = user.institutionId;
      const res = await api.get('/batches', { params });
      return res.data;
    },
  });

  const batches: Batch[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const filtered = search
    ? batches.filter(
        (b) =>
          b.id.toLowerCase().includes(search.toLowerCase()) ||
          (b.short_id ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : batches;

  const pendingCount = batches.filter((b) => ['QUEUED', 'VALIDATING', 'PARSING', 'FIELD_VALIDATION', 'MASTERING'].includes(b.status)).length;
  const errorTotal = batches.reduce((sum, b) => sum + (b.rejected_count ?? 0), 0);
  const acceptedTotal = batches.reduce((sum, b) => sum + (b.accepted_count ?? 0), 0);
  const allRecords = batches.reduce((sum, b) => sum + (b.total_records ?? 0), 0);
  const acceptanceRate = allRecords > 0 ? parseFloat(((acceptedTotal / allRecords) * 100).toFixed(1)) : null;

  return (
    <motion.div
      className="p-6 max-w-[1280px] mx-auto"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      {/* Page Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] leading-tight font-bold tracking-tight text-[#001e40]">Batch Submissions</h1>
          <p className="text-[18px] text-[#43474f] mt-1">Monitor and manage your institutional data uploads.</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            className="bg-white border border-[#737780] text-[#001e40] font-semibold text-sm px-6 py-2.5 rounded hover:bg-[#f2f4f6] transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={spring.crisp}
          >
            Export History
          </motion.button>
          {hasPermission('batches:submit') && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.crisp}
            >
              <Link
                href="/batches/new"
                className="bg-[#001e40] text-white font-semibold text-sm px-6 py-2.5 rounded flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Upload className="w-5 h-5" />
                Upload Batch
              </Link>
            </motion.div>
          )}
        </div>
      </div>

      {/* Summary Metrics */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10"
        variants={staggerContainer(0.07)}
        initial="initial"
        animate="animate"
      >
        <motion.div
          className="bg-white p-6 rounded-xl border border-[#c3c6d1] shadow-sm flex items-start justify-between"
          variants={staggerItem}
          transition={staggerItemTransition}
          whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
        >
          <div>
            <p className="text-xs font-semibold text-[#43474f] uppercase tracking-wider mb-2">Total Submitted</p>
            <h3 className="text-[32px] font-bold text-[#001e40] leading-none">
              {isLoading ? '—' : (
                <AnimatedNumber value={total} />
              )}{' '}
              <span className="text-sm font-normal text-[#43474f]">Batches</span>
            </h3>
          </div>
          <motion.div
            className="w-10 h-10 bg-blue-50 rounded flex items-center justify-center"
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={spring.crisp}
          >
            <BarChart2 className="w-5 h-5 text-[#001e40]" />
          </motion.div>
        </motion.div>

        <motion.div
          className="bg-white p-6 rounded-xl border border-[#c3c6d1] shadow-sm flex items-start justify-between"
          variants={staggerItem}
          transition={staggerItemTransition}
          whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
        >
          <div>
            <p className="text-xs font-semibold text-[#43474f] uppercase tracking-wider mb-2">Acceptance Rate</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-[32px] font-bold text-[#001e40] leading-none">
                {isLoading || acceptanceRate === null ? '—' : (
                  <AnimatedNumber value={acceptanceRate} decimals={1} suffix="%" />
                )}
              </h3>
            </div>
          </div>
          <motion.div
            className="w-10 h-10 bg-emerald-50 rounded flex items-center justify-center"
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={spring.crisp}
          >
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </motion.div>
        </motion.div>

        <motion.div
          className="bg-white p-6 rounded-xl border border-[#c3c6d1] shadow-sm flex items-start justify-between"
          variants={staggerItem}
          transition={staggerItemTransition}
          whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
        >
          <div>
            <p className="text-xs font-semibold text-[#43474f] uppercase tracking-wider mb-2">Outstanding Errors</p>
            <h3 className="text-[32px] font-bold text-[#ba1a1a] leading-none">
              {isLoading ? '—' : (
                <AnimatedNumber value={errorTotal} />
              )}{' '}
              <span className="text-sm font-normal text-[#43474f]">Records</span>
            </h3>
          </div>
          <motion.div
            className="w-10 h-10 bg-red-50 rounded flex items-center justify-center"
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={spring.crisp}
          >
            <AlertCircle className="w-5 h-5 text-[#ba1a1a]" />
          </motion.div>
        </motion.div>

        <motion.div
          className="bg-white p-6 rounded-xl border border-[#c3c6d1] shadow-sm flex items-start justify-between"
          variants={staggerItem}
          transition={staggerItemTransition}
          whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
        >
          <div>
            <p className="text-xs font-semibold text-[#43474f] uppercase tracking-wider mb-2">Pending Processing</p>
            <h3 className="text-[32px] font-bold text-amber-600 leading-none">
              {isLoading ? '—' : (
                <AnimatedNumber value={pendingCount} />
              )}{' '}
              <span className="text-sm font-normal text-[#43474f]">Batches</span>
            </h3>
          </div>
          <motion.div
            className="w-10 h-10 bg-amber-50 rounded flex items-center justify-center"
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={spring.crisp}
          >
            <Clock className="w-5 h-5 text-amber-600" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        className="bg-white p-4 rounded-lg border border-[#c3c6d1] shadow-sm mb-6 flex flex-wrap items-center gap-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.soft, delay: 0.15 }}
      >
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#43474f]" />
          <input
            type="text"
            placeholder="Search by Batch ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#c3c6d1] rounded bg-white text-sm focus:ring-1 focus:ring-[#001e40] focus:border-[#001e40] outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#43474f]">Month:</label>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}
            className="border border-[#c3c6d1] rounded bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-[#001e40] outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#43474f]">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-[#c3c6d1] rounded bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-[#001e40] outline-none"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="VALIDATING">VALIDATING</option>
            <option value="FAILED">FAILED</option>
            <option value="QUEUED">QUEUED</option>
          </select>
        </div>

        <motion.button
          onClick={() => { setStatusFilter(''); setMonthFilter(''); setSearch(''); setPage(1); }}
          className="p-2 text-[#001e40] hover:bg-[#eceef0] rounded transition-colors"
          title="Clear Filters"
          whileHover={{ rotate: 90, scale: 1.1 }}
          transition={spring.crisp}
        >
          <XCircle className="w-5 h-5" />
        </motion.button>
      </motion.div>

      {/* Error State */}
      {isError && (
        <Alert variant="error" className="mb-6">
          Failed to load batches: {(error as Error)?.message ?? 'Unknown error'}
        </Alert>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-[#c3c6d1] shadow-sm overflow-hidden">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="spinner"
              className="flex items-center justify-center py-20"
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Spinner />
              <span className="ml-3 text-[#43474f]">Loading batches…</span>
            </motion.div>
          ) : (
            <motion.div
              key="table"
              variants={fadeUp}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={fadeUpTransition}
            >
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#f2f4f6] border-b border-[#001e40]">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold tracking-wider text-[#001e40]">Batch ID</th>
                    <th className="px-6 py-4 text-xs font-semibold tracking-wider text-[#001e40]">Reporting Month</th>
                    <th className="px-6 py-4 text-xs font-semibold tracking-wider text-[#001e40]">Type</th>
                    <th className="px-6 py-4 text-xs font-semibold tracking-wider text-[#001e40]">Channel</th>
                    <th className="px-6 py-4 text-xs font-semibold tracking-wider text-[#001e40]">Submitted At</th>
                    <th className="px-6 py-4 text-xs font-semibold tracking-wider text-[#001e40] text-right">Records</th>
                    <th className="px-6 py-4 text-xs font-semibold tracking-wider text-[#001e40] text-center">Acc / Rej</th>
                    <th className="px-6 py-4 text-xs font-semibold tracking-wider text-[#001e40]">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold tracking-wider text-[#001e40] text-right">Actions</th>
                  </tr>
                </thead>
                <motion.tbody
                  className="divide-y divide-[#c3c6d1]"
                  variants={staggerContainer(0.03)}
                  initial="initial"
                  animate="animate"
                >
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-16 text-center text-[#43474f]">
                        No batches found. Adjust filters or submit a new batch.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((batch, idx) => (
                      <motion.tr
                        key={batch.id}
                        className={`transition-colors cursor-pointer ${idx % 2 === 1 ? 'bg-[#f2f4f6]/20' : ''}`}
                        variants={staggerItem}
                        transition={staggerItemTransition}
                        whileHover={{ backgroundColor: '#eceef0' }}
                        onClick={() => router.push(`/batches/${batch.id}`)}
                      >
                        <td className="px-6 py-4 text-sm font-bold text-[#001e40]">
                          #{batch.short_id ?? batch.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#191c1e]">
                          {formatReportingMonth(batch.reporting_month)}
                        </td>
                        <td className="px-6 py-4">
                          <FileTypeBadge type={batch.file_type} />
                        </td>
                        <td className="px-6 py-4 text-sm text-[#43474f]">
                          {batch.channel ?? 'Portal'}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#43474f]">
                          {formatDate(batch.submitted_at ?? batch.created_at ?? '')}
                        </td>
                        <td className="px-6 py-4 text-sm text-right tabular-nums">
                          {batch.total_records != null ? batch.total_records.toLocaleString() : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-center tabular-nums">
                          {batch.accepted_count != null ? (
                            <>
                              <span className="text-emerald-600">{batch.accepted_count.toLocaleString()}</span>
                              {' / '}
                              <span className="text-[#ba1a1a]">{(batch.rejected_count ?? 0).toLocaleString()}</span>
                            </>
                          ) : (
                            <span className="text-[#43474f] opacity-40">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={batch.status} />
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/batches/${batch.id}`}
                            className="text-[#28628f] font-semibold text-sm hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </motion.tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="px-6 py-4 bg-[#f2f4f6] flex items-center justify-between border-t border-[#c3c6d1]">
            <span className="text-sm text-[#43474f]">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
            </span>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center border border-[#c3c6d1] rounded hover:bg-white disabled:opacity-50 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = i + 1;
                const isActive = page === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors relative ${
                      isActive
                        ? 'text-white font-bold'
                        : 'border border-[#c3c6d1] hover:bg-white'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="batch-page-pill"
                        className="absolute inset-0 bg-[#001e40] rounded"
                        transition={spring.crisp}
                      />
                    )}
                    <span className="relative z-10">{p}</span>
                  </button>
                );
              })}
              <motion.button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center border border-[#c3c6d1] rounded hover:bg-white disabled:opacity-50 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Info Card */}
      <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          className="lg:col-span-2 bg-[#003366] p-12 rounded-2xl flex items-center gap-8 text-[#799dd6] overflow-hidden relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.soft, delay: 0.3 }}
        >
          <div className="relative z-10 max-w-lg">
            <h2 className="text-[24px] font-semibold text-white mb-4">Master Data Compliance</h2>
            <p className="text-base mb-6 opacity-90">
              Ensure your batch files follow the M-BC1-2026 schema standards to avoid validation delays.
              Download the latest technical specification for REST API and SFTP channels.
            </p>
            <div className="flex gap-4">
              <motion.button
                className="bg-[#97ccfe] text-[#175683] font-semibold text-sm px-6 py-3 rounded-lg hover:brightness-110 transition-all"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                Download Schema
              </motion.button>
              <motion.button
                className="border border-[#799dd6]/40 text-[#799dd6] font-semibold text-sm px-6 py-3 rounded-lg hover:bg-white/10 transition-all"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                Integration Docs
              </motion.button>
            </div>
          </div>
        </motion.div>

        <div className="bg-white p-6 border border-[#c3c6d1] rounded-2xl shadow-sm">
          <h4 className="text-xs font-semibold text-[#001e40] uppercase tracking-wider mb-4">Submission Trends</h4>
          <div className="space-y-4">
            {[
              { label: 'Portal Uploads', pct: 42, color: 'bg-[#001e40]' },
              { label: 'REST API', pct: 38, color: 'bg-[#28628f]' },
              { label: 'SFTP Automation', pct: 20, color: 'bg-[#97ccfe]' },
            ].map(({ label, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-[#43474f]">{label}</span>
                  <span className="text-sm font-bold">{pct}%</span>
                </div>
                <div className="w-full bg-[#e0e3e5] h-1.5 rounded-full overflow-hidden">
                  <AnimatedBar pct={pct} className={`${color} h-full rounded-full`} />
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/batches/sftp"
            className="w-full mt-6 text-[#28628f] font-semibold text-sm flex items-center justify-center gap-2 py-2 border border-[#c3c6d1] rounded hover:bg-[#eceef0] transition-colors"
          >
            View SFTP Monitor
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
