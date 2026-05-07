'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  CheckSquare,
  Square,
  MessageSquare,
  ShieldCheck,
  Users,
} from '@/lib/icons';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { PageSpinner } from '@/components/ui/Spinner';
import { AnimatedBar } from '@/components/motion/AnimatedBar';
import {
  spring,
  fadeUp,
  fadeUpTransition,
  scaleIn,
  staggerContainer,
  staggerItem,
} from '@/lib/motion';

// ── Types ────────────────────────────────────────────────────────────────────

interface SearchCriteria {
  search_type: string;
  identifier?: string;
  surname?: string;
  date_of_birth?: string;
  institution_name?: string;
  inquiry_reason?: string;
}

interface CandidateField {
  label: string;
  value: string;
  match_status: 'EXACT' | 'PARTIAL' | 'NO_MATCH' | 'UNKNOWN';
  note?: string;
}

interface BorrowerCandidate {
  borrower_id: string;
  confidence_score: number; // 0-100
  confidence_label: 'HIGH' | 'MODERATE' | 'LOW';
  active_accounts: number;
  fields: CandidateField[];
}

interface PendingResolution {
  inquiry_id: string;
  created_at: string;
  search_criteria: SearchCriteria;
  candidates: BorrowerCandidate[];
}

interface ResolutionsResponse {
  data: PendingResolution[];
  total: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const CONFIDENCE_CONFIG: Record<
  string,
  { headerBg: string; badgeBg: string; badgeText: string; avatarBg: string }
> = {
  HIGH: {
    headerBg: 'bg-emerald-50/50',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    avatarBg: 'bg-emerald-600',
  },
  MODERATE: {
    headerBg: 'bg-amber-50/50',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    avatarBg: 'bg-amber-600',
  },
  LOW: {
    headerBg: 'bg-red-50/20',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
    avatarBg: 'bg-red-600',
  },
};

const CONFIDENCE_LABELS: Record<string, string> = {
  HIGH: 'High Confidence',
  MODERATE: 'Moderate Conflict',
  LOW: 'Low Confidence',
};

const LETTER_LABELS = ['A', 'B', 'C', 'D', 'E'];

function MatchIcon({ status }: { status: string }) {
  if (status === 'EXACT') return <CheckCircle className="h-5 w-5 text-emerald-600" aria-label="Exact match" />;
  if (status === 'PARTIAL') return <AlertTriangle className="h-5 w-5 text-amber-600" aria-label="Partial match" />;
  if (status === 'NO_MATCH') return <XCircle className="h-5 w-5 text-red-600" aria-label="No match" />;
  return <HelpCircle className="h-5 w-5 text-outline" aria-label="Unknown" />;
}

function fieldValueClass(status: string): string {
  if (status === 'NO_MATCH') return 'bg-red-50 px-1 text-on-surface-variant';
  if (status === 'PARTIAL') return 'bg-amber-50 px-1';
  return '';
}

function matchNoteClass(status: string): string {
  if (status === 'EXACT') return 'text-emerald-600';
  if (status === 'PARTIAL') return 'text-amber-600';
  if (status === 'NO_MATCH') return 'text-red-600';
  return 'text-on-surface-variant';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// ── Protocol Checklist ───────────────────────────────────────────────────────

const PROTOCOL_ITEMS = [
  { label: 'Omang Verified against Reference', defaultChecked: true },
  { label: 'Primary Name Phonetic Check', defaultChecked: true },
  { label: 'Residential History Cross-Reference', defaultChecked: false },
  { label: 'Employment Data Validation', defaultChecked: false },
];

// ── Resolution Card ──────────────────────────────────────────────────────────

function ResolutionCard({
  resolution,
  onConfirmMatch,
  onNoMatch,
  isSubmitting,
}: {
  resolution: PendingResolution;
  onConfirmMatch: (inquiryId: string, borrowerId: string, note: string) => void;
  onNoMatch: (inquiryId: string, note: string) => void;
  isSubmitting: boolean;
}) {
  const [analystNote, setAnalystNote] = useState('');
  const [checklist, setChecklist] = useState<boolean[]>(PROTOCOL_ITEMS.map((i) => i.defaultChecked));

  const toggleCheck = (idx: number) => {
    setChecklist((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const { search_criteria, candidates } = resolution;

  return (
    <div className="flex flex-col gap-6 mb-10 pb-10 border-b border-outline-variant last:border-0">
      {/* Inquiry Reference Card */}
      <section>
        <div className="bg-primary-container text-white rounded-xl shadow-lg p-6 relative overflow-hidden">
          <div className="absolute right-4 top-4 opacity-10">
            <ShieldCheck className="h-24 w-24" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
                Reference Inquiry Data
              </span>
              {search_criteria.institution_name && (
                <span className="text-white/70 text-sm">
                  Source: {search_criteria.institution_name}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-primary-container mb-1">
                  Search Type
                </p>
                <p className="text-xl font-bold">{search_criteria.search_type}</p>
              </div>
              {search_criteria.identifier && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-on-primary-container mb-1">
                    Identifier
                  </p>
                  <p className="text-xl font-bold font-mono">{search_criteria.identifier}</p>
                </div>
              )}
              {search_criteria.surname && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-on-primary-container mb-1">
                    Surname
                  </p>
                  <p className="text-xl font-bold">{search_criteria.surname}</p>
                </div>
              )}
              {search_criteria.date_of_birth && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-on-primary-container mb-1">
                    Date of Birth
                  </p>
                  <p className="text-xl font-bold">{formatDate(search_criteria.date_of_birth)}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-primary-container mb-1">
                  Inquiry ID
                </p>
                <p className="text-sm font-mono font-bold">{resolution.inquiry_id}</p>
                <p className="text-xs text-white/60 mt-1">{formatDateTime(resolution.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Candidate Comparison Grid */}
      <section>
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          variants={staggerContainer(0.08)}
          initial="initial"
          animate="animate"
        >
          {candidates.map((candidate, idx) => {
            const config = CONFIDENCE_CONFIG[candidate.confidence_label] ?? CONFIDENCE_CONFIG.LOW;
            const letter = LETTER_LABELS[idx] ?? String(idx + 1);
            const confidenceLabel = CONFIDENCE_LABELS[candidate.confidence_label] ?? candidate.confidence_label;
            const scoreColor =
              candidate.confidence_score >= 80
                ? 'text-emerald-600'
                : candidate.confidence_score >= 50
                ? 'text-amber-600'
                : 'text-red-600';

            return (
              <motion.div
                key={candidate.borrower_id}
                variants={staggerItem}
                whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm flex flex-col"
              >
                {/* Card Header */}
                <div
                  className={[
                    'p-4 border-b border-outline-variant flex justify-between items-center',
                    config.headerBg,
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={[
                        'h-8 w-8 rounded-full flex items-center justify-center font-bold text-white text-sm',
                        config.avatarBg,
                      ].join(' ')}
                    >
                      {letter}
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                      Candidate {letter}
                    </h3>
                  </div>
                  <span
                    className={[
                      'text-xs font-bold px-2 py-1 rounded',
                      config.badgeBg,
                      config.badgeText,
                    ].join(' ')}
                  >
                    {confidenceLabel}
                  </span>
                </div>

                {/* Field Comparisons */}
                <div className="p-4 flex-1 space-y-4">
                  {candidate.fields.map((field, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        <MatchIcon status={field.match_status} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-0.5">
                          {field.label}
                        </p>
                        <p
                          className={[
                            'text-base font-bold text-on-surface break-words',
                            fieldValueClass(field.match_status),
                          ].join(' ')}
                        >
                          {field.value || '[No Record]'}
                        </p>
                        {field.note && (
                          <p className={['text-xs font-bold mt-0.5', matchNoteClass(field.match_status)].join(' ')}>
                            {field.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Stats with AnimatedBar for confidence score */}
                  <div className="pt-4 border-t border-outline-variant space-y-3">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                          Active Accounts
                        </p>
                        <p className="text-xl font-bold text-primary">
                          {candidate.active_accounts}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                          Record Score
                        </p>
                        <p className={['text-xl font-bold', scoreColor].join(' ')}>
                          {candidate.confidence_score.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    {/* Confidence score bar */}
                    <div className="w-full bg-surface-variant rounded-full h-1.5 overflow-hidden">
                      <AnimatedBar
                        pct={candidate.confidence_score}
                        className={[
                          'h-1.5 rounded-full',
                          candidate.confidence_score >= 80
                            ? 'bg-emerald-500'
                            : candidate.confidence_score >= 50
                            ? 'bg-amber-500'
                            : 'bg-red-500',
                        ].join(' ')}
                        delay={idx * 0.1}
                      />
                    </div>
                  </div>
                </div>

                {/* Confirm Action */}
                <div className="p-4 bg-surface-container-low border-t border-outline-variant">
                  <motion.button
                    className="w-full"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={spring.crisp}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => onConfirmMatch(resolution.inquiry_id, candidate.borrower_id, analystNote)}
                  >
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full pointer-events-none"
                      disabled={isSubmitting}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Confirm Match
                    </Button>
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Notes + Checklist */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Analyst Notes */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Analyst Resolution Notes
          </h4>
          <textarea
            value={analystNote}
            onChange={(e) => setAnalystNote(e.target.value)}
            placeholder="Provide justification for match selection or rejection..."
            rows={4}
            className="w-full border border-outline-variant rounded-lg p-3 text-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary-container focus:border-secondary resize-none transition-all"
          />
          <div className="flex justify-between items-center mt-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.crisp}
              type="button"
              disabled={isSubmitting}
              onClick={() => onNoMatch(resolution.inquiry_id, analystNote)}
            >
              <Button
                variant="danger"
                size="sm"
                disabled={isSubmitting}
                className="pointer-events-none"
              >
                <XCircle className="h-4 w-4" />
                No Match — Reject All
              </Button>
            </motion.button>
            <Button variant="secondary" size="sm">
              Save Draft Note
            </Button>
          </div>
        </div>

        {/* Protocol Checklist */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
          <h4 className="text-sm font-bold text-primary mb-3">Protocol Checklist</h4>
          <ul className="space-y-3">
            {PROTOCOL_ITEMS.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => toggleCheck(idx)}
              >
                {checklist[idx] ? (
                  <CheckSquare className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Square className="h-5 w-5 text-outline flex-shrink-0" />
                )}
                <span
                  className={[
                    'text-sm',
                    checklist[idx] ? 'text-on-surface' : 'text-on-surface-variant',
                  ].join(' ')}
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MatchResolutionPage() {
  const queryClient = useQueryClient();
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data, isLoading, isError } = useQuery<ResolutionsResponse>({
    queryKey: ['match-resolutions'],
    queryFn: async () => {
      try {
        const res = await api.get('/reports/pending-resolutions');
        return res.data?.data
          ? res.data
          : { data: res.data ?? [], total: 0 };
      } catch (err: unknown) {
        const e = err as { response?: { status?: number } };
        if (e?.response?.status === 404) {
          return { data: [], total: 0 };
        }
        throw err;
      }
    },
    staleTime: 30_000,
  });

  const confirmMutation = useMutation({
    mutationFn: async ({
      inquiryId,
      borrowerId,
      note,
    }: {
      inquiryId: string;
      borrowerId: string;
      note: string;
    }) => {
      await api.post(`/reports/${inquiryId}/resolve`, {
        action: 'CONFIRM_MATCH',
        borrower_id: borrowerId,
        analyst_note: note,
      });
    },
    onSuccess: (_, vars) => {
      setActionFeedback({ type: 'success', message: `Match confirmed for inquiry ${vars.inquiryId}.` });
      queryClient.invalidateQueries({ queryKey: ['match-resolutions'] });
    },
    onError: () => {
      setActionFeedback({ type: 'error', message: 'Failed to confirm match. Please try again.' });
    },
  });

  const noMatchMutation = useMutation({
    mutationFn: async ({ inquiryId, note }: { inquiryId: string; note: string }) => {
      await api.post(`/reports/${inquiryId}/resolve`, {
        action: 'NO_MATCH',
        analyst_note: note,
      });
    },
    onSuccess: (_, vars) => {
      setActionFeedback({ type: 'success', message: `No-match decision recorded for inquiry ${vars.inquiryId}.` });
      queryClient.invalidateQueries({ queryKey: ['match-resolutions'] });
    },
    onError: () => {
      setActionFeedback({ type: 'error', message: 'Failed to record no-match decision. Please try again.' });
    },
  });

  const isSubmitting = confirmMutation.isPending || noMatchMutation.isPending;

  const resolutions = data?.data ?? [];

  return (
    <motion.div
      className="flex flex-col gap-6 pb-12"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1 text-xs text-on-surface-variant mb-2">
            <Link href="/reports" className="hover:underline">Reports</Link>
            <span>/</span>
            <span className="font-bold text-primary">Match Resolution</span>
          </nav>
          <h1 className="text-3xl font-bold text-primary">Match Resolution</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Manual review required for system-flagged identity conflicts.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/reports">
            <Button variant="ghost" size="md">
              <ArrowLeft className="h-4 w-4" />
              Back to Search
            </Button>
          </Link>
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            variants={scaleIn}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={spring.soft}
          >
            <Alert
              variant={actionFeedback.type}
              onClose={() => setActionFeedback(null)}
            >
              {actionFeedback.message}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <PageSpinner />
          <p className="mt-4 text-sm text-on-surface-variant">Loading pending resolutions...</p>
        </div>
      ) : isError ? (
        <Alert variant="error" title="Failed to load resolutions">
          The pending match resolutions could not be retrieved. Please try again later.
        </Alert>
      ) : resolutions.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-on-surface mb-2">No Pending Resolutions</h2>
          <p className="text-sm text-on-surface-variant max-w-md">
            All identity conflicts have been resolved. Inquiries flagged as{' '}
            <span className="font-semibold">MATCH_REVIEW_REQUIRED</span> will appear here
            for manual review.
          </p>
          <div className="mt-6">
            <Link href="/reports">
              <Button variant="primary" size="md">
                <Users className="h-4 w-4" />
                Go to Credit Search
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div>
          {/* Summary Banner */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800">
                {resolutions.length} pending resolution{resolutions.length > 1 ? 's' : ''} require your attention
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Review each inquiry carefully. Confirming an incorrect match may affect the
                borrower&apos;s credit profile.
              </p>
            </div>
          </div>

          {resolutions.map((resolution) => (
            <ResolutionCard
              key={resolution.inquiry_id}
              resolution={resolution}
              onConfirmMatch={(inquiryId, borrowerId, note) =>
                confirmMutation.mutate({ inquiryId, borrowerId, note })
              }
              onNoMatch={(inquiryId, note) =>
                noMatchMutation.mutate({ inquiryId, note })
              }
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <footer className="pt-4 border-t border-outline-variant text-center">
        <p className="text-xs font-bold text-primary tracking-widest uppercase">
          © {new Date().getFullYear()} Botswana Credit Bureau (MFCB). Institutional Access Only.
        </p>
      </footer>
    </motion.div>
  );
}
