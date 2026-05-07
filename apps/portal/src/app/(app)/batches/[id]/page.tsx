'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, XCircle, RefreshCw, Clock, Info, ShieldCheck,
  ArrowLeft, TrendingUp, TrendingDown, AlertTriangle,
  Download, FileSearch, CheckSquare, Network, Check,
  FileText, Eye, BarChart2,
} from '@/lib/icons';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import {
  spring, fadeUp, fadeUpTransition, staggerContainer, staggerItem, staggerItemTransition,
} from '@/lib/motion';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { AnimatedBar } from '@/components/motion/AnimatedBar';

interface BatchDetail {
  id: string;
  short_id?: string;
  institution_id: string;
  institution_name?: string;
  reporting_month: string;
  file_type: 'TEST' | 'LIVE';
  status: 'QUEUED' | 'PARSING' | 'FIELD_VALIDATION' | 'MASTERING' | 'COMPLETED' | 'FAILED' | 'VALIDATING';
  channel?: string;
  total_records?: number;
  accepted_count?: number;
  rejected_count?: number;
  warning_count?: number;
  processing_time_ms?: number;
  source_filename?: string;
  submitted_by?: string;
  idempotency_key?: string;
  outcome_message?: string;
  created_at?: string;
  completed_at?: string;
}

const STAGES = [
  { key: 'QUEUED',           label: 'Received',  Icon: Download },
  { key: 'PARSING',          label: 'Parsed',    Icon: FileSearch },
  { key: 'FIELD_VALIDATION', label: 'Validated', Icon: CheckSquare },
  { key: 'MASTERING',        label: 'Mastering', Icon: Network },
  { key: 'COMPLETED',        label: 'Completed', Icon: Check },
] as const;

type StageKey = typeof STAGES[number]['key'];

const IN_PROGRESS_STATUSES = ['VALIDATING', 'PARSING', 'MASTERING', 'FIELD_VALIDATION', 'QUEUED'];

function getStageIndex(status: string): number {
  const idx = STAGES.findIndex((s) => s.key === status);
  if (idx >= 0) return idx;
  if (status === 'VALIDATING') return 2;
  if (status === 'FAILED') return -1;
  return -1;
}

function StatusBanner({ status, completedAt }: { status: string; completedAt?: string }) {
  const cfg: Record<string, { bg: string; Icon: React.ElementType; label: string; msg: string }> = {
    COMPLETED: {
      bg: 'bg-[#059669]',
      Icon: CheckCircle,
      label: 'COMPLETED',
      msg: completedAt
        ? `Processing finished successfully on ${new Date(completedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} CAT`
        : 'Processing finished successfully.',
    },
    FAILED: {
      bg: 'bg-[#ba1a1a]',
      Icon: XCircle,
      label: 'FAILED',
      msg: 'Batch processing failed. Review errors below.',
    },
    VALIDATING: {
      bg: 'bg-blue-600',
      Icon: RefreshCw,
      label: 'VALIDATING',
      msg: 'Batch is currently being validated…',
    },
    PARSING: {
      bg: 'bg-blue-600',
      Icon: RefreshCw,
      label: 'PARSING',
      msg: 'Batch is currently being parsed…',
    },
    FIELD_VALIDATION: {
      bg: 'bg-blue-600',
      Icon: RefreshCw,
      label: 'VALIDATING',
      msg: 'Batch is currently being validated…',
    },
    MASTERING: {
      bg: 'bg-blue-600',
      Icon: RefreshCw,
      label: 'MASTERING',
      msg: 'Batch is being mastered into the national database…',
    },
    QUEUED: {
      bg: 'bg-amber-500',
      Icon: Clock,
      label: 'QUEUED',
      msg: 'Batch is queued for processing.',
    },
  };
  const c = cfg[status] ?? { bg: 'bg-[#737780]', Icon: Info, label: status, msg: '' };
  const isInProgress = IN_PROGRESS_STATUSES.includes(status) && status !== 'COMPLETED' && status !== 'FAILED';

  return (
    <div className={`${c.bg} text-white p-6 rounded-xl flex items-center justify-between mb-8 shadow-sm`}>
      <div className="flex items-center gap-6">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <c.Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <AnimatePresence mode="wait">
            {isInProgress ? (
              <motion.span
                key={`badge-${status}`}
                className="text-xs font-bold uppercase tracking-widest block"
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(59,130,246,0.4)',
                    '0 0 0 8px rgba(59,130,246,0)',
                  ],
                }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                initial={{ scale: 0 }}
                exit={{ scale: 0 }}
              >
                {c.label}
              </motion.span>
            ) : (
              <motion.span
                key={`badge-${status}`}
                className="text-xs font-bold uppercase tracking-widest block"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={spring.crisp}
              >
                {c.label}
              </motion.span>
            )}
          </AnimatePresence>
          <p className="text-base font-medium mt-0.5">{c.msg}</p>
        </div>
      </div>
      <ShieldCheck className="text-white/30 w-12 h-12 hidden sm:block" />
    </div>
  );
}

function formatProcessingTime(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatReportingMonth(val: string) {
  if (!val) return '—';
  const d = new Date(val + '-01');
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'errors' | 'accepted'>('overview');

  const batchId = params.id;

  const { data: batch, isLoading, isError, error } = useQuery<BatchDetail>({
    queryKey: ['batch', batchId],
    queryFn: async () => {
      const res = await api.get(`/batches/${batchId}`);
      return res.data?.data ?? res.data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return false;
      return ['QUEUED', 'PARSING', 'FIELD_VALIDATION', 'MASTERING', 'VALIDATING'].includes(status)
        ? 3000
        : false;
    },
  });

  const retryMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/batches/${batchId}/retry`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
        <span className="ml-3 text-[#43474f]">Loading batch details…</span>
      </div>
    );
  }

  if (isError || !batch) {
    return (
      <div className="p-6">
        <Alert variant="error">
          Failed to load batch: {(error as Error)?.message ?? 'Batch not found'}
        </Alert>
        <Link href="/batches" className="mt-4 inline-flex items-center gap-1 text-sm text-[#28628f] hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Batches
        </Link>
      </div>
    );
  }

  const stageIdx = getStageIndex(batch.status);
  const acceptancePct =
    batch.total_records && batch.total_records > 0
      ? ((batch.accepted_count ?? 0) / batch.total_records * 100).toFixed(1)
      : null;
  const rejectionPct =
    batch.total_records && batch.total_records > 0
      ? ((batch.rejected_count ?? 0) / batch.total_records * 100).toFixed(1)
      : null;

  return (
    <motion.div
      className="p-6 max-w-[1280px] mx-auto"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      {/* Header */}
      <div className="flex items-center gap-6 mb-8">
        <motion.button
          onClick={() => router.push('/batches')}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#e6e8ea] transition-colors text-[#001e40]"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={spring.crisp}
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-[#001e40]">Batch Status Detail</h1>
          <p className="text-sm text-[#43474f]">
            Viewing details for Batch{' '}
            <span className="font-semibold">#{batch.short_id ?? batch.id.slice(-6).toUpperCase()}</span>
            {' '}from Batch Submissions
          </p>
        </div>
      </div>

      {/* Status Banner */}
      <StatusBanner status={batch.status} completedAt={batch.completed_at} />

      {/* Metric Tiles */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8"
        variants={staggerContainer(0.07)}
        initial="initial"
        animate="animate"
      >
        {[
          {
            label: 'Total Records',
            rawValue: batch.total_records ?? 0,
            displayValue: batch.total_records?.toLocaleString() ?? '—',
            isAnimated: batch.total_records != null,
            sub: '100% of batch',
            subClass: 'text-[#43474f] opacity-60',
          },
          {
            label: 'Accepted',
            rawValue: batch.accepted_count ?? 0,
            displayValue: batch.accepted_count?.toLocaleString() ?? '—',
            isAnimated: batch.accepted_count != null,
            sub: acceptancePct ? `${acceptancePct}%` : '',
            subClass: 'text-[#059669] flex items-center gap-1',
            subIcon: <TrendingUp className="w-3 h-3" />,
          },
          {
            label: 'Rejected',
            rawValue: batch.rejected_count ?? 0,
            displayValue: batch.rejected_count?.toLocaleString() ?? '—',
            isAnimated: batch.rejected_count != null,
            sub: rejectionPct ? `${rejectionPct}%` : '',
            subClass: 'text-[#ba1a1a] flex items-center gap-1',
            subIcon: <TrendingDown className="w-3 h-3" />,
          },
          {
            label: 'Warnings',
            rawValue: batch.warning_count ?? 0,
            displayValue: batch.warning_count?.toLocaleString() ?? '—',
            isAnimated: batch.warning_count != null,
            sub: 'Action Required',
            subClass: 'text-amber-600 flex items-center gap-1',
            subIcon: <AlertTriangle className="w-3 h-3" />,
          },
          {
            label: 'Processing Time',
            rawValue: 0,
            displayValue: formatProcessingTime(batch.processing_time_ms),
            isAnimated: false,
            sub: batch.processing_time_ms && batch.total_records
              ? `Avg. ${(batch.processing_time_ms / batch.total_records).toFixed(1)}ms / record`
              : '',
            subClass: 'text-[#43474f] opacity-60',
          },
        ].map(({ label, rawValue, displayValue, isAnimated, sub, subClass, subIcon }) => (
          <motion.div
            key={label}
            className="bg-white border border-[#c3c6d1] p-6 rounded-xl shadow-sm"
            variants={staggerItem}
            transition={staggerItemTransition}
            whileHover={{ y: -2 }}
          >
            <p className="text-sm text-[#43474f] mb-2">{label}</p>
            <p className="text-[24px] font-semibold text-[#001e40]">
              {isAnimated ? (
                <AnimatedNumber value={rawValue} />
              ) : (
                displayValue
              )}
            </p>
            {sub && (
              <div className={`mt-2 text-xs font-semibold ${subClass}`}>
                {subIcon && <span className="mr-1">{subIcon}</span>}
                {sub}
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Processing Timeline */}
      <div className="bg-white border border-[#c3c6d1] p-12 rounded-xl mb-8 shadow-sm">
        <div className="relative flex justify-between items-center max-w-4xl mx-auto">
          {/* Progress line */}
          <div
            className="absolute h-1 top-5 left-5 right-5 -translate-y-1/2 z-0 rounded-full"
            style={{
              background:
                stageIdx === -1
                  ? 'linear-gradient(to right, #059669, #ba1a1a)'
                  : `linear-gradient(to right, #059669 ${(stageIdx / (STAGES.length - 1)) * 100}%, #e0e3e5 ${(stageIdx / (STAGES.length - 1)) * 100}%)`,
            }}
          />
          <motion.div
            className="absolute flex justify-between items-center w-full"
            variants={staggerContainer(0.1)}
            initial="initial"
            animate="animate"
          >
            {STAGES.map((stage, i) => {
              const done = stageIdx >= i;
              const active = stageIdx === i;
              const failed = batch.status === 'FAILED' && i === stageIdx;
              return (
                <motion.div
                  key={stage.key}
                  className="relative z-10 flex flex-col items-center gap-2"
                  variants={staggerItem}
                  animate={
                    active && !failed
                      ? { scale: [1, 1.04, 1] }
                      : { scale: 1 }
                  }
                  transition={
                    active && !failed
                      ? { repeat: Infinity, duration: 1.5 }
                      : staggerItemTransition
                  }
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-white shadow-md transition-colors ${
                      failed
                        ? 'bg-[#ba1a1a] text-white'
                        : done
                        ? 'bg-[#059669] text-white'
                        : 'bg-[#e0e3e5] text-[#43474f]'
                    }`}
                  >
                    <stage.Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-semibold ${done ? 'text-[#001e40]' : 'text-[#43474f] opacity-60'}`}>
                    {stage.label}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[#c3c6d1] mb-6">
        <nav className="flex gap-0">
          {(['overview', 'errors', 'accepted'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                if (tab === 'errors') router.push(`/batches/${batchId}/errors`);
                else if (tab === 'accepted') router.push(`/batches/${batchId}/accepted`);
                else setActiveTab(tab);
              }}
              className={`relative px-6 py-3 text-sm font-semibold capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#001e40] text-[#001e40]'
                  : 'border-transparent text-[#43474f] hover:text-[#001e40]'
              }`}
            >
              {tab === 'errors' ? `Errors${batch.rejected_count ? ` (${batch.rejected_count})` : ''}` : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <motion.span
                  layoutId="batch-detail-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#001e40] rounded-full"
                />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Batch Information */}
        <motion.div
          className="bg-white border border-[#c3c6d1] rounded-xl shadow-sm overflow-hidden"
          whileHover={{ y: -2 }}
          transition={spring.soft}
        >
          <div className="p-6 bg-[#f2f4f6] border-b border-[#c3c6d1] flex items-center justify-between">
            <h3 className="text-[24px] font-semibold text-[#001e40]">Batch Information</h3>
            <Info className="w-5 h-5 text-[#737780]" />
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[#43474f]">Batch ID</p>
                <p className="text-base font-semibold mt-0.5">
                  #{batch.short_id ?? batch.id.slice(-6).toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#43474f]">Reporting Month</p>
                <p className="text-base font-semibold mt-0.5">
                  {formatReportingMonth(batch.reporting_month)}
                </p>
              </div>
            </div>

            {batch.source_filename && (
              <div>
                <p className="text-sm text-[#43474f]">Source Filename</p>
                <div className="flex items-center gap-2 mt-1">
                  <FileText className="w-5 h-5 text-[#001e40]" />
                  <p className="text-base font-semibold text-[#28628f] truncate">{batch.source_filename}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[#43474f]">File Type</p>
                <div className="mt-1">
                  {batch.file_type === 'LIVE' ? (
                    <motion.span
                      className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={spring.crisp}
                    >
                      LIVE
                    </motion.span>
                  ) : (
                    <motion.span
                      className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={spring.crisp}
                    >
                      TEST
                    </motion.span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-[#43474f]">Submission Channel</p>
                <p className="text-base font-semibold mt-0.5">{batch.channel ?? 'Portal'}</p>
              </div>
            </div>

            {batch.submitted_by && (
              <div>
                <p className="text-sm text-[#43474f]">Submitted By</p>
                <p className="text-base font-semibold mt-0.5">{batch.submitted_by}</p>
              </div>
            )}

            {batch.idempotency_key && (
              <div>
                <p className="text-sm text-[#43474f]">Idempotency Key</p>
                <p className="text-xs font-mono text-[#43474f] bg-[#eceef0] px-2 py-1 rounded inline-block mt-1 break-all">
                  {batch.idempotency_key}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Processing Outcome + Actions */}
        <div className="flex flex-col gap-8">
          <motion.div
            className="bg-white border border-[#c3c6d1] rounded-xl shadow-sm overflow-hidden"
            whileHover={{ y: -2 }}
            transition={spring.soft}
          >
            <div className="p-6 bg-[#f2f4f6] border-b border-[#c3c6d1]">
              <h3 className="text-[24px] font-semibold text-[#001e40]">Processing Outcome</h3>
            </div>
            <div className="p-6">
              <p className="text-base text-[#43474f] mb-8 leading-relaxed">
                {batch.outcome_message ??
                  (batch.status === 'COMPLETED'
                    ? `The batch has been fully processed through the MFCB institutional pipeline. ${
                        acceptancePct ? `${acceptancePct}%` : 'Most'
                      } of records have been successfully mastered and integrated into the national credit database.${
                        batch.rejected_count ? ` ${batch.rejected_count} records were rejected due to data validation failures.` : ''
                      }${batch.warning_count ? ` Warnings were issued for ${batch.warning_count} records with minor inconsistencies.` : ''}`
                    : batch.status === 'FAILED'
                    ? 'Batch processing failed. Please review the validation errors and resubmit.'
                    : 'Batch is currently being processed through the MFCB pipeline.')}
              </p>

              {/* Progress bars for accepted/rejected */}
              {batch.total_records && batch.total_records > 0 && (
                <div className="mb-8 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-[#43474f] mb-1">
                      <span>Accepted</span>
                      <span>{acceptancePct}%</span>
                    </div>
                    <div className="h-2 bg-[#eceef0] rounded-full overflow-hidden">
                      <AnimatedBar
                        pct={Number(acceptancePct ?? 0)}
                        className="h-full bg-[#059669] rounded-full"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-[#43474f] mb-1">
                      <span>Rejected</span>
                      <span>{rejectionPct}%</span>
                    </div>
                    <div className="h-2 bg-[#eceef0] rounded-full overflow-hidden">
                      <AnimatedBar
                        pct={Number(rejectionPct ?? 0)}
                        className="h-full bg-[#ba1a1a] rounded-full"
                        delay={0.1}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Link
                  href={`/batches/${batchId}/errors`}
                  className="w-full bg-[#001e40] text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm"
                >
                  <Eye className="w-4 h-4" />
                  View Errors
                </Link>
                <Link
                  href={`/batches/${batchId}/accepted`}
                  className="w-full border border-[#75AADB] text-[#28628f] font-semibold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-[#75AADB]/5 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  View Accepted Records
                </Link>
                {hasPermission('batches:force_retry') && (
                  <motion.button
                    onClick={() => retryMutation.mutate()}
                    disabled={retryMutation.isPending}
                    className="w-full text-[#43474f] font-semibold py-3 rounded-lg flex items-center justify-center gap-2 hover:text-[#001e40] transition-colors text-sm disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={spring.crisp}
                  >
                    {retryMutation.isPending ? <Spinner /> : <RefreshCw className="w-4 h-4" />}
                    Retry Batch
                  </motion.button>
                )}
              </div>
              {retryMutation.isError && (
                <Alert variant="error" className="mt-4">
                  Retry failed: {(retryMutation.error as Error)?.message}
                </Alert>
              )}
            </div>
          </motion.div>

          {/* Data Quality Index card */}
          <motion.div
            className="relative h-48 rounded-xl overflow-hidden shadow-sm border border-[#c3c6d1]"
            whileHover={{ y: -2 }}
            transition={spring.soft}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#001e40] to-[#28628f]" />
            <div className="absolute inset-0 flex items-center p-12">
              <div className="text-white">
                <p className="text-[24px] font-semibold">Data Quality Index</p>
                <p className="text-[32px] font-semibold mt-1">
                  {acceptancePct ? `${acceptancePct}%` : '—'}
                </p>
                <p className="text-sm opacity-80 mt-1">
                  {acceptancePct && Number(acceptancePct) >= 95
                    ? 'Exceeds institutional threshold'
                    : 'Below institutional threshold'}
                </p>
              </div>
            </div>
            <BarChart2 className="absolute right-6 bottom-6 text-white/10 w-20 h-20" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
