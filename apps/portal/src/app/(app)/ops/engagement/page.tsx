'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { AnimatedBar } from '@/components/motion/AnimatedBar';
import {
  fadeUp,
  fadeUpTransition,
  staggerContainer,
  staggerItem,
  staggerItemTransition,
} from '@/lib/motion';

interface Institution {
  id: string;
  name: string;
  srn?: string;
  integrationChannel?: string;
  lastBatchDate?: string;
  batchesThisYear?: number;
  status: string;
}

type EngagementStatus = 'Active' | 'Inactive' | 'Overdue';

function getEngagementStatus(institution: Institution): EngagementStatus {
  if (!institution.lastBatchDate) return 'Inactive';
  const daysSince =
    (Date.now() - new Date(institution.lastBatchDate).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > 60) return 'Inactive';
  if (daysSince > 30) return 'Overdue';
  return 'Active';
}

function EngagementBadge({ status }: { status: EngagementStatus }) {
  const styles =
    status === 'Active'
      ? 'bg-green-100 text-green-800'
      : status === 'Overdue'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-red-100 text-red-800';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'Active' ? 'bg-green-600' : status === 'Overdue' ? 'bg-yellow-600' : 'bg-red-600'
        }`}
      />
      {status}
    </span>
  );
}

function ChannelBadge({ channel }: { channel?: string }) {
  if (!channel) return <span className="text-outline text-xs">—</span>;
  const styles =
    channel === 'REST_API'
      ? 'bg-blue-100 text-blue-800'
      : channel === 'PORTAL_UPLOAD'
      ? 'bg-purple-100 text-purple-800'
      : channel === 'SFTP'
      ? 'bg-orange-100 text-orange-800'
      : 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${styles}`}>
      {channel.replace(/_/g, ' ')}
    </span>
  );
}

export default function EngagementPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['institutions-active'],
    queryFn: () => api.get('/institutions?status=ACTIVE').then((r) => r.data),
    staleTime: 60000,
  });

  const institutions: Institution[] = data?.data ?? data ?? [];

  const { activeCount, submittingThisMonth, inactiveCount } = useMemo(() => {
    if (!Array.isArray(institutions))
      return { activeCount: 0, submittingThisMonth: 0, inactiveCount: 0 };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      activeCount: institutions.length,
      submittingThisMonth: institutions.filter(
        (inst) => inst.lastBatchDate && new Date(inst.lastBatchDate) >= startOfMonth
      ).length,
      inactiveCount: institutions.filter((inst) => getEngagementStatus(inst) === 'Inactive').length,
    };
  }, [institutions]);

  return (
    <motion.div
      className="p-6 max-w-7xl mx-auto space-y-8"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">Institution Engagement</h1>
        <p className="text-sm text-outline mt-1">
          Monitor submission activity and engagement health across all active institutions.
        </p>
      </div>

      {/* Summary Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        variants={staggerContainer(0.07)}
        initial="initial"
        animate="animate"
      >
        <motion.div
          variants={staggerItem}
          transition={staggerItemTransition}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-outline uppercase mb-1">Total Active Institutions</p>
            <p className="text-4xl font-bold text-primary">
              {isLoading ? <Spinner size="sm" /> : activeCount}
            </p>
          </div>
          <div className="p-3 bg-secondary-container/20 rounded-lg">
            <svg className="w-8 h-8 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </motion.div>

        <motion.div
          variants={staggerItem}
          transition={staggerItemTransition}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-outline uppercase mb-1">Submitting This Month</p>
            <p className="text-4xl font-bold text-green-700">
              {isLoading ? <Spinner size="sm" /> : submittingThisMonth}
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <svg className="w-8 h-8 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </motion.div>

        <motion.div
          variants={staggerItem}
          transition={staggerItemTransition}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-outline uppercase mb-1">Inactive Institutions</p>
            <p className={`text-4xl font-bold ${inactiveCount > 0 ? 'text-red-600' : 'text-green-700'}`}>
              {isLoading ? <Spinner size="sm" /> : inactiveCount}
            </p>
            <p className="text-xs text-outline mt-1">No batch in last 60 days</p>
          </div>
          <div className={`p-3 rounded-lg ${inactiveCount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <svg
              className={`w-8 h-8 ${inactiveCount > 0 ? 'text-red-600' : 'text-green-700'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </motion.div>
      </motion.div>

      {/* Engagement Table */}
      <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant">
          <h2 className="text-lg font-semibold text-primary">Institution Engagement Overview</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="font-semibold text-red-600">Failed to load institutions.</p>
          </div>
        ) : institutions.length === 0 ? (
          <div className="text-center py-16 text-outline">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
            <p className="font-semibold">No active institutions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-surface-container-high border-b-2 border-primary-container">
                <tr>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Institution Name</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">SRN</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Integration Channel</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Last Batch Date</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase text-right">Batches This Year</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase text-center">Engagement Status</th>
                </tr>
              </thead>
              <motion.tbody
                className="divide-y divide-outline-variant"
                variants={staggerContainer(0.03)}
                initial="initial"
                animate="animate"
              >
                {institutions.map((inst, idx) => {
                  const engagementStatus = getEngagementStatus(inst);
                  return (
                    <motion.tr
                      key={inst.id}
                      variants={staggerItem}
                      transition={staggerItemTransition}
                      className={`hover:bg-surface-container transition-colors ${idx % 2 === 1 ? 'bg-slate-50' : ''}`}
                    >
                      <td className="px-5 py-4 font-semibold text-on-surface">{inst.name}</td>
                      <td className="px-5 py-4 text-outline font-mono text-xs">{inst.srn ?? '—'}</td>
                      <td className="px-5 py-4">
                        <ChannelBadge channel={inst.integrationChannel} />
                      </td>
                      <td className="px-5 py-4 text-outline">
                        {inst.lastBatchDate
                          ? new Date(inst.lastBatchDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : <span className="text-red-500 font-semibold">Never</span>}
                      </td>
                      <td className="px-5 py-4 text-right font-mono">
                        {inst.batchesThisYear ?? '—'}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <EngagementBadge status={engagementStatus} />
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
