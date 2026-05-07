'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Badge, statusToBadgeVariant } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import {
  spring,
  fadeUp,
  fadeUpTransition,
  staggerContainer,
  staggerItem,
  staggerItemTransition,
} from '@/lib/motion';

interface Batch {
  id: string;
  batchRef: string;
  status: string;
  institutionName?: string;
  channel?: string;
  createdAt: string;
  recordCount?: number;
}

interface Institution {
  id: string;
  name: string;
  status: string;
}

function StatCard({
  label,
  value,
  icon,
  variant = 'default',
}: {
  label: string;
  value: React.ReactNode;
  icon?: string;
  variant?: 'default' | 'error' | 'success';
}) {
  const bg =
    variant === 'error'
      ? 'bg-red-50 border-red-200'
      : variant === 'success'
      ? 'bg-green-50 border-green-200'
      : 'bg-white border-outline-variant';

  return (
    <div className={`${bg} border rounded-lg p-4 shadow-sm flex flex-col gap-1`}>
      <p className="text-xs font-semibold text-outline uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold ${variant === 'error' ? 'text-red-700' : variant === 'success' ? 'text-green-700' : 'text-primary'}`}>
        {value}
      </p>
    </div>
  );
}

export default function OpsHomePage() {
  const { data: activeBatchesData, isLoading: loadingBatches } = useQuery({
    queryKey: ['ops-active-batches'],
    queryFn: () => api.get('/batches?status=VALIDATING&limit=100').then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: institutionsData, isLoading: loadingInstitutions } = useQuery({
    queryKey: ['ops-institutions'],
    queryFn: () => api.get('/institutions?status=ACTIVE').then((r) => r.data),
  });

  const { data: failedBatchesData, isLoading: loadingFailed } = useQuery({
    queryKey: ['ops-failed-batches'],
    queryFn: () =>
      api.get('/batches?status=FAILED,QUARANTINED&limit=10').then((r) => r.data),
    refetchInterval: 30000,
  });

  const activeBatches: Batch[] = activeBatchesData?.data ?? activeBatchesData ?? [];
  const institutions: Institution[] = institutionsData?.data ?? institutionsData ?? [];
  const failedBatches: Batch[] = failedBatchesData?.data ?? failedBatchesData ?? [];

  const activeBatchCount = Array.isArray(activeBatches) ? activeBatches.length : 0;
  const institutionCount = Array.isArray(institutions) ? institutions.length : 0;

  return (
    <motion.div
      className="p-6 max-w-7xl mx-auto space-y-8"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Operations Dashboard</h1>
          <p className="text-sm text-outline mt-1">Central Credit Repository — MFCB Operations</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <motion.span
              className="absolute inline-flex h-full w-full rounded-full bg-green-400"
              animate={{ scale: [1, 2.2, 1], opacity: [0.8, 0, 0.8] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs font-semibold text-green-700">System Active</span>
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        variants={staggerContainer(0.05)}
        initial="initial"
        animate="animate"
      >
        <motion.div
          variants={staggerItem}
          transition={staggerItemTransition}
          whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
        >
          <StatCard
            label="Active Batches"
            value={loadingBatches ? <Spinner size="sm" /> : activeBatchCount}
          />
        </motion.div>
        <motion.div
          variants={staggerItem}
          transition={staggerItemTransition}
          whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
        >
          <StatCard
            label="Processing Queue"
            value={loadingBatches ? <Spinner size="sm" /> : activeBatchCount}
            variant="default"
          />
        </motion.div>
        <motion.div
          variants={staggerItem}
          transition={staggerItemTransition}
          whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
        >
          <StatCard
            label="Total Institutions"
            value={loadingInstitutions ? <Spinner size="sm" /> : institutionCount}
          />
        </motion.div>
        <motion.div
          variants={staggerItem}
          transition={staggerItemTransition}
          whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
        >
          <StatCard
            label="Pending Certifications"
            value="—"
          />
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <div className="bg-white border border-outline-variant rounded-lg p-5 shadow-sm">
        <h2 className="text-base font-semibold text-primary mb-4">Quick Actions</h2>
        <motion.div
          className="flex flex-wrap gap-3"
          variants={staggerContainer(0.06)}
          initial="initial"
          animate="animate"
        >
          <motion.a
            variants={staggerItem}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            href="/ops/queue"
            className="flex items-center gap-2 px-4 py-2 bg-primary-container text-white text-sm font-semibold rounded hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Processing Queue
          </motion.a>
          <motion.a
            variants={staggerItem}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            href="/ops/sandbox"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-secondary text-secondary text-sm font-semibold rounded hover:bg-secondary/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Sandbox / Certification
          </motion.a>
          <motion.a
            variants={staggerItem}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            href="/ops/engagement"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-secondary text-secondary text-sm font-semibold rounded hover:bg-secondary/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Institution Engagement
          </motion.a>
        </motion.div>
      </div>

      {/* Recent Failed Batches */}
      <div className="bg-white border border-outline-variant rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
            <motion.div
              animate={{ rotate: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </motion.div>
            Recent Failed / Quarantined Batches
          </h2>
          <Link
            href="/ops/queue"
            className="text-sm font-semibold text-secondary hover:underline"
          >
            View All →
          </Link>
        </div>

        {loadingFailed ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : failedBatches.length === 0 ? (
          <div className="text-center py-12 text-outline">
            <motion.svg
              className="w-12 h-12 mx-auto mb-3 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </motion.svg>
            <p className="font-semibold text-green-700">No failed batches recently</p>
            <p className="text-sm mt-1">All batches are processing normally.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low text-xs font-semibold text-outline uppercase tracking-wide border-b border-outline-variant">
                <tr>
                  <th className="px-6 py-3">Batch ID</th>
                  <th className="px-6 py-3">Institution</th>
                  <th className="px-6 py-3">Channel</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Records</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <motion.tbody
                className="divide-y divide-outline-variant"
                variants={staggerContainer(0.035)}
                initial="initial"
                animate="animate"
              >
                {failedBatches.map((batch) => (
                  <motion.tr
                    key={batch.id}
                    variants={staggerItem}
                    transition={staggerItemTransition}
                    className="hover:bg-surface-container transition-colors"
                  >
                    <td className="px-6 py-3 font-mono font-medium text-on-surface">
                      {batch.batchRef || `#${batch.id.slice(0, 8)}`}
                    </td>
                    <td className="px-6 py-3 text-on-surface">{batch.institutionName ?? '—'}</td>
                    <td className="px-6 py-3">
                      {batch.channel ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            batch.channel === 'REST_API'
                              ? 'bg-blue-100 text-blue-800'
                              : batch.channel === 'PORTAL_UPLOAD'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {batch.channel}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={statusToBadgeVariant(batch.status)}>{batch.status}</Badge>
                    </td>
                    <td className="px-6 py-3 text-outline">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-right font-mono">
                      {batch.recordCount?.toLocaleString() ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/batches/${batch.id}`}
                        className="text-secondary text-xs font-semibold hover:underline"
                      >
                        Review
                      </Link>
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
