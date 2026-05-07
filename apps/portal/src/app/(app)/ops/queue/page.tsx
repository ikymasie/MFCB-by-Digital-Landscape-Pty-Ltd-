'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, statusToBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
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
  stage?: string;
  stageProgress?: number;
  institutionName?: string;
  institutionSrn?: string;
  channel?: string;
  createdAt: string;
  updatedAt?: string;
  recordCount?: number;
}

function ChannelBadge({ channel }: { channel?: string }) {
  if (!channel) return null;
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
      {channel}
    </span>
  );
}

function StagePill({ stage, progress }: { stage?: string; progress?: number }) {
  if (!stage) return <span className="text-outline text-xs">—</span>;
  const stageColors: Record<string, string> = {
    RECEIVED: 'bg-gray-100 text-gray-700',
    VIRUS_SCAN: 'bg-yellow-100 text-yellow-800',
    PARSING: 'bg-blue-100 text-blue-800',
    VALIDATING: 'bg-blue-100 text-blue-800',
    DUPLICATE_CHECK: 'bg-blue-100 text-blue-800',
    MASTERING: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    QUARANTINED: 'bg-red-100 text-red-800',
  };
  const barColor =
    stage === 'FAILED' || stage === 'QUARANTINED'
      ? 'bg-red-500'
      : stage === 'COMPLETED' || stage === 'MASTERING'
      ? 'bg-green-600'
      : 'bg-blue-500';

  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      <div className="flex items-center justify-between">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${stageColors[stage] ?? 'bg-gray-100 text-gray-700'}`}>
          {stage.replace(/_/g, ' ')}
        </span>
        {progress !== undefined && (
          <span className="text-[10px] font-bold">{progress}%</span>
        )}
      </div>
      {progress !== undefined && (
        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
          <div
            className={`${barColor} h-full rounded-full transition-all`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function getElapsed(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export default function ProcessingQueuePage() {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();

  const [quarantineTarget, setQuarantineTarget] = useState<Batch | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['processing-queue'],
    queryFn: () => api.get('/batches?status=VALIDATING,QUEUED&limit=50').then((r) => r.data),
    refetchInterval: 5000,
  });

  const batches: Batch[] = data?.data ?? data ?? [];

  const retryMutation = useMutation({
    mutationFn: (batchId: string) => api.post(`/batches/${batchId}/retry`),
    onSuccess: () => {
      setSuccessMsg('Batch retry initiated successfully.');
      queryClient.invalidateQueries({ queryKey: ['processing-queue'] });
    },
    onError: () => setErrorMsg('Failed to retry batch. Please try again.'),
  });

  const quarantineMutation = useMutation({
    mutationFn: (batchId: string) => api.post(`/batches/${batchId}/quarantine`),
    onSuccess: () => {
      setSuccessMsg('Batch quarantined successfully.');
      setQuarantineTarget(null);
      queryClient.invalidateQueries({ queryKey: ['processing-queue'] });
    },
    onError: () => {
      setErrorMsg('Failed to quarantine batch.');
      setQuarantineTarget(null);
    },
  });

  return (
    <motion.div
      className="p-6 max-w-7xl mx-auto space-y-6"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Batch Processing Queue</h1>
          <p className="text-sm text-outline mt-1">Real-time monitor — auto-refreshes every 5 seconds</p>
        </div>
        <div className="flex items-center gap-2 bg-surface-container px-3 py-1 rounded-full border border-outline-variant">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-outline uppercase tracking-tight">Live Monitor</span>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <Alert variant="success" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert variant="error" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* Summary Cards */}
      <motion.div
        className="grid grid-cols-3 gap-4"
        variants={staggerContainer(0.06)}
        initial="initial"
        animate="animate"
      >
        <motion.div
          variants={staggerItem}
          transition={staggerItemTransition}
          className="bg-white border border-outline-variant rounded-xl p-4 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-outline uppercase mb-1">Active Batches</p>
            <p className="text-4xl font-bold text-primary">
              {isLoading ? <Spinner size="sm" /> : batches.length}
            </p>
          </div>
          <div className="p-2 bg-secondary-container/30 rounded-lg">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </div>
        </motion.div>
        <motion.div
          variants={staggerItem}
          transition={staggerItemTransition}
          className="bg-white border border-outline-variant rounded-xl p-4 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-outline uppercase mb-1">Engine Health</p>
            <p className="text-2xl font-bold text-green-700 flex items-center gap-1">
              Optimal
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </p>
          </div>
          <div className="p-2 bg-green-50 rounded-lg">
            <svg className="w-8 h-8 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          </div>
        </motion.div>
        <motion.div
          variants={staggerItem}
          transition={staggerItemTransition}
          className="bg-white border border-outline-variant rounded-xl p-4 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-outline uppercase mb-1">Avg Processing Time</p>
            <p className="text-3xl font-bold text-primary">~6m</p>
          </div>
          <div className="p-2 bg-tertiary-container/20 rounded-lg">
            <svg className="w-8 h-8 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </motion.div>
      </motion.div>

      {/* Queue Table */}
      <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Real-Time Processing Queue</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-outline flex items-center gap-1">
              <motion.svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </motion.svg>
              Auto-refreshing
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-outline">
            <p className="font-semibold text-red-600">Failed to load queue data.</p>
            <p className="text-sm mt-1">Check your connection or try refreshing.</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-16 text-outline">
            <svg className="w-12 h-12 mx-auto mb-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold text-green-700">Queue is empty</p>
            <p className="text-sm mt-1">No batches are currently processing.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-surface-container-high border-b-2 border-primary-container">
                <tr>
                  <th className="px-4 py-3 font-semibold text-primary text-xs uppercase">Batch ID</th>
                  <th className="px-4 py-3 font-semibold text-primary text-xs uppercase">Institution / SRN</th>
                  <th className="px-4 py-3 font-semibold text-primary text-xs uppercase">Channel</th>
                  <th className="px-4 py-3 font-semibold text-primary text-xs uppercase">Stage & Progress</th>
                  <th className="px-4 py-3 font-semibold text-primary text-xs uppercase text-right">Records</th>
                  <th className="px-4 py-3 font-semibold text-primary text-xs uppercase text-right">Elapsed</th>
                  <th className="px-4 py-3 font-semibold text-primary text-xs uppercase text-center">Actions</th>
                </tr>
              </thead>
              <AnimatePresence>
                <motion.tbody
                  className="divide-y divide-outline-variant"
                  variants={staggerContainer(0.03)}
                  initial="initial"
                  animate="animate"
                >
                  {batches.map((batch, idx) => (
                    <motion.tr
                      key={batch.id}
                      layout
                      variants={staggerItem}
                      transition={staggerItemTransition}
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ opacity: 0, x: 40, scale: 0.95 }}
                      className={`hover:bg-surface-container transition-colors ${idx % 2 === 1 ? 'bg-slate-50' : ''}`}
                    >
                      <td className="px-4 py-4 font-mono text-sm font-medium text-on-surface">
                        {batch.batchRef || `#${batch.id.slice(0, 8)}`}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-on-surface">{batch.institutionName ?? '—'}</div>
                        {batch.institutionSrn && (
                          <div className="text-xs text-outline">{batch.institutionSrn}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <ChannelBadge channel={batch.channel} />
                      </td>
                      <td className="px-4 py-4">
                        <StagePill stage={batch.stage ?? batch.status} progress={batch.stageProgress} />
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm">
                        {batch.recordCount?.toLocaleString() ?? '—'}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm text-outline">
                        {getElapsed(batch.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          {hasPermission('batches:force_retry') && (
                            <motion.button
                              title="Force Retry"
                              className="p-1.5 hover:bg-surface-container-high rounded transition-colors"
                              onClick={() => retryMutation.mutate(batch.id)}
                              disabled={retryMutation.isPending}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              transition={spring.crisp}
                            >
                              <svg className="w-4 h-4 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </motion.button>
                          )}
                          {hasPermission('batches:quarantine') && (
                            <motion.button
                              title="Quarantine"
                              className="p-1.5 hover:bg-red-50 rounded transition-colors"
                              onClick={() => setQuarantineTarget(batch)}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              transition={spring.crisp}
                            >
                              <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </motion.button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </AnimatePresence>
            </table>
          </div>
        )}

        {batches.length > 0 && (
          <div className="px-6 py-3 bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
            <span className="text-xs text-outline">
              Showing {batches.length} active batch{batches.length !== 1 ? 'es' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Quarantine Confirmation Modal */}
      <Modal
        open={!!quarantineTarget}
        onClose={() => setQuarantineTarget(null)}
        title="Confirm Quarantine"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            Are you sure you want to quarantine batch{' '}
            <span className="font-bold text-on-surface font-mono">
              {quarantineTarget?.batchRef || quarantineTarget?.id?.slice(0, 8)}
            </span>
            ? This action will halt processing and flag the batch for review.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" size="sm" onClick={() => setQuarantineTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={quarantineMutation.isPending}
              onClick={() => quarantineTarget && quarantineMutation.mutate(quarantineTarget.id)}
            >
              Quarantine Batch
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
