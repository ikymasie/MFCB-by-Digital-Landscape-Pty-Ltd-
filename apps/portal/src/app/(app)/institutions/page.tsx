'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Download, ChevronLeft, ChevronRight, Building2, Eye, Pencil, Ban, CheckCircle } from '@/lib/icons';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  spring, fadeUp, fadeUpTransition, staggerContainer, staggerItem, staggerItemTransition,
} from '@/lib/motion';
import { AnimatedBar } from '@/components/motion/AnimatedBar';

interface Institution {
  institution_id: string;
  name: string;
  supplier_reference_number: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  integration_channel: string;
  enabled_products: string[];
  onboarded_at: string | null;
  created_at: string;
}

interface InstitutionsResponse {
  data: Institution[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-600', label: 'Active' },
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-600', label: 'Pending' },
  SUSPENDED: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-600', label: 'Suspended' },
  DEACTIVATED: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500', label: 'Deactivated' },
};

export default function InstitutionsPage() {
  const router = useRouter();
  const { hasPermission } = useAuthStore();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, error } = useQuery<InstitutionsResponse>({
    queryKey: ['institutions', search, status, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      params.set('page', String(page));
      params.set('limit', String(limit));
      const res = await api.get(`/institutions?${params.toString()}`);
      return res.data;
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;
  const institutions = data?.data ?? [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      <motion.main
        variants={fadeUp}
        initial="initial"
        animate="animate"
        transition={fadeUpTransition}
        className="container mx-auto px-6 py-12 max-w-[1280px]"
      >
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h1 className="text-[40px] leading-[1.2] font-bold text-[#001e40] tracking-tight mb-2">
              Institution Registry
            </h1>
            <p className="text-base text-[#43474f] max-w-2xl">
              Manage and monitor participating financial institutions. Ensure regulatory compliance
              and manage product-level data submission permissions across the Botswana credit ecosystem.
            </p>
          </div>
          <div className="flex gap-4 flex-shrink-0">
            {hasPermission('institutions:create') && (
              <motion.button
                onClick={() => router.push('/institutions/new')}
                whileHover={{ scale: 1.03, boxShadow: '0 4px 20px rgba(0,30,64,0.3)' }}
                whileTap={{ scale: 0.97 }}
                transition={spring.crisp}
                className="bg-[#003366] text-white px-6 py-3 rounded font-semibold text-sm flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                <Plus className="h-4 w-4" />
                New Institution
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.crisp}
              className="bg-[#e6e8ea] border border-[#c3c6d1] text-[#191c1e] px-6 py-3 rounded font-semibold text-sm flex items-center gap-2 hover:bg-[#e0e3e5] transition-all"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </motion.button>
          </div>
        </div>

        {/* Controls / Filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.1 }}
          className="bg-white rounded-xl border border-[#c3c6d1] p-6 shadow-sm mb-6"
        >
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-end gap-6">
            <div className="flex-grow min-w-[300px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#737780]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by institution name or SRN..."
                className="w-full pl-12 pr-4 py-3 border border-[#737780] rounded-lg bg-[#f7f9fb] focus:ring-2 focus:ring-[#97ccfe] focus:border-[#28628f] transition-all text-base outline-none"
              />
            </div>
            <div className="flex items-end gap-4">
              <div className="flex flex-col">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737780] mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="border border-[#737780] rounded-lg py-3 px-4 bg-[#f7f9fb] text-base focus:ring-2 focus:ring-[#97ccfe] outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="DEACTIVATED">Deactivated</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-[#001e40] text-white px-12 py-3 rounded font-semibold text-sm hover:bg-[#28628f] transition-all"
              >
                Apply Filters
              </button>
            </div>
          </form>
        </motion.div>

        {/* Main Content: Data Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.2 }}
          className="bg-white rounded-xl border border-[#c3c6d1] shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f2f4f6] border-b-2 border-[#003366]">
                  <th className="px-6 py-6 text-left text-sm font-semibold text-[#001e40] uppercase tracking-wider">
                    Institution Name
                  </th>
                  <th className="px-6 py-6 text-left text-sm font-semibold text-[#001e40] uppercase tracking-wider">
                    SRN
                  </th>
                  <th className="px-6 py-6 text-left text-sm font-semibold text-[#001e40] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-6 text-left text-sm font-semibold text-[#001e40] uppercase tracking-wider">
                    Integration Channel
                  </th>
                  <th className="px-6 py-6 text-left text-sm font-semibold text-[#001e40] uppercase tracking-wider">
                    Onboarded At
                  </th>
                  <th className="px-6 py-6 text-right text-sm font-semibold text-[#001e40] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <motion.tbody
                variants={staggerContainer(0.04)}
                initial="initial"
                animate="animate"
                className="divide-y divide-[#c3c6d1]"
              >
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex items-center justify-center gap-3 text-[#43474f]">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading institutions...
                      </div>
                    </td>
                  </tr>
                )}
                {isError && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                        <p className="text-sm text-red-700">
                          Failed to load institutions.{' '}
                          {(error as { message?: string })?.message ?? 'Please try again.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && institutions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-[#43474f]">
                        <motion.div
                          animate={{ y: [0, -6, 0] }}
                          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                        >
                          <Building2 className="h-10 w-10 text-[#737780]" />
                        </motion.div>
                        <p className="text-base">No institutions found.</p>
                        {hasPermission('institutions:create') && (
                          <button
                            onClick={() => router.push('/institutions/new')}
                            className="text-sm text-[#28628f] hover:underline font-medium"
                          >
                            Add the first institution
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {institutions.map((inst, idx) => {
                  const s = STATUS_STYLES[inst.status] ?? STATUS_STYLES.DEACTIVATED;
                  return (
                    <motion.tr
                      key={inst.institution_id}
                      variants={staggerItem}
                      transition={staggerItemTransition}
                      whileHover={{ backgroundColor: '#eceef0' }}
                      className={`transition-colors cursor-pointer ${idx % 2 === 1 ? 'bg-[#f2f4f6]' : ''}`}
                      onClick={() => router.push(`/institutions/${inst.institution_id}`)}
                    >
                      <td className="px-6 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#001e40]">{inst.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-sm text-[#43474f] font-medium">
                        {inst.supplier_reference_number}
                      </td>
                      <td className="px-6 py-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full ${s.bg} ${s.text} text-xs font-bold`}>
                          {inst.status === 'ACTIVE' ? (
                            <motion.span
                              animate={{ opacity: [1, 0.4, 1] }}
                              transition={{ duration: 1.8, repeat: Infinity }}
                              className={`w-1.5 h-1.5 rounded-full ${s.dot} mr-2`}
                            />
                          ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot} mr-2`} />
                          )}
                          {s.label}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-sm text-[#43474f]">
                        {inst.integration_channel?.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-6 text-sm text-[#43474f]">
                        {inst.onboarded_at
                          ? new Date(inst.onboarded_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <motion.button
                            title="View Details"
                            onClick={() => router.push(`/institutions/${inst.institution_id}`)}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            transition={spring.crisp}
                            className="text-[#28628f] hover:text-[#001e40] p-1 rounded hover:bg-[#cee5ff] transition-all"
                          >
                            <Eye className="h-4 w-4" />
                          </motion.button>
                          {hasPermission('institutions:edit') && (
                            <motion.button
                              title="Edit"
                              onClick={() => router.push(`/institutions/${inst.institution_id}`)}
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              transition={spring.crisp}
                              className="text-[#28628f] hover:text-[#001e40] p-1 rounded hover:bg-[#cee5ff] transition-all"
                            >
                              <Pencil className="h-4 w-4" />
                            </motion.button>
                          )}
                          {hasPermission('institutions:suspend') && inst.status === 'ACTIVE' && (
                            <motion.button
                              title="Suspend"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              transition={spring.crisp}
                              className="text-[#ba1a1a] hover:bg-[#ffdad6] p-1 rounded transition-all"
                            >
                              <Ban className="h-4 w-4" />
                            </motion.button>
                          )}
                          {hasPermission('institutions:edit') && inst.status === 'SUSPENDED' && (
                            <motion.button
                              title="Activate"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              transition={spring.crisp}
                              className="text-[#001e40] hover:bg-[#d5e3ff] p-1 rounded transition-all"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </motion.button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && data && (
            <div className="px-6 py-3 bg-[#e6e8ea] flex justify-between items-center">
              <span className="text-sm text-[#43474f]">
                Showing {Math.min((page - 1) * limit + 1, data.total)}–{Math.min(page * limit, data.total)} of{' '}
                {data.total} institutions
              </span>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={spring.crisp}
                  className="p-2 border border-[#c3c6d1] rounded bg-white disabled:opacity-40 hover:bg-[#eceef0] transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </motion.button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <motion.button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={spring.crisp}
                      className={`px-3 py-1.5 border rounded text-xs font-bold transition-colors ${
                        page === pageNum
                          ? 'border-[#001e40] bg-[#001e40] text-white'
                          : 'border-[#c3c6d1] bg-white text-[#191c1e] hover:bg-[#eceef0]'
                      }`}
                    >
                      {pageNum}
                    </motion.button>
                  );
                })}
                <motion.button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={spring.crisp}
                  className="p-2 border border-[#c3c6d1] rounded bg-white disabled:opacity-40 hover:bg-[#eceef0] transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Stats Bento */}
        {data && (
          <motion.div
            variants={staggerContainer(0.06)}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12"
          >
            <motion.div
              variants={staggerItem}
              transition={staggerItemTransition}
              className="bg-[#003366] text-[#799dd6] p-6 rounded-xl shadow-sm border border-[#001e40]"
            >
              <h3 className="text-xs font-semibold uppercase opacity-70 mb-2">Active Registry</h3>
              <p className="text-4xl font-bold text-white mb-1">
                {institutions.filter((i) => i.status === 'ACTIVE').length}
              </p>
              <p className="text-xs">From current page</p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              transition={staggerItemTransition}
              className="bg-white p-6 rounded-xl shadow-sm border border-[#c3c6d1]"
            >
              <h3 className="text-xs font-semibold uppercase text-[#737780] mb-2">Total Institutions</h3>
              <p className="text-4xl font-bold text-[#001e40] mb-1">{data.total}</p>
              <div className="w-full bg-[#eceef0] h-1.5 rounded-full overflow-hidden mt-2">
                <AnimatedBar pct={100} className="bg-[#28628f] h-full" />
              </div>
            </motion.div>
            <motion.div
              variants={staggerItem}
              transition={staggerItemTransition}
              className="bg-white p-6 rounded-xl shadow-sm border border-[#c3c6d1]"
            >
              <h3 className="text-xs font-semibold uppercase text-[#737780] mb-2">Pending Approvals</h3>
              <p className="text-4xl font-bold text-[#001e40] mb-1">
                {institutions.filter((i) => i.status === 'PENDING').length}
              </p>
              <p className="text-xs font-bold text-[#28628f]">Action Required</p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              transition={staggerItemTransition}
              whileHover={{ scale: 1.02 }}
              className="bg-[#ffdad6] p-6 rounded-xl shadow-sm border border-[#ba1a1a]"
            >
              <h3 className="text-xs font-semibold uppercase text-[#93000a] opacity-70 mb-2">
                Suspended Entities
              </h3>
              <p className="text-4xl font-bold text-[#93000a] mb-1">
                {institutions.filter((i) => i.status === 'SUSPENDED').length}
              </p>
              <p className="text-xs text-[#93000a]">Review required</p>
            </motion.div>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
}
