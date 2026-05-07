'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import {
  spring, fadeUp, fadeUpTransition,
  staggerContainer, staggerItem, staggerItemTransition,
  expandHeight, expandTransition,
} from '@/lib/motion';

type CodeType =
  | 'ACCOUNT_TYPE'
  | 'STATUS_CODE'
  | 'OWNERSHIP_TYPE'
  | 'REPAYMENT_FREQUENCY'
  | 'PAYMENT_TYPE'
  | 'LOAN_REASON_CODE'
  | 'INCOME_FREQUENCY'
  | 'TITLE';

const CODE_TYPES: { key: CodeType; label: string }[] = [
  { key: 'ACCOUNT_TYPE', label: 'Account Type' },
  { key: 'STATUS_CODE', label: 'Status Code' },
  { key: 'OWNERSHIP_TYPE', label: 'Ownership Type' },
  { key: 'REPAYMENT_FREQUENCY', label: 'Repayment Frequency' },
  { key: 'PAYMENT_TYPE', label: 'Payment Type' },
  { key: 'LOAN_REASON_CODE', label: 'Loan Reason Code' },
  { key: 'INCOME_FREQUENCY', label: 'Income Frequency' },
  { key: 'TITLE', label: 'Title' },
];

interface ReferenceCode {
  id: string;
  code: string;
  description: string;
  effectiveDate?: string;
  status: 'ACTIVE' | 'DEPRECATED' | 'PENDING';
  codeType: CodeType;
  createdAt?: string;
}

const addCodeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  description: z.string().min(1, 'Description is required'),
  effectiveDate: z.string().optional(),
});

type AddCodeFormValues = z.infer<typeof addCodeSchema>;

function CodeStatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  if (s === 'ACTIVE') return <Badge variant="active">Active</Badge>;
  if (s === 'DEPRECATED') return <Badge variant="neutral">Deprecated</Badge>;
  if (s === 'PENDING') return <Badge variant="pending">Pending Approval</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
}

// STATUS × ACCOUNT_TYPE compatibility matrix
const STATUS_CODES = ['A', 'C', 'D', 'R', 'T', 'L', 'X'];
const ACCOUNT_TYPES = ['Mortgage', 'Personal Loan', 'Credit Card', 'Vehicle Finance', 'Overdraft'];
const MATRIX: Record<string, string[]> = {
  Mortgage: ['A', 'C', 'T', 'L'],
  'Personal Loan': ['A', 'X'],
  'Credit Card': ['A', 'D', 'R'],
  'Vehicle Finance': ['A', 'C', 'T'],
  Overdraft: ['A', 'D', 'R', 'L'],
};

export default function ReferenceDataPage() {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const canEdit = hasPermission('reference:edit');
  const canApprove = hasPermission('reference:approve');

  const [activeTab, setActiveTab] = useState<CodeType>('ACCOUNT_TYPE');
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Track which code rows are accordion-expanded
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['reference', activeTab],
    queryFn: () =>
      api.get(`/reference/${activeTab}`).then((r) => r.data),
  });

  const codes: ReferenceCode[] = data?.data ?? data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddCodeFormValues>({
    resolver: zodResolver(addCodeSchema),
  });

  const addMutation = useMutation({
    mutationFn: (values: AddCodeFormValues) =>
      api.post(`/reference/${activeTab}`, { ...values, codeType: activeTab }),
    onSuccess: () => {
      setSuccessMsg('Reference code added successfully.');
      reset();
      setShowAddModal(false);
      queryClient.invalidateQueries({ queryKey: ['reference', activeTab] });
    },
    onError: () => setErrorMsg('Failed to add code. Please try again.'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/reference/${activeTab}/${id}`, { status: 'ACTIVE' }),
    onSuccess: () => {
      setSuccessMsg('Code approved.');
      queryClient.invalidateQueries({ queryKey: ['reference', activeTab] });
    },
    onError: () => setErrorMsg('Failed to approve code.'),
  });

  const deprecateMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/reference/${activeTab}/${id}`, { status: 'DEPRECATED' }),
    onSuccess: () => {
      setSuccessMsg('Code deprecated.');
      queryClient.invalidateQueries({ queryKey: ['reference', activeTab] });
    },
    onError: () => setErrorMsg('Failed to deprecate code.'),
  });

  const onSubmit = (values: AddCodeFormValues) => addMutation.mutate(values);

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
          <h1 className="text-3xl font-bold text-primary">Reference Data Management</h1>
          <p className="text-sm text-outline mt-1">
            Configure institutional business rules and code mappings (Form G Specification)
          </p>
        </div>
        {canEdit && (
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            + Add Code
          </Button>
        )}
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

      {/* Tabs */}
      <div className="border-b border-outline-variant">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {CODE_TYPES.map((ct) => (
            <motion.button
              key={ct.key}
              onClick={() => setActiveTab(ct.key)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.crisp}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === ct.key
                  ? 'border-secondary text-secondary'
                  : 'border-transparent text-outline hover:text-on-surface hover:border-outline-variant'
              }`}
            >
              {ct.label}
            </motion.button>
          ))}
        </nav>
      </div>

      {/* Table */}
      <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">
            {CODE_TYPES.find((c) => c.key === activeTab)?.label} Codes
          </h2>
          <span className="text-xs text-outline">
            {Array.isArray(codes) ? codes.length : 0} entries
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-sm text-red-600 font-semibold">Failed to load reference codes.</p>
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-12 text-outline">
            <svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-semibold">No reference codes found for this type.</p>
            {canEdit && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-2 text-secondary text-sm hover:underline"
              >
                Add the first code →
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-surface-container-high border-b-2 border-primary-container">
                <tr>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Code</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Description</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Effective Date</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase text-center">Status</th>
                  {(canEdit || canApprove) && (
                    <th className="px-5 py-3 font-semibold text-primary text-xs uppercase text-center">Actions</th>
                  )}
                </tr>
              </thead>
              <motion.tbody
                className="divide-y divide-outline-variant"
                variants={staggerContainer(0.06)}
                initial="initial"
                animate="animate"
              >
                {codes.map((code, idx) => (
                  <React.Fragment key={code.id}>
                    <motion.tr
                      variants={staggerItem}
                      transition={staggerItemTransition}
                      whileHover={{ y: -1 }}
                      onClick={() => setExpandedId(expandedId === code.id ? null : code.id)}
                      className={`hover:bg-surface-container transition-colors cursor-pointer ${idx % 2 === 1 ? 'bg-slate-50' : ''}`}
                    >
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-secondary-container text-on-secondary-container text-xs font-bold border border-on-secondary-container/20">
                          {code.code}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-on-surface max-w-xs">{code.description}</td>
                      <td className="px-5 py-3 text-outline text-xs">
                        {code.effectiveDate
                          ? new Date(code.effectiveDate).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <CodeStatusBadge status={code.status} />
                      </td>
                      {(canEdit || canApprove) && (
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {canApprove && code.status === 'PENDING' && (
                              <motion.button
                                onClick={() => approveMutation.mutate(code.id)}
                                disabled={approveMutation.isPending}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                transition={spring.crisp}
                                className="px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors"
                              >
                                Approve
                              </motion.button>
                            )}
                            {canEdit && code.status === 'ACTIVE' && (
                              <motion.button
                                onClick={() => deprecateMutation.mutate(code.id)}
                                disabled={deprecateMutation.isPending}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                transition={spring.crisp}
                                className="px-2.5 py-1 text-xs font-semibold text-outline bg-white border border-outline-variant rounded hover:bg-surface-container-low transition-colors"
                              >
                                Deprecate
                              </motion.button>
                            )}
                          </div>
                        </td>
                      )}
                    </motion.tr>
                    {/* Accordion expand detail */}
                    <AnimatePresence>
                      {expandedId === code.id && (
                        <tr>
                          <td colSpan={(canEdit || canApprove) ? 5 : 4} className="p-0 border-0">
                            <motion.div
                              variants={expandHeight}
                              initial="initial"
                              animate="animate"
                              exit="exit"
                              transition={expandTransition}
                              style={{ overflow: 'hidden' }}
                              layout
                            >
                              <div className="px-5 py-3 bg-surface-container-low text-xs text-outline space-y-1">
                                <p><span className="font-semibold">ID:</span> {code.id}</p>
                                {code.createdAt && (
                                  <p><span className="font-semibold">Created:</span> {new Date(code.createdAt).toLocaleDateString('en-GB')}</p>
                                )}
                                <p><span className="font-semibold">Type:</span> {code.codeType}</p>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </div>

      {/* STATUS × ACCOUNT_TYPE Matrix */}
      <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant">
          <h2 className="text-base font-semibold text-primary">
            Status × Account Type Compatibility Matrix
          </h2>
          <p className="text-xs text-outline mt-0.5">Read-only — defines allowed status codes per account type</p>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-outline uppercase min-w-[140px]">
                  Account Type
                </th>
                {STATUS_CODES.map((sc) => (
                  <th key={sc} className="px-3 py-2 text-center font-bold text-primary w-12">
                    {sc}
                  </th>
                ))}
              </tr>
            </thead>
            <motion.tbody
              className="divide-y divide-outline-variant"
              variants={staggerContainer(0.06)}
              initial="initial"
              animate="animate"
            >
              {ACCOUNT_TYPES.map((at, idx) => (
                <motion.tr
                  key={at}
                  variants={staggerItem}
                  transition={staggerItemTransition}
                  className={idx % 2 === 1 ? 'bg-slate-50' : ''}
                >
                  <td className="px-3 py-2 font-semibold text-on-surface">{at}</td>
                  {STATUS_CODES.map((sc) => {
                    const allowed = MATRIX[at]?.includes(sc);
                    return (
                      <td key={sc} className="px-3 py-2 text-center">
                        {allowed ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-surface-container text-outline text-[10px]">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </div>

      {/* Add Code Modal */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); reset(); }}
        title={`Add ${CODE_TYPES.find((c) => c.key === activeTab)?.label} Code`}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Code"
            placeholder="e.g. A, P, MON"
            {...register('code')}
            error={errors.code?.message}
          />
          <Input
            label="Description"
            placeholder="Human-readable description"
            {...register('description')}
            error={errors.description?.message}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface uppercase tracking-wider">
              Effective Date
            </label>
            <input
              type="date"
              {...register('effectiveDate')}
              className="w-full py-2 px-3 border border-outline-variant rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-secondary-container"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setShowAddModal(false); reset(); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={addMutation.isPending}
            >
              Add Code
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
