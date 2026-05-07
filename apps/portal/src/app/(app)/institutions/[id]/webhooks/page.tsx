'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronRight,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Webhook,
  Save,
  Info,
  BookOpen,
  RefreshCw,
  Zap,
} from '@/lib/icons';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface WebhookConfig {
  webhook_id?: string;
  institution_id: string;
  url: string;
  status: 'ACTIVE' | 'DISABLED' | 'INACTIVE';
  events: string[];
  secret?: string;
}

const WEBHOOK_EVENTS = [
  { key: 'batch.completed', label: 'Batch Completed', desc: 'Triggered when a batch is successfully processed.' },
  { key: 'batch.validation_failed', label: 'Validation Failed', desc: 'Triggered when a batch fails validation.' },
  { key: 'batch.rejected', label: 'Batch Rejected', desc: 'Triggered when a batch is rejected by the system.' },
];

const webhookSchema = z.object({
  url: z
    .string()
    .url('Must be a valid URL')
    .refine((v) => v.startsWith('https://'), 'URL must use HTTPS'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
  status: z.enum(['ACTIVE', 'DISABLED']),
});

type WebhookForm = z.infer<typeof webhookSchema>;

export default function WebhooksPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const { data: institution } = useQuery({
    queryKey: ['institution', id],
    queryFn: async () => {
      const res = await api.get(`/institutions/${id}`);
      return res.data;
    },
  });

  // Derive webhook from institution data or fetch separately
  const { data: webhookConfig, isLoading, isError } = useQuery<WebhookConfig | null>({
    queryKey: ['webhook-config', id],
    queryFn: async () => {
      try {
        const res = await api.get(`/institutions/${id}/webhooks`);
        return res.data;
      } catch (err: unknown) {
        const e = err as { response?: { status?: number } };
        if (e?.response?.status === 404) return null;
        throw err;
      }
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<WebhookForm>({
    resolver: zodResolver(webhookSchema),
    values: webhookConfig
      ? {
          url: webhookConfig.url ?? '',
          events: webhookConfig.events ?? [],
          status: (webhookConfig.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED') as 'ACTIVE' | 'DISABLED',
        }
      : {
          url: '',
          events: [],
          status: 'ACTIVE',
        },
  });

  const saveMutation = useMutation({
    mutationFn: (data: WebhookForm) => {
      if (webhookConfig?.webhook_id) {
        return api.patch(`/institutions/${id}/webhooks`, data);
      }
      return api.post(`/institutions/${id}/webhooks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-config', id] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const disableMutation = useMutation({
    mutationFn: () => api.patch(`/institutions/${id}/webhooks`, { status: 'DISABLED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-config', id] });
    },
  });

  const onSave = handleSubmit(async (data) => {
    await saveMutation.mutateAsync(data);
  });

  const handleCopySecret = () => {
    if (webhookConfig?.secret) {
      navigator.clipboard.writeText(webhookConfig.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTestWebhook = () => {
    setTestMessage('Feature coming soon — test webhook is not yet available.');
    setTimeout(() => setTestMessage(null), 4000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#43474f]">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading webhook configuration...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md text-center">
          <p className="text-red-700 font-medium mb-4">Failed to load webhook configuration.</p>
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
      <main className="flex-1 flex flex-col min-h-screen">
        <div className="p-12 max-w-5xl mx-auto w-full">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 mb-4 text-[#43474f] text-sm">
            <span>Management</span>
            <ChevronRight className="h-4 w-4" />
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
              {institution?.name ?? 'Institution'}
            </button>
            <ChevronRight className="h-4 w-4" />
            <span className="text-sm font-semibold text-[#001e40]">Webhooks</span>
          </nav>

          {/* Page Header */}
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <Webhook className="h-7 w-7 text-[#001e40]" />
              <h2 className="text-3xl font-semibold text-[#001e40]">Webhook Configuration</h2>
            </div>
            <p className="text-base text-[#43474f] max-w-2xl">
              Configure real-time notifications to receive automated updates on credit batch processing
              statuses and validation alerts directly to your server.
            </p>
          </header>

          {/* Info Alert */}
          <div className="bg-[#cee5ff] text-[#001d32] p-4 rounded-lg flex gap-3 mb-12 border border-[#c3c6d1]">
            <Info className="h-5 w-5 text-[#28628f] flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              Webhooks are triggered automatically when batch processing status changes. Ensure your
              endpoint is publicly accessible and capable of handling POST requests.
            </p>
          </div>

          {saveSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Webhook configuration saved successfully.
            </div>
          )}

          {testMessage && (
            <div className="mb-6 p-4 bg-[#f2f4f6] border border-[#c3c6d1] rounded-lg text-sm text-[#43474f] flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              {testMessage}
            </div>
          )}

          {/* Configuration Form */}
          <div className="bg-white border border-[#c3c6d1] rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#c3c6d1] bg-[#f2f4f6]">
              <h3 className="text-xs font-bold text-[#001e40] uppercase tracking-widest">
                Webhook Endpoint
              </h3>
            </div>

            <form onSubmit={onSave}>
              <div className="p-6 grid grid-cols-1 gap-12">
                {/* URL Section */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-[#001e40]">Webhook URL</label>
                  <div className="relative">
                    <input
                      {...register('url')}
                      type="url"
                      placeholder="https://your-domain.com/webhooks"
                      className="w-full bg-white border border-[#c3c6d1] rounded-lg p-4 focus:ring-2 focus:ring-[#28628f] focus:border-[#28628f] transition-all text-base outline-none"
                    />
                  </div>
                  {errors.url && (
                    <p className="text-xs text-red-600">{errors.url.message}</p>
                  )}
                  <span className="text-sm text-[#43474f] flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    HTTPS required for security
                  </span>
                </div>

                {/* Secret Management */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-[#001e40]">Signing Secret</label>
                  <div className="flex items-center gap-3 bg-[#f2f4f6] border border-[#c3c6d1] rounded-lg p-4">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      readOnly
                      value={webhookConfig?.secret ?? '••••••••••••••••••••••••••••••••'}
                      className="flex-1 bg-transparent border-none focus:ring-0 font-mono text-sm text-[#43474f] cursor-default outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-[#28628f] font-semibold text-sm hover:underline flex items-center gap-1"
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showSecret ? 'Hide' : 'Show'}
                    </button>
                    <div className="w-px h-4 bg-[#c3c6d1]" />
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="p-2 hover:bg-[#e6e8ea] rounded transition-colors text-[#43474f]"
                      title="Copy to clipboard"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  {copied && (
                    <p className="text-xs text-emerald-600 font-medium">Copied to clipboard!</p>
                  )}
                  <span className="text-sm text-[#43474f]">
                    Used for HMAC-SHA256 signature verification.
                  </span>
                </div>

                {/* Events Section */}
                <div className="flex flex-col gap-4">
                  <label className="text-sm font-semibold text-[#001e40]">Events Subscribed</label>
                  <Controller
                    control={control}
                    name="events"
                    render={({ field }) => (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {WEBHOOK_EVENTS.map((event) => {
                          const isChecked = field.value?.includes(event.key) ?? false;
                          return (
                            <label
                              key={event.key}
                              className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-[#f2f4f6] transition-colors ${
                                isChecked ? 'border-[#28628f] bg-[#f2f4f6]' : 'border-[#c3c6d1]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    field.onChange([...(field.value ?? []), event.key]);
                                  } else {
                                    field.onChange(
                                      (field.value ?? []).filter((v) => v !== event.key)
                                    );
                                  }
                                }}
                                className="w-5 h-5 rounded text-[#001e40] border-[#c3c6d1] focus:ring-[#001e40] mt-0.5"
                              />
                              <div>
                                <span className="text-sm text-[#191c1e] font-medium block">
                                  {event.label}
                                </span>
                                <span className="text-xs text-[#737780]">{event.desc}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  />
                  {errors.events && (
                    <p className="text-xs text-red-600">{errors.events.message}</p>
                  )}
                </div>

                {/* Status Toggle */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-[#001e40]">Webhook Status</label>
                  <div className="flex gap-4">
                    {(['ACTIVE', 'DISABLED'] as const).map((s) => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input
                          {...register('status')}
                          type="radio"
                          value={s}
                          className="w-4 h-4 text-[#001e40] border-[#c3c6d1] focus:ring-[#001e40]"
                        />
                        <span className={`text-sm font-medium ${s === 'ACTIVE' ? 'text-emerald-700' : 'text-[#43474f]'}`}>
                          {s === 'ACTIVE' ? 'Active' : 'Disabled'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Retry Policy */}
                <div className="bg-[#f2f4f6] p-4 rounded-lg border border-[#c3c6d1]">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="text-sm font-semibold text-[#001e40]">Retry Policy</label>
                      <p className="text-sm text-[#43474f] mt-1">3 retries with exponential backoff</p>
                    </div>
                    <RefreshCw className="h-5 w-5 text-[#737780]" />
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-6 bg-[#f2f4f6] border-t border-[#c3c6d1] flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => disableMutation.mutate()}
                  disabled={disableMutation.isPending || webhookConfig?.status === 'DISABLED'}
                  className="flex items-center gap-2 font-semibold text-sm text-[#ba1a1a] hover:bg-[#ffdad6]/50 px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  Disable Webhook
                </button>
                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    className="border border-[#28628f] text-[#28628f] px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#97ccfe] transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Test Webhook
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 bg-[#003366] text-white px-8 py-2 rounded-lg font-semibold text-sm shadow hover:brightness-110 transition-all active:scale-95 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {isSubmitting ? 'Saving...' : 'Save Webhook'}
                  </button>
                </div>
              </div>

              {saveMutation.isError && (
                <div className="mx-6 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save webhook configuration.'}
                </div>
              )}
            </form>
          </div>

          {/* Documentation Link */}
          <div className="mt-12 flex items-center justify-center gap-3 text-[#43474f]">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm">
              Need help? Read the{' '}
              <a href="#" className="text-[#28628f] font-semibold hover:underline">
                Webhook Documentation
              </a>{' '}
              for payload structures and security best practices.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
