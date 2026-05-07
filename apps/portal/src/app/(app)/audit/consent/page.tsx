'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Spinner } from '@/components/ui/Spinner';
import {
  spring, fadeUp, fadeUpTransition,
  staggerContainer, staggerItem, staggerItemTransition,
} from '@/lib/motion';

interface ConsentRecord {
  id: string;
  date: string;
  institutionName?: string;
  institutionId?: string;
  searchType?: string;
  maskedValue?: string;
  consentReference?: string;
  inquiryReason?: string;
  result?: string;
}

function ResultBadge({ result }: { result?: string }) {
  const r = result?.toUpperCase() ?? '';

  // Revoked / flagged gets a warning pulse
  if (r === 'FLAGGED' || r === 'FAILURE')
    return (
      <motion.span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200"
        animate={{ opacity: [1, 0.6, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        FLAGGED
      </motion.span>
    );

  if (r === 'MATCH' || r === 'SUCCESS')
    return (
      <motion.span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring.crisp}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
        MATCH
      </motion.span>
    );
  if (r === 'NO_MATCH' || r === 'NOT_FOUND')
    return (
      <motion.span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-outline-variant"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring.crisp}
      >
        NO MATCH
      </motion.span>
    );
  if (r === 'PENDING')
    return (
      <motion.span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring.crisp}
      >
        PENDING
      </motion.span>
    );
  return (
    <motion.span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={spring.crisp}
    >
      {result ?? '—'}
    </motion.span>
  );
}

export default function ConsentAuditPage() {
  const { hasRole } = useAuthStore();
  const isPlatformRole = hasRole(['SUPER_ADMIN', 'BUREAU_ADMIN', 'BUREAU_ANALYST', 'COMPLIANCE_OFFICER']);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ dateFrom: '', dateTo: '', institution: '' });

  const { data: institutionsData } = useQuery({
    queryKey: ['consent-institutions'],
    queryFn: () => api.get('/institutions?status=ACTIVE').then((r) => r.data),
    enabled: isPlatformRole,
  });

  const institutions: { id: string; name: string }[] = institutionsData?.data ?? institutionsData ?? [];

  const buildParams = () => {
    const params = new URLSearchParams();
    if (appliedFilters.dateFrom) params.set('dateFrom', appliedFilters.dateFrom);
    if (appliedFilters.dateTo) params.set('dateTo', appliedFilters.dateTo);
    if (appliedFilters.institution) params.set('institutionId', appliedFilters.institution);
    return params.toString();
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['consent-records', appliedFilters],
    queryFn: async () => {
      try {
        const res = await api.get(`/reports/consent?${buildParams()}`);
        return res.data;
      } catch (err: unknown) {
        const e = err as { response?: { status?: number } };
        if (e?.response?.status === 404 || e?.response?.status === 403) {
          return { data: [] };
        }
        throw err;
      }
    },
    retry: false,
  });

  const records: ConsentRecord[] = data?.data ?? data?.records ?? data ?? [];
  const isEmpty = !isLoading && (!records || (Array.isArray(records) && records.length === 0));

  const handleApply = () => {
    setAppliedFilters({ dateFrom, dateTo, institution: institutionFilter });
  };

  const handleReset = () => {
    setDateFrom('');
    setDateTo('');
    setInstitutionFilter('');
    setAppliedFilters({ dateFrom: '', dateTo: '', institution: '' });
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
          <h1 className="text-3xl font-bold text-primary">Inquiry &amp; Consent Audit</h1>
          <p className="text-outline mt-1">
            Monitoring institutional compliance and data access legitimacy.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={spring.crisp}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Regulatory Report
        </motion.button>
      </div>

      {/* Stats */}
      {!isEmpty && Array.isArray(records) && records.length > 0 && (
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          variants={staggerContainer(0.06)}
          initial="initial"
          animate="animate"
        >
          {[
            { label: 'Total Records', value: records.length, color: 'text-primary' },
            {
              label: 'Consent Match Rate',
              value:
                records.length > 0
                  ? `${Math.round(
                      (records.filter((r) => ['MATCH', 'SUCCESS'].includes(r.result?.toUpperCase() ?? '')).length /
                        records.length) *
                        100
                    )}%`
                  : '—',
              color: 'text-green-700',
            },
            {
              label: 'Flagged',
              value: records.filter((r) => ['FLAGGED', 'FAILURE'].includes(r.result?.toUpperCase() ?? '')).length,
              color: 'text-red-600',
            },
            { label: 'Audit Coverage', value: '100%', color: 'text-secondary' },
          ].map(({ label, value, color }) => (
            <motion.div
              key={label}
              variants={staggerItem}
              transition={staggerItemTransition}
              className="bg-white border border-outline-variant rounded-xl p-4 shadow-sm"
            >
              <p className="text-xs font-semibold text-outline uppercase mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        className="bg-white border border-outline-variant rounded-xl shadow-sm p-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.soft, delay: 0.1 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-outline uppercase mb-1">Date Range</label>
            <div className="flex gap-1">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-outline-variant rounded px-2 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
              />
              <span className="self-center text-outline text-xs">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-outline-variant rounded px-2 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
          </div>

          {isPlatformRole && (
            <div>
              <label className="block text-xs font-semibold text-outline uppercase mb-1">Institution</label>
              <select
                value={institutionFilter}
                onChange={(e) => setInstitutionFilter(e.target.value)}
                className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
              >
                <option value="">All Institutions</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={`flex gap-2 ${isPlatformRole ? '' : 'col-span-3'}`}>
            <motion.button
              onClick={handleReset}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.crisp}
              className="flex-1 px-3 py-2 border border-outline-variant text-sm font-semibold text-outline rounded hover:bg-surface-container-low transition-colors"
            >
              Reset
            </motion.button>
            <motion.button
              onClick={handleApply}
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

      {/* Main table */}
      <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">Consent Audit Records</h2>
          {Array.isArray(records) && (
            <span className="text-xs text-outline">{records.length} records</span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-outline">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-semibold">Could not load consent records</p>
            <p className="text-sm mt-1">The consent audit endpoint may not be available.</p>
          </div>
        ) : isEmpty ? (
          <div className="text-center py-16 text-outline">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="font-semibold">No consent records found</p>
            <p className="text-sm mt-1">
              Try adjusting your date range or institution filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-surface-container-high border-b-2 border-primary-container">
                <tr>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Date</th>
                  {isPlatformRole && (
                    <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Institution</th>
                  )}
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Search Type</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Masked Value</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Consent Reference</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Inquiry Reason</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase text-center">Result</th>
                </tr>
              </thead>
              <motion.tbody
                className="divide-y divide-outline-variant"
                variants={staggerContainer(0.035)}
                initial="initial"
                animate="animate"
              >
                {records.map((record, idx) => (
                  <motion.tr
                    key={record.id}
                    variants={staggerItem}
                    transition={staggerItemTransition}
                    className={`hover:bg-secondary-container/10 transition-colors ${idx % 2 === 1 ? 'bg-slate-50' : ''}`}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-outline whitespace-nowrap">
                      {new Date(record.date).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    {isPlatformRole && (
                      <td className="px-5 py-3 font-semibold text-on-surface text-sm">
                        {record.institutionName ?? '—'}
                      </td>
                    )}
                    <td className="px-5 py-3 text-on-surface">{record.searchType ?? '—'}</td>
                    <td className="px-5 py-3 font-mono text-sm tracking-widest text-on-surface">
                      {record.maskedValue ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-secondary font-mono text-xs">
                      {record.consentReference ?? (
                        <span className="text-red-600 font-bold">MISSING</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-on-surface">{record.inquiryReason ?? '—'}</td>
                    <td className="px-5 py-3 text-center">
                      <ResultBadge result={record.result} />
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
