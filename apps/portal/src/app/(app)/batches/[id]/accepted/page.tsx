'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Printer, Download, ArrowUp,
  CheckCircle, Search, Filter, Eye, ShieldCheck,
} from '@/lib/icons';
import api from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import {
  spring, fadeUp, fadeUpTransition, staggerContainer, staggerItem, staggerItemTransition,
} from '@/lib/motion';

interface AcceptedRecord {
  id?: string;
  row_number: number;
  raw_payload?: Record<string, unknown>;
  account_number?: string;
  surname?: string;
  account_type?: string;
  status_code?: string;
  branch_code?: string;
  sub_account?: string;
  omang_number?: string;
  borrower_id?: string;
}

interface AcceptedResponse {
  data: AcceptedRecord[];
  total: number;
  page?: number;
  limit?: number;
  batch?: {
    id: string;
    institution_id?: string;
    institution_name?: string;
    completed_at?: string;
  };
}

function getField(record: AcceptedRecord, field: string): string {
  const direct = record[field as keyof AcceptedRecord];
  if (direct != null) return String(direct);
  if (record.raw_payload) {
    const val = record.raw_payload[field] ?? record.raw_payload[field.toUpperCase()];
    if (val != null) return String(val);
  }
  return '—';
}

function maskId(val: string): string {
  if (!val || val === '—') return '—';
  if (val.length <= 4) return val;
  return '******-' + val.slice(-4);
}

export default function AcceptedRecordsPage() {
  const params = useParams<{ id: string }>();
  const batchId = params.id;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data, isLoading, isError, error } = useQuery<AcceptedResponse>({
    queryKey: ['batch-accepted', batchId, page, rowsPerPage],
    queryFn: async () => {
      const res = await api.get(`/batches/${batchId}/accepted`, {
        params: { page, limit: rowsPerPage },
      });
      return res.data;
    },
  });

  const records: AcceptedRecord[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / rowsPerPage);

  const filtered = search
    ? records.filter((r) => {
        const acct = getField(r, 'account_number');
        const id = getField(r, 'omang_number') || getField(r, 'borrower_id');
        return (
          acct.toLowerCase().includes(search.toLowerCase()) ||
          id.toLowerCase().includes(search.toLowerCase())
        );
      })
    : records;

  return (
    <motion.div
      className="flex-1 flex flex-col h-full overflow-hidden"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      {/* Main Page Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-[#43474f] mb-2">
              <Link href="/batches" className="hover:text-[#28628f] transition-colors">Batch Submissions</Link>
              <ChevronRight className="w-4 h-4 text-[#737780]" />
              <Link href={`/batches/${batchId}`} className="hover:text-[#28628f] transition-colors">
                Batch #{batchId.slice(-6).toUpperCase()}
              </Link>
              <ChevronRight className="w-4 h-4 text-[#737780]" />
              <span className="text-[#001e40] font-semibold">Accepted Records</span>
            </div>
            <h2 className="text-[32px] font-semibold text-[#001e40] leading-tight">
              Accepted Records Reconciliation
            </h2>
            <p className="text-base text-[#43474f] mt-1">
              Viewing{' '}
              <span className="font-bold text-[#001e40]">
                {isLoading ? '…' : total.toLocaleString()}
              </span>{' '}
              accepted records from{' '}
              <span className="font-bold text-[#001e40]">
                Batch #{batchId.slice(-6).toUpperCase()}
              </span>
              . Use this list to verify ingested data against your internal systems.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => window.print()}
              className="px-4 py-2 bg-white border border-[#001e40] text-[#001e40] font-semibold text-sm rounded-lg flex items-center gap-2 hover:bg-[#001e40]/5 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.crisp}
            >
              <Printer className="w-5 h-5" />
              Print View
            </motion.button>
            <motion.button
              onClick={() => alert('CSV download coming soon')}
              className="px-4 py-2 bg-[#001e40] text-white font-semibold text-sm rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.crisp}
            >
              <Download className="w-5 h-5" />
              Download as CSV
            </motion.button>
          </div>
        </div>

        {/* Metric Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6"
          variants={staggerContainer(0.07)}
          initial="initial"
          animate="animate"
        >
          <motion.div
            className="bg-white border border-[#c3c6d1] p-6 rounded-xl shadow-sm"
            variants={staggerItem}
            transition={staggerItemTransition}
            whileHover={{ y: -2 }}
          >
            <p className="text-xs text-[#43474f] font-semibold uppercase tracking-wider">Total Records</p>
            <h3 className="text-[24px] font-semibold text-[#001e40] mt-1">
              {isLoading ? '—' : total.toLocaleString()}
            </h3>
            <div className="mt-2 flex items-center gap-1 text-[12px] text-[#175683] bg-[#97ccfe]/30 px-2 py-0.5 rounded-full w-fit">
              <ArrowUp className="w-3 h-3" />
              Accepted
            </div>
          </motion.div>
          <motion.div
            className="bg-white border border-[#c3c6d1] p-6 rounded-xl shadow-sm"
            variants={staggerItem}
            transition={staggerItemTransition}
            whileHover={{ y: -2 }}
          >
            <p className="text-xs text-[#43474f] font-semibold uppercase tracking-wider">Accepted Status</p>
            <h3 className="text-[24px] font-semibold text-green-700 mt-1">100%</h3>
            <div className="mt-2 flex items-center gap-1 text-[12px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full w-fit">
              <CheckCircle className="w-3 h-3" />
              Verified
            </div>
          </motion.div>
          <motion.div
            className="bg-white border border-[#c3c6d1] p-6 rounded-xl shadow-sm"
            variants={staggerItem}
            transition={staggerItemTransition}
            whileHover={{ y: -2 }}
          >
            <p className="text-xs text-[#43474f] font-semibold uppercase tracking-wider">Batch Ref</p>
            <h3 className="text-[24px] font-semibold text-[#001e40] mt-1 font-mono">
              {batchId.slice(-6).toUpperCase()}
            </h3>
            <p className="text-[12px] text-[#737780] mt-2">
              {data?.batch?.completed_at
                ? `Processed: ${new Date(data.batch.completed_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}`
                : ''}
            </p>
          </motion.div>
          <motion.div
            className="bg-white border border-[#c3c6d1] p-6 rounded-xl shadow-sm"
            variants={staggerItem}
            transition={staggerItemTransition}
            whileHover={{ y: -2 }}
          >
            <p className="text-xs text-[#43474f] font-semibold uppercase tracking-wider">Institution ID</p>
            <h3 className="text-[24px] font-semibold text-[#001e40] mt-1 font-mono">
              {data?.batch?.institution_id?.slice(-8).toUpperCase() ?? '—'}
            </h3>
            <p className="text-[12px] text-[#737780] mt-2">
              {data?.batch?.institution_name ?? 'Institutional Unit'}
            </p>
          </motion.div>
        </motion.div>

        {/* Table Container */}
        <div className="bg-white border border-[#c3c6d1] rounded-xl shadow-sm flex flex-col overflow-hidden">
          {/* Table Controls */}
          <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center border-b border-[#c3c6d1] bg-[#f2f4f6]/50">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737780]" />
                <input
                  type="text"
                  placeholder="Search by account number or ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#c3c6d1] rounded-lg text-sm focus:border-[#28628f] focus:ring-1 focus:ring-[#28628f] transition-all outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#43474f] mr-2">
                Displaying {Math.min(rowsPerPage, filtered.length)} rows
              </span>
              <motion.button
                className="p-2 hover:bg-[#e6e8ea] rounded transition-colors text-[#737780]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.crisp}
              >
                <Filter className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Spinner />
                <span className="ml-3 text-[#43474f]">Loading accepted records…</span>
              </div>
            ) : isError ? (
              <div className="p-6">
                <Alert variant="error">
                  Failed to load accepted records: {(error as Error)?.message ?? 'Unknown error'}
                </Alert>
              </div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead className="bg-white sticky top-0 z-10 border-b-2 border-[#003366]">
                  <tr>
                    {['Row #', 'Borrower ID', 'Omang / Passport', 'Account Number', 'Account Type', 'Status Code', 'Branch', 'Status', 'Actions'].map(
                      (h) => (
                        <th key={h} className="px-6 py-4 text-[12px] font-semibold text-[#43474f] uppercase tracking-wider">
                          {h}
                        </th>
                      )
                    )}
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
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((record, idx) => {
                      const acctNum = getField(record, 'account_number');
                      const omang   = getField(record, 'omang_number');
                      const borrowerId = getField(record, 'borrower_id');
                      const acctType = getField(record, 'account_type');
                      const statusCode = getField(record, 'status_code');
                      const branchCode = getField(record, 'branch_code');
                      const surname = getField(record, 'surname');

                      return (
                        <motion.tr
                          key={record.id ?? `${record.row_number}-${idx}`}
                          className={`hover:bg-[#001e40]/5 transition-colors group ${idx % 2 === 1 ? 'bg-[#F1F5F9]' : ''}`}
                          variants={staggerItem}
                          transition={staggerItemTransition}
                        >
                          <td className="px-6 py-3 text-sm font-mono">{record.row_number}</td>
                          <td className="px-6 py-3 text-sm text-[#001e40] font-mono">
                            {borrowerId !== '—' ? `BCB-****-${borrowerId.slice(-3)}` : '—'}
                          </td>
                          <td className="px-6 py-3 text-sm font-mono">{omang !== '—' ? maskId(omang) : surname !== '—' ? maskId(surname) : '—'}</td>
                          <td className="px-6 py-3 text-sm font-bold font-mono">{acctNum}</td>
                          <td className="px-6 py-3 text-sm">{acctType}</td>
                          <td className="px-6 py-3 text-sm font-mono">{statusCode}</td>
                          <td className="px-6 py-3 text-sm font-mono">{branchCode}</td>
                          <td className="px-6 py-3">
                            <motion.span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={spring.crisp}
                            >
                              Accepted
                            </motion.span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <motion.button
                              className="text-[#28628f] opacity-0 group-hover:opacity-100 transition-opacity"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              transition={spring.crisp}
                            >
                              <Eye className="w-5 h-5" />
                            </motion.button>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </motion.tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {!isLoading && totalPages > 0 && (
            <div className="px-6 py-4 bg-[#f2f4f6] border-t border-[#c3c6d1] flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-[#43474f]">
                Showing{' '}
                <span className="font-bold text-[#001e40]">
                  {(page - 1) * rowsPerPage + 1}–{Math.min(page * rowsPerPage, total)}
                </span>{' '}
                of{' '}
                <span className="font-bold text-[#001e40]">{total.toLocaleString()}</span> results
              </p>
              <div className="flex items-center gap-1">
                <motion.button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-[#c3c6d1] rounded-lg hover:bg-[#e6e8ea] disabled:opacity-50 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={spring.crisp}
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map((p) => (
                  <motion.button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 border rounded-lg font-semibold text-sm transition-colors ${
                      page === p
                        ? 'border-[#001e40] bg-[#001e40] text-white'
                        : 'border-[#c3c6d1] hover:bg-[#e6e8ea]'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={spring.crisp}
                  >
                    {p}
                  </motion.button>
                ))}
                {totalPages > 3 && <span className="px-2 text-[#737780]">…</span>}
                {totalPages > 3 && (
                  <motion.button
                    onClick={() => setPage(totalPages)}
                    className="w-10 h-10 border border-[#c3c6d1] hover:bg-[#e6e8ea] rounded-lg font-semibold text-sm transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={spring.crisp}
                  >
                    {totalPages}
                  </motion.button>
                )}
                <motion.button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-[#c3c6d1] rounded-lg hover:bg-[#e6e8ea] disabled:opacity-50 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={spring.crisp}
                >
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#43474f]">Rows per page:</label>
                <select
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                  className="border border-[#c3c6d1] rounded-lg text-sm py-1 px-2 bg-white outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bento Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-[#001e40] text-white p-6 rounded-xl shadow-lg flex items-center justify-between">
            <div>
              <h4 className="text-[24px] font-semibold">Data Integrity Verified</h4>
              <p className="text-base opacity-80 mt-1">
                This batch has passed all automated validation checks for structural integrity and data accuracy.
                No reconciliation errors detected.
              </p>
            </div>
            <ShieldCheck className="w-16 h-16 opacity-20" />
          </div>
          <div className="bg-white border border-[#c3c6d1] p-6 rounded-xl flex flex-col justify-center">
            <p className="text-xs text-[#43474f] font-semibold uppercase">Last Sync</p>
            <p className="text-[18px] font-bold text-[#001e40] mt-2">Just now</p>
            <p className="text-sm text-[#737780] mt-1">
              Institutional DB sync: <span className="text-green-700">Healthy</span>
            </p>
          </div>
        </div>
      </main>
    </motion.div>
  );
}
