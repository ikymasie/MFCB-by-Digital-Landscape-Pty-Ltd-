'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Lock,
  Shield,
  History,
  Wifi,
  Server,
  Plus,
  Trash2,
  Save,
  Activity,
} from '@/lib/icons';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  spring, fadeUp, fadeUpTransition, scaleIn, staggerContainer, staggerItem, staggerItemTransition,
} from '@/lib/motion';

interface SFTPConfig {
  sftp_id?: string;
  institution_id: string;
  sftp_directory: string;
  pickup_schedule_cron: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DISABLED';
  authorized_keys: string[];
}

const sftpSchema = z.object({
  pickup_schedule_cron: z.string().min(1, 'Schedule is required'),
  authorized_keys_text: z.string().optional(),
});

type SFTPForm = z.infer<typeof sftpSchema>;

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-amber-100 text-amber-800',
  DISABLED: 'bg-gray-100 text-gray-700',
};

export default function SFTPConfigPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasRole } = useAuthStore();

  const canEdit = hasRole('SUPER_ADMIN') || hasRole('BUREAU_OPS');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const { data: sftp, isLoading, isError } = useQuery<SFTPConfig>({
    queryKey: ['sftp-config', id],
    queryFn: async () => {
      const res = await api.get(`/institutions/${id}/sftp`);
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SFTPForm>({
    resolver: zodResolver(sftpSchema),
    values: sftp
      ? {
          pickup_schedule_cron: sftp.pickup_schedule_cron ?? '0 1 * * *',
          authorized_keys_text: (sftp.authorized_keys ?? []).join('\n'),
        }
      : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: (data: SFTPForm) => {
      const keys = (data.authorized_keys_text ?? '')
        .split('\n')
        .map((k) => k.trim())
        .filter(Boolean);
      return api.patch(`/institutions/${id}/sftp`, {
        pickup_schedule_cron: data.pickup_schedule_cron,
        authorized_keys: keys,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sftp-config', id] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const addKeyMutation = useMutation({
    mutationFn: (key: string) =>
      api.post(`/institutions/${id}/sftp/keys`, { public_key: key }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sftp-config', id] });
      setNewKey('');
      setKeyError(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setKeyError(e?.response?.data?.message ?? 'Failed to add key.');
    },
  });

  const removeKeyMutation = useMutation({
    mutationFn: (keyIdx: number) =>
      api.delete(`/institutions/${id}/sftp/keys/${keyIdx}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sftp-config', id] });
    },
  });

  const onSave = handleSubmit(async (data) => {
    await saveMutation.mutateAsync(data);
  });

  const handleAddKey = () => {
    if (!newKey.trim()) {
      setKeyError('Please enter a public key.');
      return;
    }
    addKeyMutation.mutate(newKey.trim());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#43474f]">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading SFTP configuration...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md text-center">
          <p className="text-red-700 font-medium mb-4">Failed to load SFTP configuration.</p>
          <button
            onClick={() => router.push(`/institutions/${id}`)}
            className="text-sm text-[#28628f] hover:underline"
          >
            Back to Institution Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      <main className="mt-0 flex-grow flex flex-col items-center py-16 px-6">
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={fadeUpTransition}
          className="w-full max-w-4xl"
        >
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-6 text-[#737780] text-sm">
            <button
              onClick={() => router.push('/institutions')}
              className="hover:text-[#001e40] transition-colors"
            >
              Institutions
            </button>
            <ChevronRight className="h-4 w-4" />
            <button
              onClick={() => router.push(`/institutions/${id}`)}
              className="hover:text-[#001e40] transition-colors"
            >
              Institution Profile
            </button>
            <ChevronRight className="h-4 w-4" />
            <span className="text-[#191c1e] font-medium">SFTP Configuration</span>
          </nav>

          {/* Page Header */}
          <header className="mb-12">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-[40px] leading-[1.2] font-bold text-[#001e40] tracking-tight">
                SFTP Configuration
              </h1>
              {sftp?.status && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[sftp.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {sftp.status}
                </span>
              )}
            </div>
            <p className="text-base text-[#43474f] max-w-2xl">
              Configure the Secure File Transfer Protocol settings for automated data submission.
              This connection is used for encrypted exchange of financial records.
            </p>
          </header>

          {saveSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              SFTP configuration saved successfully.
            </div>
          )}

          {saveMutation.isError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save configuration.'}
            </div>
          )}

          {/* Configuration Card */}
          <section className="bg-white border border-[#c3c6d1] rounded-xl shadow-sm p-12">
            <form onSubmit={onSave} className="flex flex-col gap-12">
              {/* Connection Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-[#191c1e]">SFTP Directory Path</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={sftp?.sftp_directory ?? ''}
                      readOnly
                      className="w-full bg-[#f2f4f6] border border-[#c3c6d1] rounded px-4 py-3 font-mono text-sm text-[#43474f] cursor-not-allowed outline-none pr-10"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#737780]" />
                  </div>
                  <p className="text-sm text-[#737780]">Standardized incoming directory for institutional data ingest.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-[#191c1e]">Pickup Schedule (cron)</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-grow">
                      <input
                        {...register('pickup_schedule_cron')}
                        type="text"
                        placeholder="0 1 * * *"
                        disabled={!canEdit}
                        className="w-full border border-[#737780] px-4 py-3 rounded font-mono text-sm focus:border-[#28628f] focus:ring-2 focus:ring-[#97ccfe] transition-all outline-none disabled:bg-[#f2f4f6] disabled:cursor-not-allowed"
                      />
                      {errors.pickup_schedule_cron && (
                        <p className="text-xs text-red-600 mt-1">{errors.pickup_schedule_cron.message}</p>
                      )}
                    </div>
                    <div className="bg-[#e6e8ea] px-4 py-3 rounded border border-[#c3c6d1] flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      <span className="text-sm font-medium">Daily</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#737780]">Batch processing schedule in cron format (CAT timezone).</p>
                </div>
              </div>

              {/* Authorized Public Keys */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-[#191c1e]">
                  Authorized Public Keys (OpenSSH/PEM)
                </label>

                {/* Existing keys list */}
                {sftp?.authorized_keys && sftp.authorized_keys.length > 0 && (
                  <motion.div
                    variants={staggerContainer(0.04)}
                    initial="initial"
                    animate="animate"
                    className="space-y-2"
                  >
                    {sftp.authorized_keys.map((key, idx) => (
                      <motion.div
                        key={idx}
                        variants={staggerItem}
                        transition={staggerItemTransition}
                        className="flex items-center gap-3 p-3 bg-[#f2f4f6] border border-[#c3c6d1] rounded-lg"
                      >
                        <Server className="h-4 w-4 text-[#737780] flex-shrink-0" />
                        <span className="text-xs font-mono text-[#43474f] truncate flex-grow">
                          {key.length > 60 ? `${key.substring(0, 60)}...` : key}
                        </span>
                        {canEdit && (
                          <motion.button
                            type="button"
                            onClick={() => removeKeyMutation.mutate(idx)}
                            disabled={removeKeyMutation.isPending}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            transition={spring.crisp}
                            className="text-[#ba1a1a] hover:bg-[#ffdad6] p-1 rounded transition-colors flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </motion.button>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Add new key */}
                {canEdit ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={newKey}
                      onChange={(e) => { setNewKey(e.target.value); setKeyError(null); }}
                      rows={4}
                      placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
                      className="w-full font-mono text-sm border border-[#737780] px-4 py-3 rounded focus:border-[#28628f] focus:ring-2 focus:ring-[#97ccfe] transition-all outline-none resize-none"
                    />
                    {keyError && <p className="text-xs text-red-600">{keyError}</p>}
                    <motion.button
                      type="button"
                      onClick={handleAddKey}
                      disabled={addKeyMutation.isPending}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring.crisp}
                      className="self-start flex items-center gap-2 px-4 py-2 bg-[#28628f] text-white rounded-lg text-sm font-semibold hover:bg-[#001e40] transition-colors disabled:opacity-60"
                    >
                      <Plus className="h-4 w-4" />
                      {addKeyMutation.isPending ? 'Adding...' : 'Add Key'}
                    </motion.button>
                  </div>
                ) : (
                  <div className="p-3 bg-[#f2f4f6] border border-[#c3c6d1] rounded-lg">
                    <p className="text-sm text-[#43474f]">
                      {sftp?.authorized_keys?.length
                        ? `${sftp.authorized_keys.length} key(s) configured.`
                        : 'No authorized keys configured.'}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[#28628f] mt-1">
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">
                    Multiple keys can be added, one per line. Only RSA and ED25519 are supported.
                  </span>
                </div>
              </div>

              {/* File Naming Pattern */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#191c1e]">File Naming Pattern</label>
                <div className="bg-[#f2f4f6]/50 border border-[#003366]/20 rounded p-4">
                  <code className="font-mono text-[#001e40] font-semibold text-sm break-all">
                    {'{SRN}_ALL_{L/T}702_M_{CCYYMMDD}_{seq1}_{seq2}.txt'}
                  </code>
                </div>
                <p className="text-sm text-[#43474f]">
                  Files must adhere to this pattern for the automated validator to identify the
                  transmission source and type.
                </p>
              </div>

              {/* Action Bar */}
              {canEdit && (
                <div className="pt-6 border-t border-[#c3c6d1] flex flex-col sm:flex-row justify-between items-center gap-4">
                  <motion.button
                    type="button"
                    onClick={() => setTestResult('Feature coming soon')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={spring.crisp}
                    className="w-full sm:w-auto px-8 py-3 border border-[#28628f] text-[#28628f] rounded font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#cee5ff] transition-colors active:opacity-90"
                  >
                    <Wifi className="h-4 w-4" />
                    Test Connection
                  </motion.button>
                  {testResult && (
                    <span className="text-sm text-[#43474f] italic">{testResult}</span>
                  )}
                  <div className="flex w-full sm:w-auto gap-3">
                    <button
                      type="button"
                      onClick={() => router.push(`/institutions/${id}`)}
                      className="flex-1 sm:flex-none px-8 py-3 text-[#737780] hover:text-[#001e40] transition-colors font-semibold text-sm"
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring.crisp}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-10 py-3 bg-[#003366] text-white rounded font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {isSubmitting ? 'Saving...' : 'Save Configuration'}
                    </motion.button>
                  </div>
                </div>
              )}
            </form>
          </section>

          {/* Help Cards */}
          <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-[#f2f4f6] rounded border border-[#c3c6d1]">
              <Shield className="h-5 w-5 text-[#28628f] mb-2" />
              <h4 className="text-sm font-semibold text-[#191c1e] mb-2">Encryption Standard</h4>
              <p className="text-sm text-[#737780]">
                All transfers are secured using AES-256-CTR and must be initiated over SSH Port 22.
              </p>
            </div>
            <div className="p-6 bg-[#f2f4f6] rounded border border-[#c3c6d1]">
              <History className="h-5 w-5 text-[#28628f] mb-2" />
              <h4 className="text-sm font-semibold text-[#191c1e] mb-2">Audit Logs</h4>
              <p className="text-sm text-[#737780]">
                Detailed connection logs are retained for 90 days for compliance monitoring.
              </p>
            </div>
            <div className="p-6 bg-[#f2f4f6] rounded border border-[#c3c6d1]">
              <Lock className="h-5 w-5 text-[#28628f] mb-2" />
              <h4 className="text-sm font-semibold text-[#191c1e] mb-2">IP Whitelisting</h4>
              <p className="text-sm text-[#737780]">
                Ensure your source static IP is whitelisted in the Security Gateway settings.
              </p>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
