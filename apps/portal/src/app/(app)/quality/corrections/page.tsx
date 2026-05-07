'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/auth-store';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import {
  spring,
  fadeUp,
  fadeUpTransition,
  scaleIn,
  staggerContainer,
  staggerItem,
  staggerItemTransition,
  expandHeight,
  expandTransition,
} from '@/lib/motion';

// ─── Types ────────────────────────────────────────────────────────────────────

type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface CorrectionRequest {
  id: string;
  institution: string;
  accountNumber: string;
  fieldChanged: string;
  originalValue: string;
  correctedValue: string;
  correctionReason: string;
  requestedBy: string;
  requestedAt: string;
  status: CorrectionStatus;
  approvedBy?: string;
  approvedAt?: string;
  batchId?: string;
}

interface RequestCorrectionForm {
  institution: string;
  accountNumber: string;
  fieldChanged: string;
  originalValue: string;
  correctedValue: string;
  correctionReason: string;
  supportingRef: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
// API endpoints for data corrections are partially implemented.
// Using empty state with placeholder data to demonstrate the UI.

const MOCK_CORRECTIONS: CorrectionRequest[] = [];

const FIELD_OPTIONS = [
  'Omang Number',
  'Full Name',
  'Date of Birth',
  'Account Number',
  'Contact Number',
  'Address',
  'Loan Amount',
  'Interest Rate',
  'Repayment Status',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function correctionStatusVariant(
  status: CorrectionStatus
): 'pending' | 'success' | 'error' {
  switch (status) {
    case 'PENDING':
      return 'pending';
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'error';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ApproveModal({
  request,
  onClose,
  onApprove,
  onReject,
}: {
  request: CorrectionRequest;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <Modal open title="Review Correction Request" onClose={onClose} size="lg">
      {/* Reference */}
      <div className="flex items-center gap-6 p-3 bg-surface-container-low rounded-lg border border-outline-variant mb-4 text-sm">
        <div>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase">
            Request ID
          </span>
          <p className="font-bold text-primary">{request.id}</p>
        </div>
        <div className="w-px h-8 bg-outline-variant" />
        <div>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase">
            Institution
          </span>
          <p className="font-bold text-primary">{request.institution}</p>
        </div>
        <div className="w-px h-8 bg-outline-variant" />
        <div>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase">
            Account
          </span>
          <p className="font-bold text-primary font-mono">{request.accountNumber}</p>
        </div>
        <div className="ml-auto">
          <Badge variant="pending">Correction Required</Badge>
        </div>
      </div>

      {/* Before / After comparison */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
          <h4 className="text-[10px] font-bold uppercase text-on-surface-variant mb-3 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Original Value (In Error)
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-surface-container py-1.5">
              <span className="text-on-surface-variant font-medium">Field</span>
              <span>{request.fieldChanged}</span>
            </div>
            <div className="flex justify-between border-b border-surface-container py-1.5">
              <span className="text-on-surface-variant font-medium">Value</span>
              <span className="font-mono text-red-700 bg-red-50 px-1.5 rounded">
                {request.originalValue}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-primary-container rounded-lg p-4">
          <h4 className="text-[10px] font-bold uppercase text-primary mb-3 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Proposed Correction
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-surface-container py-1.5">
              <span className="text-on-surface-variant font-medium">Field</span>
              <span>{request.fieldChanged}</span>
            </div>
            <div className="flex justify-between border-b border-surface-container py-1.5">
              <span className="text-on-surface-variant font-medium">New Value</span>
              <span className="font-mono text-green-700 bg-green-50 px-1.5 rounded">
                {request.correctedValue}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reason */}
      <div className="mb-4">
        <h4 className="text-xs font-bold text-primary uppercase mb-1">Correction Reason</h4>
        <p className="text-sm text-on-surface-variant bg-surface-container-low rounded p-3 border border-outline-variant">
          {request.correctionReason}
        </p>
      </div>

      {/* Governance note */}
      <div className="bg-surface-container-high rounded-lg p-3 border-l-4 border-primary flex items-start gap-3 mb-6">
        <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <div>
          <p className="text-sm font-bold text-primary">Governance &amp; Compliance Note</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            This request follows the maker-checker protocol. Your approval is SEC-008 compliant — a full audit trail will be maintained and the original record will not be overwritten.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            onReject(request.id);
            onClose();
          }}
        >
          Reject
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            onApprove(request.id);
            onClose();
          }}
        >
          Approve Correction
        </Button>
      </div>
    </Modal>
  );
}

function RequestCorrectionModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<RequestCorrectionForm>({
    institution: '',
    accountNumber: '',
    fieldChanged: FIELD_OPTIONS[0],
    originalValue: '',
    correctedValue: '',
    correctionReason: '',
    supportingRef: '',
  });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // In a real app: POST /corrections
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Modal open title="Correction Request Submitted" onClose={onClose} size="md">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-primary">Request Submitted for Approval</h3>
          <p className="text-sm text-on-surface-variant text-center max-w-sm">
            Your correction request has been submitted and is pending supervisor approval. You will be notified once a decision is made.
          </p>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open title="Request Data Correction" onClose={onClose} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              Institution *
            </label>
            <input
              required
              type="text"
              value={form.institution}
              onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
              placeholder="e.g. First National Bank"
              className="w-full h-10 rounded-lg border border-outline-variant px-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              Account Number *
            </label>
            <input
              required
              type="text"
              value={form.accountNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, accountNumber: e.target.value }))
              }
              placeholder="e.g. ACC-0012345"
              className="w-full h-10 rounded-lg border border-outline-variant px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-primary mb-1">
            Field to Correct *
          </label>
          <select
            value={form.fieldChanged}
            onChange={(e) =>
              setForm((f) => ({ ...f, fieldChanged: e.target.value }))
            }
            className="w-full h-10 rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
          >
            {FIELD_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1">
              Current Value (In Error)
            </label>
            <input
              type="text"
              value={form.originalValue}
              onChange={(e) =>
                setForm((f) => ({ ...f, originalValue: e.target.value }))
              }
              placeholder="Current incorrect value"
              className="w-full h-10 rounded-lg border border-outline-variant bg-surface-container px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              New Corrected Value *
            </label>
            <input
              required
              type="text"
              value={form.correctedValue}
              onChange={(e) =>
                setForm((f) => ({ ...f, correctedValue: e.target.value }))
              }
              placeholder="Enter corrected value"
              className="w-full h-10 rounded-lg border-2 border-secondary px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-primary mb-1">
            Correction Reason *
          </label>
          <textarea
            required
            rows={3}
            value={form.correctionReason}
            onChange={(e) =>
              setForm((f) => ({ ...f, correctionReason: e.target.value }))
            }
            placeholder="Explain why this correction is necessary..."
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-primary mb-1">
            Supporting Reference (Dispute ID / Regulatory Directive)
          </label>
          <input
            type="text"
            value={form.supportingRef}
            onChange={(e) =>
              setForm((f) => ({ ...f, supportingRef: e.target.value }))
            }
            placeholder="e.g. DISP-2024-8991"
            className="w-full h-10 rounded-lg border border-outline-variant px-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
          />
        </div>

        {/* Governance note */}
        <div className="bg-surface-container-high rounded-lg p-3 border-l-4 border-primary flex items-start gap-3">
          <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div>
            <p className="text-xs font-bold text-primary">Governance &amp; Compliance Note</p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              This request follows the maker-checker protocol. All changes require supervisor
              approval and are SEC-008 compliant (audit-trail enabled, no direct overwriting of
              historical records).
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary-container text-white text-sm font-semibold rounded-lg shadow-sm"
          >
            Submit for Approval
          </motion.button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CorrectionsPage() {
  const { hasPermission } = useAuthStore();

  const canApprove = hasPermission('corrections:approve');
  const canRequest = hasPermission('corrections:request');

  const [activeTab, setActiveTab] = useState<'PENDING' | 'COMPLETED'>('PENDING');
  const [corrections, setCorrections] =
    useState<CorrectionRequest[]>(MOCK_CORRECTIONS);
  const [approveTarget, setApproveTarget] = useState<CorrectionRequest | null>(
    null
  );
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const pendingItems = corrections.filter((c) => c.status === 'PENDING');
  const completedItems = corrections.filter(
    (c) => c.status === 'APPROVED' || c.status === 'REJECTED'
  );

  const displayItems =
    activeTab === 'PENDING' ? pendingItems : completedItems;

  function handleApprove(id: string) {
    setCorrections((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'APPROVED',
              approvedAt: new Date().toISOString(),
              approvedBy: 'Current User',
            }
          : c
      )
    );
    setSuccessMessage(`Correction request ${id} has been approved.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  function handleReject(id: string) {
    setCorrections((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'REJECTED',
              approvedAt: new Date().toISOString(),
              approvedBy: 'Current User',
            }
          : c
      )
    );
    setSuccessMessage(`Correction request ${id} has been rejected.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
      className="p-6 space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-gray-400 mb-1">
            <Link href="/quality" className="hover:text-secondary transition-colors">
              Data Quality
            </Link>
            <span>/</span>
            <span className="text-secondary font-bold">Data Corrections</span>
          </nav>
          <h1 className="text-2xl font-bold text-primary">Data Corrections</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Maker-checker workflow for manual data corrections. All changes require supervisor
            approval and maintain a full audit trail.
          </p>
        </div>
        {canRequest && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowRequestModal(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-primary-container text-white text-sm font-semibold rounded-lg shadow-sm"
          >
            + Request Correction
          </motion.button>
        )}
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-1 border-b border-outline-variant">
        <Link
          href="/quality"
          className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-t-lg transition-colors"
        >
          Quality Dashboard
        </Link>
        <Link
          href="/quality/compliance"
          className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-t-lg transition-colors"
        >
          Compliance
        </Link>
        <Link
          href="/quality/resubmissions"
          className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-t-lg transition-colors"
        >
          Resubmissions
        </Link>
        <span className="px-4 py-2 text-sm font-semibold text-primary border-b-2 border-primary">
          Corrections
        </span>
      </div>

      {/* Success alert */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            variants={expandHeight}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={expandTransition}
            className="overflow-hidden"
          >
            <Alert variant="success" onClose={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Governance Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <svg
          className="w-5 h-5 text-blue-600 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <div>
          <p className="text-sm font-bold text-blue-900">Maker-Checker Protocol Active</p>
          <p className="text-xs text-blue-700 mt-0.5">
            All correction requests require a second-level supervisor approval before being
            applied. Historical records are never overwritten — corrections are logged as new
            versions per SEC-008 compliance requirements.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <motion.div
        variants={staggerContainer(0.06)}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <motion.div
          variants={staggerItem}
          transition={staggerItemTransition}
          className="bg-white p-4 rounded-xl border border-outline-variant shadow-sm"
        >
          <p className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">
            Pending Approval
          </p>
          <h3 className="text-3xl font-bold text-amber-600 mt-2">{pendingItems.length}</h3>
          <p className="text-xs text-on-surface-variant mt-1">Awaiting supervisor review</p>
        </motion.div>
        <motion.div
          variants={staggerItem}
          transition={staggerItemTransition}
          className="bg-white p-4 rounded-xl border border-outline-variant shadow-sm"
        >
          <p className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">
            Approved
          </p>
          <h3 className="text-3xl font-bold text-green-600 mt-2">
            {corrections.filter((c) => c.status === 'APPROVED').length}
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">Corrections applied</p>
        </motion.div>
        <motion.div
          variants={staggerItem}
          transition={staggerItemTransition}
          className="bg-white p-4 rounded-xl border border-outline-variant shadow-sm"
        >
          <p className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">
            Rejected
          </p>
          <h3 className="text-3xl font-bold text-red-600 mt-2">
            {corrections.filter((c) => c.status === 'REJECTED').length}
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">Requests declined</p>
        </motion.div>
      </motion.div>

      {/* Tabs + Table */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        {/* Tab Header */}
        <div className="border-b border-outline-variant flex items-center justify-between px-5 pt-4">
          <div className="flex gap-0">
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'PENDING'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              Pending Approval
              {pendingItems.length > 0 && (
                <span className="ml-2 bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingItems.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'COMPLETED'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low border-b-2 border-primary-container text-[10px] uppercase tracking-widest font-bold text-primary">
              <tr>
                <th className="px-6 py-4">Request ID</th>
                <th className="px-6 py-4">Institution</th>
                <th className="px-6 py-4">Account Number</th>
                <th className="px-6 py-4">Field Changed</th>
                <th className="px-6 py-4">Requested By</th>
                <th className="px-6 py-4">Requested At</th>
                <th className="px-6 py-4 text-center">Status</th>
                {activeTab === 'PENDING' && canApprove && (
                  <th className="px-6 py-4 text-right">Actions</th>
                )}
                {activeTab === 'COMPLETED' && (
                  <th className="px-6 py-4 text-right">Actioned By</th>
                )}
              </tr>
            </thead>
            <motion.tbody
              variants={staggerContainer(0.04)}
              initial="initial"
              animate="animate"
            >
              {displayItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === 'PENDING' ? (canApprove ? 8 : 7) : 8}
                    className="px-6 py-20 text-center"
                  >
                    <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                      <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center">
                        {activeTab === 'PENDING' ? (
                          <svg className="w-7 h-7 text-outline-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        ) : (
                          <svg className="w-7 h-7 text-outline-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <p className="font-semibold text-base">
                        {activeTab === 'PENDING'
                          ? 'No pending corrections'
                          : 'No completed corrections yet'}
                      </p>
                      <p className="text-sm max-w-sm text-center">
                        {activeTab === 'PENDING'
                          ? 'There are currently no correction requests awaiting approval. Requests submitted by makers will appear here.'
                          : 'Approved or rejected correction requests will appear here once actioned.'}
                      </p>
                      {activeTab === 'PENDING' && canRequest && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRequestModal(true)}
                        >
                          Request a Correction
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayItems.map((item) => (
                  <motion.tr
                    key={item.id}
                    variants={staggerItem}
                    layout
                    className="hover:bg-blue-50/20 transition-colors border-b border-outline-variant/50 even:bg-slate-50"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-secondary font-semibold">
                      {item.id}
                    </td>
                    <td className="px-6 py-4 font-medium">{item.institution}</td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {item.accountNumber}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-surface-container text-primary text-xs font-semibold px-2 py-1 rounded">
                        {item.fieldChanged}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {item.requestedBy}
                    </td>
                    <td className="px-6 py-4 text-xs text-on-surface-variant whitespace-nowrap">
                      {formatDate(item.requestedAt)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={item.status}
                          variants={scaleIn}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={spring.crisp}
                          className="inline-block"
                        >
                          <Badge variant={correctionStatusVariant(item.status)}>
                            {item.status}
                          </Badge>
                        </motion.span>
                      </AnimatePresence>
                    </td>
                    {activeTab === 'PENDING' && canApprove && (
                      <td className="px-6 py-4 text-right">
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setApproveTarget(item)}
                          className="inline-flex items-center justify-center px-3 py-1.5 border border-outline-variant text-xs font-semibold text-primary rounded-lg hover:bg-surface-container-low transition-colors"
                        >
                          Review
                        </motion.button>
                      </td>
                    )}
                    {activeTab === 'COMPLETED' && (
                      <td className="px-6 py-4 text-right text-xs text-on-surface-variant">
                        {item.approvedBy ?? '—'}
                        {item.approvedAt && (
                          <p className="text-[10px] mt-0.5">
                            {formatDate(item.approvedAt)}
                          </p>
                        )}
                      </td>
                    )}
                  </motion.tr>
                ))
              )}
            </motion.tbody>
          </table>
        </div>
      </div>

      {/* Approval Modal */}
      {approveTarget && (
        <ApproveModal
          request={approveTarget}
          onClose={() => setApproveTarget(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {/* Request Correction Modal */}
      {showRequestModal && (
        <RequestCorrectionModal onClose={() => setShowRequestModal(false)} />
      )}
    </motion.div>
  );
}
