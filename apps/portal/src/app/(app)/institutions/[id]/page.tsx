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
  Download,
  Users,
  ServerCog,
  Webhook,
  KeyRound,
  CheckCircle,
  Ban,
  Save,
  TrendingUp,
} from '@/lib/icons';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  spring, fadeUp, fadeUpTransition, scaleIn, fadeIn,
} from '@/lib/motion';

interface Institution {
  institution_id: string;
  name: string;
  supplier_reference_number: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  integration_channel: string;
  enabled_products: string[];
  onboarded_at: string | null;
  created_at: string;
}

const editSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  allowed_ip_ranges: z.string().optional(),
  enabled_products: z.array(z.string()).optional(),
});

type EditForm = z.infer<typeof editSchema>;

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-600', label: 'Active' },
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-600', label: 'Pending' },
  SUSPENDED: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-600', label: 'Suspended' },
  DEACTIVATED: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500', label: 'Deactivated' },
};

const ACCOUNT_TYPES = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

export default function InstitutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: institution, isLoading, isError } = useQuery<Institution>({
    queryKey: ['institution', id],
    queryFn: async () => {
      const res = await api.get(`/institutions/${id}`);
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: institution
      ? {
          name: institution.name,
          allowed_ip_ranges: '',
          enabled_products: institution.enabled_products ?? [],
        }
      : undefined,
  });

  const editMutation = useMutation({
    mutationFn: (data: EditForm) => api.patch(`/institutions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution', id] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => api.post(`/institutions/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution', id] });
      setActionError(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setActionError(e?.response?.data?.message ?? 'Failed to activate institution.');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: () => api.post(`/institutions/${id}/suspend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution', id] });
      setActionError(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setActionError(e?.response?.data?.message ?? 'Failed to suspend institution.');
    },
  });

  const onSave = async (data: EditForm) => {
    await editMutation.mutateAsync(data);
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: 'Users', href: `/institutions/${id}/users` },
    { key: 'sftp', label: 'SFTP Config', href: `/institutions/${id}/sftp` },
    { key: 'webhooks', label: 'Webhooks', href: `/institutions/${id}/webhooks` },
    { key: 'api', label: 'API Clients', href: `/institutions/${id}/api-clients` },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#43474f]">
          <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading institution...
        </div>
      </div>
    );
  }

  if (isError || !institution) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md text-center">
          <p className="text-red-700 font-medium mb-4">Failed to load institution details.</p>
          <button
            onClick={() => router.push('/institutions')}
            className="text-sm text-[#28628f] hover:underline"
          >
            Back to Registry
          </button>
        </div>
      </div>
    );
  }

  const s = STATUS_STYLES[institution.status] ?? STATUS_STYLES.DEACTIVATED;

  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        transition={fadeUpTransition}
        className="pt-6 pb-16 px-6 max-w-[1280px] mx-auto"
      >
        {/* Page Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-[40px] leading-[1.2] font-bold text-[#001e40] tracking-tight">
                {institution.name}
              </h1>
              <motion.span
                variants={scaleIn}
                initial="initial"
                animate="animate"
                transition={spring.crisp}
                className={`inline-flex items-center px-3 py-1 rounded-full ${s.bg} ${s.text} text-sm font-semibold`}
              >
                <span className={`w-2 h-2 rounded-full ${s.dot} mr-2`} />
                {s.label}
              </motion.span>
            </div>
            <nav className="flex items-center gap-2 text-[#737780] text-sm">
              <button
                onClick={() => router.push('/institutions')}
                className="hover:text-[#001e40] transition-colors"
              >
                Institutions
              </button>
              <ChevronRight className="h-4 w-4" />
              <span className="text-[#191c1e]">Institution Profile</span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {hasPermission('institutions:edit') && institution.status === 'PENDING' && (
              <motion.button
                onClick={() => activateMutation.mutate()}
                disabled={activateMutation.isPending}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.crisp}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                <CheckCircle className="h-4 w-4" />
                {activateMutation.isPending ? 'Activating...' : 'Activate'}
              </motion.button>
            )}
            {hasPermission('institutions:suspend') && institution.status === 'ACTIVE' && (
              <motion.button
                onClick={() => suspendMutation.mutate()}
                disabled={suspendMutation.isPending}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.crisp}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                <Ban className="h-4 w-4" />
                {suspendMutation.isPending ? 'Suspending...' : 'Suspend'}
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.crisp}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#28628f] text-[#28628f] rounded-lg font-semibold text-sm hover:bg-[#cee5ff] transition-colors"
            >
              <Download className="h-4 w-4" />
              Export Profile
            </motion.button>
          </div>
        </header>

        {actionError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {actionError}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-[#c3c6d1] mb-12 gap-12 relative">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                if (tab.href) {
                  router.push(tab.href);
                } else {
                  setActiveTab(tab.key);
                }
              }}
              className={`pb-6 text-sm font-semibold whitespace-nowrap transition-colors relative ${
                activeTab === tab.key
                  ? 'text-[#001e40]'
                  : 'text-[#737780] hover:text-[#28628f]'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.span
                  layoutId="institution-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#001e40]"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content with AnimatePresence */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.18 }}
          >
            {/* Overview Tab Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Left: Institution Info Form */}
              <div className="lg:col-span-2 space-y-12">
                <section className="bg-white rounded-xl border border-[#c3c6d1] p-6 shadow-sm">
                  <h2 className="text-2xl font-semibold text-[#001e40] mb-6">Institution Information</h2>

                  {saveSuccess && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Changes saved successfully.
                    </div>
                  )}
                  {editMutation.isError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {(editMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save changes.'}
                    </div>
                  )}

                  <form onSubmit={handleSubmit(onSave)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-[#191c1e] mb-2">
                          Institution Name
                        </label>
                        <input
                          {...register('name')}
                          type="text"
                          className="w-full px-4 py-3 bg-white border border-[#c3c6d1] rounded-lg focus:ring-2 focus:ring-[#28628f] focus:border-[#28628f] outline-none text-base"
                        />
                        {errors.name && (
                          <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#191c1e] mb-2">
                          SRN (System Reference Number)
                        </label>
                        <div className="w-full px-4 py-3 bg-[#f2f4f6] border border-[#c3c6d1] rounded-lg text-sm text-[#737780] font-mono cursor-not-allowed">
                          {institution.supplier_reference_number}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#191c1e] mb-2">
                          Status
                        </label>
                        <div className={`inline-flex items-center px-3 py-2 rounded-lg ${s.bg} ${s.text} text-sm font-semibold`}>
                          <span className={`w-2 h-2 rounded-full ${s.dot} mr-2`} />
                          {s.label}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#191c1e] mb-2">
                          Onboarded At
                        </label>
                        <div className="w-full px-4 py-3 bg-[#f2f4f6] border border-[#c3c6d1] rounded-lg text-sm text-[#737780]">
                          {institution.onboarded_at
                            ? new Date(institution.onboarded_at).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                              })
                            : 'Not yet onboarded'}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-[#191c1e] mb-2">
                          Integration Channel
                        </label>
                        <div className="flex items-center px-4 py-3 bg-[#f2f4f6] border border-[#c3c6d1] rounded-lg text-base text-[#191c1e]">
                          <ServerCog className="h-4 w-4 text-[#28628f] mr-3" />
                          {institution.integration_channel?.replace(/_/g, ' ')}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#191c1e] mb-2">
                          Enabled Products
                        </label>
                        <div className="flex flex-wrap gap-2 p-3 border border-[#c3c6d1] rounded-lg bg-white min-h-[48px]">
                          {(institution.enabled_products ?? []).map((product) => (
                            <span
                              key={product}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-[#cee5ff] text-[#175683] rounded-full text-sm font-medium"
                            >
                              {product}
                            </span>
                          ))}
                          {(!institution.enabled_products || institution.enabled_products.length === 0) && (
                            <span className="text-sm text-[#737780]">No products enabled</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#191c1e] mb-2">
                          Allowed IP Ranges
                        </label>
                        <textarea
                          {...register('allowed_ip_ranges')}
                          rows={3}
                          placeholder="e.g. 192.168.1.1/24, 41.21.192.5"
                          className="w-full px-4 py-3 bg-white border border-[#c3c6d1] rounded-lg focus:ring-2 focus:ring-[#28628f] focus:border-[#28628f] outline-none font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#191c1e] mb-2">
                          Created At
                        </label>
                        <div className="w-full px-4 py-3 bg-[#f2f4f6] border border-[#c3c6d1] rounded-lg text-sm text-[#737780]">
                          {new Date(institution.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>

                    {hasPermission('institutions:edit') && (
                      <div className="md:col-span-2 pt-6 border-t border-[#c3c6d1] flex justify-end">
                        <motion.button
                          type="submit"
                          disabled={isSubmitting}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.97 }}
                          transition={spring.crisp}
                          className="inline-flex items-center gap-2 px-8 py-3 bg-[#003366] text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                          <Save className="h-4 w-4" />
                          {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </motion.button>
                      </div>
                    )}
                  </form>
                </section>

                {/* Stats Snapshot */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 border border-[#c3c6d1] rounded-xl shadow-sm">
                    <span className="text-[#737780] text-sm font-medium">MTD Submissions</span>
                    <div className="text-3xl font-bold text-[#001e40] mt-2">—</div>
                    <div className="flex items-center gap-1 text-emerald-600 text-sm mt-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>Real-time data</span>
                    </div>
                  </div>
                  <div className="bg-white p-6 border border-[#c3c6d1] rounded-xl shadow-sm">
                    <span className="text-[#737780] text-sm font-medium">Data Integrity Score</span>
                    <div className="text-3xl font-bold text-[#001e40] mt-2">—</div>
                    <div className="w-full bg-[#e6e8ea] h-2 rounded-full mt-3 overflow-hidden">
                      <div className="bg-emerald-500 h-full w-0" />
                    </div>
                  </div>
                  <div className="bg-white p-6 border border-[#c3c6d1] rounded-xl shadow-sm">
                    <span className="text-[#737780] text-sm font-medium">Support Tickets</span>
                    <div className="text-3xl font-bold text-[#001e40] mt-2">—</div>
                    <div className="text-amber-600 text-sm mt-2">Awaiting data</div>
                  </div>
                </section>
              </div>

              {/* Right: Quick Links Sidebar */}
              <div className="space-y-6">
                <section className="bg-white rounded-xl border border-[#c3c6d1] p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-[#001e40] mb-4">Quick Navigation</h2>
                  <div className="space-y-3">
                    {[
                      {
                        label: 'Users',
                        desc: 'Manage institutional users',
                        icon: Users,
                        href: `/institutions/${id}/users`,
                      },
                      {
                        label: 'SFTP Config',
                        desc: 'File transfer settings',
                        icon: ServerCog,
                        href: `/institutions/${id}/sftp`,
                      },
                      {
                        label: 'Webhooks',
                        desc: 'Real-time event notifications',
                        icon: Webhook,
                        href: `/institutions/${id}/webhooks`,
                      },
                      {
                        label: 'API Clients',
                        desc: 'OAuth credentials & scopes',
                        icon: KeyRound,
                        href: `/institutions/${id}/api-clients`,
                      },
                    ].map((link) => (
                      <button
                        key={link.label}
                        onClick={() => router.push(link.href)}
                        className="w-full flex items-center gap-4 p-3 rounded-lg border border-[#c3c6d1] hover:bg-[#f2f4f6] transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-[#003366] flex items-center justify-center flex-shrink-0">
                          <link.icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#191c1e]">{link.label}</p>
                          <p className="text-xs text-[#737780]">{link.desc}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#737780] ml-auto" />
                      </button>
                    ))}
                  </div>
                </section>

                {/* Security Notice */}
                <div className="bg-[#3f465c] p-6 rounded-xl text-white">
                  <div className="flex items-start gap-4">
                    <KeyRound className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Security Protocol</h4>
                      <p className="text-sm opacity-90 leading-snug">
                        Ensure all API calls use TLS 1.3. Credentials should never be stored in plaintext.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
