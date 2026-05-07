'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { ChevronRight, AlertTriangle, Upload, FileText, Trash2, Info, Send, Shield, CheckCircle, History, Copy } from '@/lib/icons';
import {
  spring, fadeUp, fadeUpTransition, scaleIn, fadeIn,
  staggerContainer, staggerItem, staggerItemTransition,
  expandTransition, expandHeight,
} from '@/lib/motion';

const schema = z.object({
  reporting_month: z.string().min(1, 'Reporting month is required'),
  file_type: z.enum(['TEST', 'LIVE']),
  sequence_number: z.coerce.number().int().min(1).default(1),
});

type FormValues = z.infer<typeof schema>;

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewBatchPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [idempotencyKey] = useState(generateIdempotencyKey);
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { file_type: 'TEST', sequence_number: 1 },
  });

  const fileType = watch('file_type');

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Compute last day of reporting month
      const [year, month] = values.reporting_month.split('-').map(Number);
      const lastDay = new Date(year, month, 0);
      const reportingMonthFull = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

      const payload = {
        institution_id: user?.institutionId,
        reporting_month: reportingMonthFull,
        file_type: values.file_type,
        records: [],
        idempotency_key: idempotencyKey,
        sequence_number: values.sequence_number,
      };

      const res = await api.post('/batches', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      return res.data;
    },
    onSuccess: (data) => {
      const batchId = data?.id ?? data?.batch_id ?? data?.data?.id;
      if (batchId) {
        router.push(`/batches/${batchId}`);
      } else {
        router.push('/batches');
      }
    },
  });

  const onSubmit = (values: FormValues) => {
    if (values.file_type === 'LIVE') {
      setPendingSubmit(true);
      setShowLiveConfirm(true);
    } else {
      mutation.mutate(values);
    }
  };

  const confirmLiveSubmit = () => {
    setShowLiveConfirm(false);
    handleSubmit((values) => mutation.mutate(values))();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.txt') || file.type === 'text/plain')) {
      setSelectedFile(file);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const copyKey = () => {
    navigator.clipboard.writeText(idempotencyKey).then(() => {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    });
  };

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-2 text-sm text-[#43474f] mb-3">
          <Link href="/batches" className="hover:text-[#001e40] transition-colors">Batch Submissions</Link>
          <ChevronRight className="w-4 h-4 text-[#737780]" />
          <span className="text-[#001e40] font-semibold">New Batch</span>
        </div>
        <h1 className="text-[32px] font-semibold tracking-tight text-[#001e40] mb-2">Submit New Data Batch</h1>
        <p className="text-base text-[#43474f]">
          Enter metadata and upload your encrypted financial records file for institutional validation.
        </p>
      </div>

      {/* Main Form Card */}
      <motion.div
        className="bg-white border border-[#c3c6d1] rounded-xl shadow-md overflow-hidden"
        variants={scaleIn}
        initial="initial"
        animate="animate"
        transition={spring.crisp}
      >
        <div className="p-12">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            {/* Field Grid */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              variants={staggerContainer(0.05)}
              initial="initial"
              animate="animate"
            >
              {/* SRN (read-only) */}
              <motion.div
                className="flex flex-col gap-2"
                variants={staggerItem}
                transition={staggerItemTransition}
              >
                <label className="text-sm font-semibold text-[#191c1e]">SRN (Static Resource Name)</label>
                <input
                  type="text"
                  readOnly
                  value={user?.institutionId ? `SRN-${user.institutionId.slice(-5).toUpperCase()}` : 'SRN-00000'}
                  className="bg-[#f2f4f6] border border-[#c3c6d1] text-[#43474f] rounded-lg px-4 py-2.5 font-mono text-sm cursor-not-allowed"
                />
              </motion.div>

              {/* Reporting Month */}
              <motion.div
                className="flex flex-col gap-2"
                variants={staggerItem}
                transition={staggerItemTransition}
              >
                <label className="text-sm font-semibold text-[#191c1e]">
                  Reporting Month <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="month"
                  {...register('reporting_month')}
                  className="w-full border border-[#c3c6d1] text-[#191c1e] rounded-lg px-4 py-2.5 text-base focus:border-[#28628f] focus:ring-2 focus:ring-[#28628f]/20 outline-none"
                />
                {errors.reporting_month && (
                  <p className="text-xs text-[#ba1a1a] mt-1">{errors.reporting_month.message}</p>
                )}
                <p className="text-xs text-[#43474f] mt-0.5">
                  Submission will be applied to the last day of the selected month.
                </p>
              </motion.div>

              {/* File Type */}
              <motion.div
                className="flex flex-col gap-2"
                variants={staggerItem}
                transition={staggerItemTransition}
              >
                <label className="text-sm font-semibold text-[#191c1e]">File Type</label>
                <div className="flex gap-6 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      value="LIVE"
                      {...register('file_type')}
                      className="text-[#001e40] focus:ring-[#001e40] h-5 w-5 border-[#c3c6d1]"
                    />
                    <span className="text-base text-[#191c1e] group-hover:text-[#001e40] transition-colors">LIVE</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      value="TEST"
                      {...register('file_type')}
                      className="text-[#001e40] focus:ring-[#001e40] h-5 w-5 border-[#c3c6d1]"
                    />
                    <span className="text-base text-[#191c1e] group-hover:text-[#001e40] transition-colors">TEST</span>
                  </label>
                </div>
                <AnimatePresence>
                  {fileType === 'LIVE' && (
                    <motion.div
                      variants={expandHeight}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={expandTransition}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded">
                        <AlertTriangle className="w-4 h-4" />
                        LIVE batches will be submitted to the national credit database.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Sequence Number */}
              <motion.div
                className="flex flex-col gap-2"
                variants={staggerItem}
                transition={staggerItemTransition}
              >
                <label className="text-sm font-semibold text-[#191c1e]">Sequence Number</label>
                <input
                  type="number"
                  min={1}
                  {...register('sequence_number')}
                  className="border border-[#c3c6d1] text-[#191c1e] rounded-lg px-4 py-2.5 font-mono text-sm focus:border-[#28628f] focus:ring-2 focus:ring-[#28628f]/20 outline-none"
                />
              </motion.div>

              {/* Idempotency Key */}
              <motion.div
                className="flex flex-col gap-2 md:col-span-2"
                variants={staggerItem}
                transition={staggerItemTransition}
              >
                <label className="text-sm font-semibold text-[#191c1e]">Idempotency Key</label>
                <div className="flex items-center bg-[#f2f4f6] border border-[#c3c6d1] rounded-lg px-4 py-2.5">
                  <span className="font-mono text-sm text-[#43474f] flex-grow truncate">{idempotencyKey}</span>
                  <button
                    type="button"
                    onClick={copyKey}
                    className="ml-2 text-[#737780] hover:text-[#001e40] transition-colors flex items-center gap-1 text-xs font-semibold shrink-0"
                    title="Copy to clipboard"
                  >
                    <AnimatePresence mode="wait">
                      {copiedKey ? (
                        <motion.span
                          key="check"
                          variants={scaleIn}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={spring.crisp}
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="copy"
                          variants={scaleIn}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={spring.crisp}
                        >
                          <Copy className="w-4 h-4" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {copiedKey ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-[#43474f]">Auto-generated. Used to prevent duplicate submissions.</p>
              </motion.div>
            </motion.div>

            {/* Upload Section */}
            <div className="mt-8">
              <label className="text-sm font-semibold text-[#191c1e] mb-2 block">Data File (.txt)</label>

              <AnimatePresence mode="wait">
                {!selectedFile ? (
                  <motion.div
                    key="dropzone"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={isDragOver
                      ? { opacity: 1, scale: 1.02, backgroundColor: '#f0f7ff' }
                      : { opacity: 1, scale: 1, backgroundColor: '#ffffff' }
                    }
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={spring.soft}
                    whileHover={{ borderColor: '#28628f', scale: 1.005 }}
                    className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer group relative overflow-hidden ${
                      isDragOver ? 'border-[#28628f]' : 'border-[#c3c6d1]'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="absolute inset-0 opacity-5 pointer-events-none"
                      style={{ backgroundImage: 'radial-gradient(#003366 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                    />
                    <div className="relative z-10">
                      <motion.div
                        className="w-16 h-16 bg-[#97ccfe] text-[#001e40] rounded-full flex items-center justify-center mx-auto mb-4"
                        animate={{
                          scale: isDragOver ? 1.15 : 1,
                          rotate: isDragOver ? -10 : 0,
                        }}
                        transition={spring.soft}
                      >
                        <Upload className="w-8 h-8" />
                      </motion.div>
                      <p className="text-sm font-semibold text-[#43474f] mb-1">
                        Drag and drop .txt file or{' '}
                        <span className="text-[#28628f] underline">click to browse</span>
                      </p>
                      <p className="text-xs text-[#737780]">Max file size: 50MB. Only encrypted .txt formats accepted.</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,text/plain"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="file-preview"
                    className="mt-6 p-6 bg-[#f7f9fb] border border-[#c3c6d1] rounded-lg"
                    variants={fadeUp}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={fadeUpTransition}
                  >
                    <div className="flex items-start gap-6">
                      <FileText className="w-8 h-8 text-[#001e40]" />
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-semibold text-[#191c1e] truncate mr-4">{selectedFile.name}</h4>
                          <span className="text-sm text-[#737780] shrink-0">{formatFileSize(selectedFile.size)}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-[#737780]">Ready for submission</span>
                          <motion.span
                            className="w-2 h-2 bg-emerald-500 rounded-full"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={spring.crisp}
                          />
                        </div>
                      </div>
                      <motion.button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Trash2 className="w-4 h-4 text-[#737780] hover:text-[#ba1a1a] transition-colors shrink-0 cursor-pointer" />
                      </motion.button>
                    </div>
                    <p className="mt-3 text-xs text-[#28628f] bg-[#97ccfe]/10 p-2 rounded flex items-center gap-1 border border-[#97ccfe]/20">
                      <Info className="w-4 h-4" />
                      File naming convention will be validated against BCG protocols during processing.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error */}
            {mutation.isError && (
              <Alert variant="error">
                Submission failed: {(mutation.error as Error)?.message ?? 'Unknown error'}
              </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-6 pt-8 border-t border-[#c3c6d1]">
              <Link
                href="/batches"
                className="px-12 py-4 rounded-lg font-semibold text-[#28628f] hover:bg-[#97ccfe]/20 transition-all text-sm"
              >
                Cancel
              </Link>
              <motion.button
                type="submit"
                disabled={mutation.isPending}
                className="px-12 py-4 bg-[#003366] text-[#799dd6] rounded-lg font-semibold shadow-md flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                whileHover={{ scale: 1.02, boxShadow: '0 6px 24px rgba(0,30,64,0.4)' }}
                whileTap={{ scale: 0.97 }}
              >
                {mutation.isPending ? <Spinner /> : null}
                <span>Submit Batch</span>
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>

      {/* Feature Cards */}
      <motion.div
        className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6"
        variants={staggerContainer(0.08)}
        initial="initial"
        animate="animate"
      >
        {(() => {
          const iconMap: Record<string, React.ReactNode> = {
            security: <Shield className="w-6 h-6 text-[#001e40]" />,
            verified: <CheckCircle className="w-6 h-6 text-[#001e40]" />,
            history:  <History className="w-6 h-6 text-[#001e40]" />,
          };
          return [
            { icon: 'security', title: 'Encrypted Channel', desc: '256-bit AES protection on all uploads.' },
            { icon: 'verified', title: 'Auto-Validation',  desc: 'Schema check performed instantly.' },
            { icon: 'history',  title: 'Audit Trail',      desc: 'Submission logged for compliance.' },
          ].map(({ icon, title, desc }) => (
            <motion.div
              key={icon}
              className="bg-[#f2f4f6] p-6 rounded-xl border border-[#c3c6d1] flex items-center gap-6"
              variants={staggerItem}
              transition={staggerItemTransition}
              whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
            >
              <motion.div
                className="w-10 h-10 bg-[#001e40]/10 rounded-lg flex items-center justify-center shrink-0"
                whileHover={{ rotate: 8, scale: 1.1 }}
                transition={spring.crisp}
              >
                {iconMap[icon]}
              </motion.div>
              <div>
                <h5 className="text-sm font-semibold text-[#191c1e]">{title}</h5>
                <p className="text-sm text-[#43474f]">{desc}</p>
              </div>
            </motion.div>
          ));
        })()}
      </motion.div>

      {/* LIVE Confirmation Modal */}
      <AnimatePresence>
        {showLiveConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
              variants={scaleIn}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={spring.crisp}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: [-2, 2, -2] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                  </motion.div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#001e40]">Confirm LIVE Submission</h3>
                  <p className="text-sm text-[#43474f]">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-[#43474f] mb-6 leading-relaxed">
                You are about to submit a <strong>LIVE</strong> batch to the MFCB National Credit Database.
                This data will be permanently recorded and affect credit profiles. Please confirm this is intended.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowLiveConfirm(false); setPendingSubmit(false); }}
                  className="px-6 py-2.5 text-sm font-semibold text-[#43474f] hover:bg-[#eceef0] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLiveSubmit}
                  className="px-6 py-2.5 text-sm font-semibold bg-[#001e40] text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Confirm LIVE Submission
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
