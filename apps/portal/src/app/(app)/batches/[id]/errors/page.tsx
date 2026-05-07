'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ArrowLeft, AlertCircle, PieChart, Search,
  Download, FileText, ChevronsLeft, ChevronLeft, ChevronsRight,
  BookOpen, Headphones,
} from '@/lib/icons';
import api from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import {
  spring, fadeUp, fadeUpTransition, staggerContainer, staggerItem, staggerItemTransition,
} from '@/lib/motion';

interface ValidationError {
  id?: string;
  row_number: number;
  field_name: string;
  error_code: string;
  severity: 'REJECT' | 'WARN';
  message: string;
  raw_value?: string | null;
}

interface ErrorsResponse {
  data: ValidationError[];
  total: number;
  page: number;
  limit: number;
  summary?: {
    total: number;
    reject_count: number;
    warn_count: number;
  };
}

function SeverityBadge({ severity }: { severity: 'REJECT' | 'WARN' }) {
  if (severity === 'REJECT') {
    return (
      <motion.span
        className="bg-[#ffdad6] text-[#93000a] px-2 py-0.5 rounded font-bold text-[10px]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring.crisp}
      >
        REJECT
      </motion.span>
    );
  }
  return (
    <motion.span
      className="bg-[#cee5ff] text-[#175683] px-2 py-0.5 rounded font-bold text-[10px]"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={spring.crisp}
    >
      WARN
    </motion.span>
  );
}

export default function BatchErrorsPage() {
  const params = useParams<{ id: string }>();
  const batchId = params.id;

  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState('');
  const [codeSearch, setCodeSearch] = useState('');
  const limit = 50;

  const { data, isLoading, isError, error } = useQuery<ErrorsResponse>({
    queryKey: ['batch-errors', batchId, page, severityFilter, codeSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (severityFilter) params.severity = severityFilter;
      if (codeSearch) params.code = codeSearch;
      const res = await api.get(`/batches/${batchId}/errors`, { params });
      return res.data;
    },
  });

  const errors: ValidationError[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const rejectCount = data?.summary?.reject_count ?? errors.filter((e) => e.severity === 'REJECT').length;
  const warnCount = data?.summary?.warn_count ?? errors.filter((e) => e.severity === 'WARN').length;
  const totalErrors = data?.summary?.total ?? total;

  return (
    <motion.div
      className="max-w-[1280px] mx-auto px-6 py-6"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-4 text-sm text-[#43474f]">
        <Link href="/batches" className="hover:text-[#28628f] transition-colors">Batch Submissions</Link>
        <ChevronRight className="w-4 h-4 text-[#737780]" />
        <Link href={`/batches/${batchId}`} className="hover:text-[#28628f] transition-colors">
          Batch #{batchId.slice(-6).toUpperCase()}
        </Link>
        <ChevronRight className="w-4 h-4 text-[#737780]" />
        <span className="text-[#001e40] font-semibold">Validation Errors</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-[40px] font-bold tracking-tight text-[#001e40] leading-tight">
            Validation Errors: Batch #{batchId.slice(-6).toUpperCase()}
          </h1>
          <p className="text-base text-[#43474f] mt-2">
            {isLoading ? '…' : totalErrors} total error{totalErrors !== 1 ? 's' : ''} identified in the current batch submission.
          </p>
        </div>
        <Link
          href={`/batches/${batchId}`}
          className="flex items-center gap-2 px-6 py-4 border-[1.5px] border-[#75AADB] text-[#28628f] font-semibold text-sm rounded-lg hover:bg-[#cee5ff] transition-all whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Batch Detail
        </Link>
      </div>

      {/* Summary Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        variants={staggerContainer(0.07)}
        initial="initial"
        animate="animate"
      >
        <motion.div
          className="bg-white border border-[#c3c6d1] p-6 rounded-xl shadow-sm flex justify-between items-center"
          variants={staggerItem}
          transition={staggerItemTransition}
          whileHover={{ y: -2 }}
        >
          <div>
            <p className="text-xs font-semibold text-[#43474f] uppercase tracking-wider">Total Errors</p>
            <p className="text-[32px] font-semibold text-[#001e40] leading-none mt-1">
              {isLoading ? '—' : totalErrors}
            </p>
          </div>
          <div className="w-10 h-10 bg-[#eceef0] rounded-full flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-[#43474f]" />
          </div>
        </motion.div>

        <motion.div
          className="bg-white border border-[#c3c6d1] p-6 rounded-xl shadow-sm flex justify-between items-center"
          variants={staggerItem}
          transition={staggerItemTransition}
          whileHover={{ y: -2 }}
        >
          <div>
            <p className="text-xs font-semibold text-[#43474f] uppercase tracking-wider">Rejected</p>
            <p className="text-[32px] font-semibold text-[#ba1a1a] leading-none mt-1">
              {isLoading ? '—' : rejectCount}
            </p>
          </div>
          <div className="bg-[#ffdad6] text-[#93000a] px-3 py-1.5 rounded-full font-bold text-xs">
            REJECT
          </div>
        </motion.div>

        <motion.div
          className="bg-white border border-[#c3c6d1] p-6 rounded-xl shadow-sm flex justify-between items-center"
          variants={staggerItem}
          transition={staggerItemTransition}
          whileHover={{ y: -2 }}
        >
          <div>
            <p className="text-xs font-semibold text-[#43474f] uppercase tracking-wider">Warnings</p>
            <p className="text-[32px] font-semibold text-[#001e40] leading-none mt-1">
              {isLoading ? '—' : warnCount}
            </p>
          </div>
          <div className="bg-[#cee5ff] text-[#175683] px-3 py-1.5 rounded-full font-bold text-xs">
            WARN
          </div>
        </motion.div>

        <motion.div
          className="bg-white border border-[#c3c6d1] p-6 rounded-xl shadow-sm flex justify-between items-center"
          variants={staggerItem}
          transition={staggerItemTransition}
          whileHover={{ y: -2 }}
        >
          <div>
            <p className="text-xs font-semibold text-[#43474f] uppercase tracking-wider">Rejection Rate</p>
            <p className="text-[32px] font-semibold text-[#001e40] leading-none mt-1">
              {totalErrors > 0 ? `${Math.round((rejectCount / totalErrors) * 100)}%` : '—'}
            </p>
          </div>
          <div className="w-10 h-10 bg-[#eceef0] rounded-full flex items-center justify-center">
            <PieChart className="w-5 h-5 text-[#43474f]" />
          </div>
        </motion.div>
      </motion.div>

      {/* Actions Bar */}
      <div className="bg-[#f2f4f6] p-4 rounded-xl mb-6 flex flex-col lg:flex-row gap-6 items-center justify-between">
        <div className="flex flex-1 w-full lg:w-auto gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737780]" />
            <input
              type="text"
              placeholder="Search field names or error codes…"
              value={codeSearch}
              onChange={(e) => { setCodeSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-6 py-2 bg-white border border-[#737780] rounded-lg focus:ring-2 focus:ring-[#28628f] focus:outline-none text-base"
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="bg-white border border-[#737780] rounded-lg px-6 py-2 text-base min-w-[160px] outline-none focus:ring-1 focus:ring-[#28628f]"
          >
            <option value="">All Severities</option>
            <option value="REJECT">REJECT</option>
            <option value="WARN">WARN</option>
          </select>
        </div>
        <div className="flex gap-4 w-full lg:w-auto">
          <motion.button
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2 border-[1.5px] border-[#28628f] text-[#28628f] font-semibold text-sm rounded-lg hover:bg-[#cee5ff] transition-all"
            onClick={() => alert('CSV export coming soon')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={spring.crisp}
          >
            <Download className="w-4 h-4" />
            Download Errors (CSV)
          </motion.button>
          <motion.button
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-[#003366] text-white font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity"
            onClick={() => alert('Correction template coming soon')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={spring.crisp}
          >
            <FileText className="w-4 h-4" />
            Download Correction Template
          </motion.button>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <Alert variant="error" className="mb-6">
          Failed to load errors: {(error as Error)?.message ?? 'Unknown error'}
        </Alert>
      )}

      {/* Data Table */}
      <div className="bg-white border border-[#c3c6d1] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner />
              <span className="ml-3 text-[#43474f]">Loading errors…</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#e6e8ea] border-b-2 border-[#001e40]">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-[#001e40]">Row #</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[#001e40]">Field Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[#001e40]">Error Code</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[#001e40] text-center">Severity</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[#001e40]">Raw Value</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[#001e40]">Message</th>
                </tr>
              </thead>
              <motion.tbody
                className="text-sm"
                variants={staggerContainer(0.03)}
                initial="initial"
                animate="animate"
              >
                {errors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-[#43474f]">
                      No errors found with current filters.
                    </td>
                  </tr>
                ) : (
                  errors.map((err, idx) => (
                    <motion.tr
                      key={err.id ?? `${err.row_number}-${idx}`}
                      className={`border-b border-[#c3c6d1] hover:bg-[#eceef0] transition-colors ${idx % 2 === 1 ? 'bg-[#F1F5F9]' : ''}`}
                      variants={staggerItem}
                      transition={staggerItemTransition}
                    >
                      <td className="px-6 py-4 font-mono text-sm">{err.row_number}</td>
                      <td className="px-6 py-4 font-semibold">{err.field_name}</td>
                      <td className="px-6 py-4">
                        <motion.span
                          className="font-mono text-xs text-[#43474f]"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={spring.crisp}
                        >
                          {err.error_code}
                        </motion.span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <SeverityBadge severity={err.severity} />
                      </td>
                      <td className="px-6 py-4 font-mono text-xs italic max-w-[160px] truncate">
                        <span className={err.severity === 'REJECT' ? 'text-[#ba1a1a]' : 'text-[#43474f]'}>
                          {err.raw_value ?? '[NULL]'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#43474f] max-w-xs">{err.message}</td>
                    </motion.tr>
                  ))
                )}
              </motion.tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="px-6 py-4 bg-[#f2f4f6] flex flex-col md:flex-row justify-between items-center gap-6 border-t border-[#c3c6d1]">
            <span className="text-sm text-[#43474f]">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} errors
            </span>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-2 text-[#737780] hover:text-[#001e40] transition-colors disabled:opacity-30"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.crisp}
              >
                <ChevronsLeft className="w-5 h-5" />
              </motion.button>
              <motion.button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-[#737780] hover:text-[#001e40] transition-colors disabled:opacity-30"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.crisp}
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              <div className="flex items-center gap-2 px-4">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <motion.button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded text-sm font-semibold transition-colors ${
                        page === p
                          ? 'bg-[#001e40] text-white'
                          : 'text-[#43474f] hover:bg-[#e6e8ea]'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring.crisp}
                    >
                      {p}
                    </motion.button>
                  );
                })}
                {totalPages > 5 && (
                  <>
                    <span className="px-2 text-[#43474f]">…</span>
                    <motion.button
                      onClick={() => setPage(totalPages)}
                      className="w-8 h-8 flex items-center justify-center rounded text-sm font-semibold text-[#43474f] hover:bg-[#e6e8ea]"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring.crisp}
                    >
                      {totalPages}
                    </motion.button>
                  </>
                )}
              </div>
              <motion.button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-[#737780] hover:text-[#001e40] transition-colors disabled:opacity-30"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.crisp}
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
              <motion.button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-2 text-[#737780] hover:text-[#001e40] transition-colors disabled:opacity-30"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.crisp}
              >
                <ChevronsRight className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-[24px] font-semibold text-[#001e40]">Need Assistance with Corrections?</h3>
          <p className="text-[18px] text-[#43474f] leading-relaxed">
            Our automated validation engine has flagged inconsistencies that may affect credit reporting accuracy.
            Please refer to the technical specification guide or contact our data integration desk for high-volume
            correction strategies.
          </p>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-4 bg-[#e6e8ea] p-4 rounded-lg border border-[#c3c6d1] flex-1 min-w-[240px]">
              <BookOpen className="w-8 h-8 text-[#28628f]" />
              <div>
                <p className="text-xs font-semibold text-[#001e40]">Technical Specs</p>
                <p className="text-sm text-[#43474f]">V3.4 Schema Documentation</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-[#e6e8ea] p-4 rounded-lg border border-[#c3c6d1] flex-1 min-w-[240px]">
              <Headphones className="w-8 h-8 text-[#28628f]" />
              <div>
                <p className="text-xs font-semibold text-[#001e40]">Help Desk</p>
                <p className="text-sm text-[#43474f]">Speak to a Data Analyst</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
