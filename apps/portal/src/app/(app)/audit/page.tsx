'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import {
  spring, fadeUp, fadeUpTransition,
  staggerContainer, staggerItem, staggerItemTransition,
} from '@/lib/motion';

type ActorType = 'USER' | 'API_CLIENT' | 'SYSTEM' | '';
type EventCategory = 'AUTH' | 'DATA' | 'ADMIN' | 'REPORT' | 'SECURITY' | 'CONFIG' | '';
type EventResult = 'SUCCESS' | 'FAILURE' | '';

interface AuditEntry {
  id: string;
  timestamp: string;
  actorType: ActorType;
  actorName?: string;
  actorId?: string;
  institutionName?: string;
  institutionId?: string;
  action: string;
  objectType?: string;
  objectId?: string;
  category: EventCategory;
  result: EventResult;
  ipAddress?: string;
}

interface Filters {
  actorType: ActorType;
  category: EventCategory;
  result: EventResult;
  dateFrom: string;
  dateTo: string;
}

function ResultBadge({ result }: { result: string }) {
  if (result === 'SUCCESS')
    return (
      <motion.span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring.crisp}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
        SUCCESS
      </motion.span>
    );
  if (result === 'FAILURE')
    return (
      <motion.span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring.crisp}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
        FAILURE
      </motion.span>
    );
  return <Badge variant="neutral">{result}</Badge>;
}

function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    AUTH: 'bg-purple-100 text-purple-800',
    DATA: 'bg-blue-100 text-blue-800',
    ADMIN: 'bg-yellow-100 text-yellow-800',
    REPORT: 'bg-cyan-100 text-cyan-800',
    SECURITY: 'bg-red-100 text-red-800',
    CONFIG: 'bg-orange-100 text-orange-800',
  };
  return (
    <motion.span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${styles[category] ?? 'bg-gray-100 text-gray-700'}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={spring.crisp}
    >
      {category}
    </motion.span>
  );
}

export default function GlobalAuditPage() {
  const { hasPermission } = useAuthStore();
  const canExport = hasPermission('audit:export');

  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    actorType: '',
    category: '',
    result: '',
    dateFrom: '',
    dateTo: '',
  });
  const [appliedFilters, setAppliedFilters] = useState<Filters>(filters);

  const buildParams = () => {
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (appliedFilters.actorType) params.set('actorType', appliedFilters.actorType);
    if (appliedFilters.category) params.set('eventCategory', appliedFilters.category);
    if (appliedFilters.result) params.set('result', appliedFilters.result);
    if (appliedFilters.dateFrom) params.set('dateFrom', appliedFilters.dateFrom);
    if (appliedFilters.dateTo) params.set('dateTo', appliedFilters.dateTo);
    return params.toString();
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit-logs', page, appliedFilters],
    queryFn: async () => {
      try {
        const res = await api.get(`/audit?${buildParams()}`);
        return res.data;
      } catch (err: unknown) {
        const e = err as { response?: { status?: number } };
        if (e?.response?.status === 404 || e?.response?.status === 403) {
          return { data: [], total: 0, meta: {} };
        }
        throw err;
      }
    },
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const entries: AuditEntry[] = data?.data ?? data?.logs ?? [];
  const total: number = data?.total ?? data?.meta?.total ?? entries.length;
  const totalPages = Math.max(1, Math.ceil(total / 50));

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
  };

  const handleResetFilters = () => {
    const empty: Filters = { actorType: '', category: '', result: '', dateFrom: '', dateTo: '' };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const res = await api.get(`/audit/export?${buildParams()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Export failed. Please try again.');
    }
  };

  return (
    <motion.div
      className="p-6 max-w-7xl mx-auto space-y-6"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Global Audit Trail</h1>
          <p className="text-outline mt-1">
            Platform-wide monitoring for regulatory compliance and accountability.
          </p>
        </div>
        <div className="flex gap-3">
          <motion.button
            onClick={() => setAutoRefresh((v) => !v)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={spring.crisp}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded border transition-colors ${
              autoRefresh
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-white border-outline-variant text-outline hover:bg-surface-container-low'
            }`}
          >
            <svg className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </motion.button>
          {canExport && (
            <motion.button
              onClick={handleExport}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.crisp}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded hover:opacity-90 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Audit Log
            </motion.button>
          )}
        </div>
      </div>

      {/* Filters */}
      <motion.div
        className="bg-white border border-outline-variant rounded-xl shadow-sm p-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.soft, delay: 0.1 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-outline uppercase mb-1">Actor Type</label>
            <select
              value={filters.actorType}
              onChange={(e) => setFilters((f) => ({ ...f, actorType: e.target.value as ActorType }))}
              className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-secondary focus:outline-none"
            >
              <option value="">All Actor Types</option>
              <option value="USER">USER</option>
              <option value="API_CLIENT">API_CLIENT</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-outline uppercase mb-1">Event Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value as EventCategory }))}
              className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-secondary focus:outline-none"
            >
              <option value="">All Categories</option>
              {['AUTH', 'DATA', 'ADMIN', 'REPORT', 'SECURITY', 'CONFIG'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-outline uppercase mb-1">Result</label>
            <select
              value={filters.result}
              onChange={(e) => setFilters((f) => ({ ...f, result: e.target.value as EventResult }))}
              className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-secondary focus:outline-none"
            >
              <option value="">All Results</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILURE">FAILURE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-outline uppercase mb-1">Date Range</label>
            <div className="flex gap-1">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                className="w-full border border-outline-variant rounded px-2 py-2 text-xs bg-white focus:ring-1 focus:ring-secondary focus:outline-none"
              />
              <span className="self-center text-outline text-xs">–</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                className="w-full border border-outline-variant rounded px-2 py-2 text-xs bg-white focus:ring-1 focus:ring-secondary focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <motion.button
              onClick={handleResetFilters}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.crisp}
              className="flex-1 px-3 py-2 border border-outline-variant text-sm font-semibold text-outline rounded hover:bg-surface-container-low transition-colors"
            >
              Reset
            </motion.button>
            <motion.button
              onClick={handleApplyFilters}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.crisp}
              className="flex-1 px-3 py-2 bg-secondary text-white text-sm font-semibold rounded hover:opacity-90 transition-opacity"
            >
              Apply
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">Audit Log Entries</h2>
          <span className="text-xs text-outline">{total.toLocaleString()} total records</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto mb-3 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-semibold text-outline">Audit log data unavailable</p>
            <p className="text-sm text-outline mt-1">
              This feature requires the <code className="font-mono bg-surface-container px-1 rounded">audit:read</code> permission or the audit endpoint may not be configured.
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-outline">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-semibold">No audit records found</p>
            <p className="text-sm mt-1">
              Try adjusting your filters or date range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-primary text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Timestamp</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Actor</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Type</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Institution</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Action</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Object</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Category</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Result</th>
                </tr>
              </thead>
              <motion.tbody
                className="divide-y divide-outline-variant"
                variants={staggerContainer(0.025)}
                initial="initial"
                animate="animate"
              >
                {entries.map((entry, idx) => (
                  <motion.tr
                    key={entry.id}
                    variants={staggerItem}
                    transition={staggerItemTransition}
                    className={`hover:bg-secondary-container/10 transition-colors ${idx % 2 === 1 ? 'bg-slate-50' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-outline whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-on-surface text-xs">{entry.actorName ?? entry.actorId ?? '—'}</div>
                      {entry.actorId && entry.actorName && (
                        <div className="text-[10px] text-outline font-mono">{entry.actorId}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container text-on-surface-variant uppercase">
                        {entry.actorType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface">{entry.institutionName ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-on-surface max-w-[180px] truncate" title={entry.action}>
                      {entry.action}
                    </td>
                    <td className="px-4 py-3 text-xs text-outline">
                      {entry.objectType ? (
                        <span>
                          {entry.objectType}
                          {entry.objectId && (
                            <span className="font-mono ml-1 text-[10px]">#{entry.objectId.slice(0, 8)}</span>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={entry.category ?? ''} />
                    </td>
                    <td className="px-4 py-3">
                      <ResultBadge result={entry.result ?? ''} />
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
            <span className="text-xs text-outline">
              Page {page} of {totalPages} — {total.toLocaleString()} records
            </span>
            <div className="flex gap-1">
              <motion.button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.crisp}
                className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded hover:bg-surface-container-high disabled:opacity-40 transition-colors"
              >
                ‹
              </motion.button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <motion.button
                    key={p}
                    onClick={() => setPage(p)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={spring.crisp}
                    className={`w-8 h-8 flex items-center justify-center border rounded text-xs font-semibold transition-colors ${
                      p === page
                        ? 'bg-primary text-white border-primary'
                        : 'border-outline-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {p}
                  </motion.button>
                );
              })}
              <motion.button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.crisp}
                className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded hover:bg-surface-container-high disabled:opacity-40 transition-colors"
              >
                ›
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
