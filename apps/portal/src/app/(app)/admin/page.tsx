'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  spring,
  fadeUp,
  fadeUpTransition,
  scaleIn,
  fadeIn,
  staggerContainer,
  staggerItem,
  staggerItemTransition,
} from '@/lib/motion';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

interface User {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  institutionName?: string;
  institutionId?: string;
  status: string;
  mfaEnrolled?: boolean;
  lastLoginAt?: string;
}

const ROLES = [
  'SUPER_ADMIN',
  'BUREAU_ADMIN',
  'BUREAU_ANALYST',
  'COMPLIANCE_OFFICER',
  'INST_ADMIN',
  'INST_USER',
];

const STATUS_OPTIONS = ['ACTIVE', 'SUSPENDED', 'PENDING'];

const inviteSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.string().min(1, 'Role is required'),
  institutionId: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

const editSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  status: z.string().min(1, 'Status is required'),
});

type EditFormValues = z.infer<typeof editSchema>;

function getRoleStyle(role: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'bg-red-100 text-red-800';
    case 'BUREAU_ADMIN':
      return 'bg-primary-container/30 text-primary';
    case 'BUREAU_ANALYST':
      return 'bg-blue-100 text-blue-800';
    case 'COMPLIANCE_OFFICER':
      return 'bg-purple-100 text-purple-800';
    case 'INST_ADMIN':
      return 'bg-orange-100 text-orange-800';
    case 'INST_USER':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function UserStatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  if (s === 'ACTIVE')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
        Active
      </span>
    );
  if (s === 'SUSPENDED')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
        Suspended
      </span>
    );
  if (s === 'PENDING')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
        Pending
      </span>
    );
  return <Badge variant="neutral">{status}</Badge>;
}

export default function AdminPage() {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const canMfaReset = hasPermission('users:mfa_reset');

  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [mfaResetTarget, setMfaResetTarget] = useState<User | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const buildParams = () => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (roleFilter) params.set('role', roleFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (searchQuery) params.set('q', searchQuery);
    return params.toString();
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', page, roleFilter, statusFilter, searchQuery],
    queryFn: () => api.get(`/users?${buildParams()}`).then((r) => r.data),
  });

  const { data: institutionsData } = useQuery({
    queryKey: ['admin-institutions'],
    queryFn: () => api.get('/institutions?status=ACTIVE').then((r) => r.data),
  });

  const institutions: { id: string; name: string }[] = institutionsData?.data ?? institutionsData ?? [];
  const users: User[] = data?.data ?? data?.users ?? [];
  const total: number = data?.total ?? data?.meta?.total ?? users.length;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  // Invite form
  const {
    register: registerInvite,
    handleSubmit: handleInviteSubmit,
    reset: resetInvite,
    formState: { errors: inviteErrors },
  } = useForm<InviteFormValues>({ resolver: zodResolver(inviteSchema) });

  // Edit form
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditFormValues>({ resolver: zodResolver(editSchema) });

  const inviteMutation = useMutation({
    mutationFn: (values: InviteFormValues) => api.post('/users/invite', values),
    onSuccess: () => {
      setSuccessMsg('Invitation sent successfully.');
      resetInvite();
      setShowInviteModal(false);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => setErrorMsg('Failed to send invitation.'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: EditFormValues }) =>
      api.patch(`/users/${id}`, values),
    onSuccess: () => {
      setSuccessMsg('User updated successfully.');
      setEditTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => setErrorMsg('Failed to update user.'),
  });

  const mfaResetMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/mfa-reset`),
    onSuccess: () => {
      setSuccessMsg('MFA reset initiated. User will be prompted to re-enrol.');
      setMfaResetTarget(null);
    },
    onError: () => setErrorMsg('Failed to reset MFA.'),
  });

  const openEdit = (user: User) => {
    resetEdit({ role: user.role, status: user.status });
    setEditTarget(user);
  };

  const getDisplayName = (u: User) => {
    if (u.name) return u.name;
    if (u.firstName || u.lastName) return [u.firstName, u.lastName].filter(Boolean).join(' ');
    return u.email.split('@')[0];
  };

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
      className="p-6 max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">User Administration</h1>
          <p className="text-sm text-outline mt-1">
            Platform-level user management — roles, status, and MFA
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, boxShadow: '0 4px 16px rgba(0,30,64,0.25)' }}
          whileTap={{ scale: 0.97 }}
          transition={spring.crisp}
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          + Invite User
        </motion.button>
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

      {/* Filters */}
      <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-outline uppercase mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-outline uppercase mb-1">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
            >
              <option value="">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-outline uppercase mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">Platform Users</h2>
          <span className="text-xs text-outline">{total.toLocaleString()} users</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            <p className="font-semibold">Failed to load users.</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-outline">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="font-semibold">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-surface-container-high border-b-2 border-primary-container">
                <tr>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Full Name</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Email</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Role</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Institution</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase text-center">Status</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase text-center">MFA</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase">Last Login</th>
                  <th className="px-5 py-3 font-semibold text-primary text-xs uppercase text-center">Actions</th>
                </tr>
              </thead>
              <motion.tbody
                variants={staggerContainer(0.04)}
                initial="initial"
                animate="animate"
                className="divide-y divide-outline-variant"
              >
                {users.map((user, idx) => (
                  <motion.tr
                    key={user.id}
                    variants={staggerItem}
                    transition={staggerItemTransition}
                    className={`hover:bg-surface-container transition-colors ${idx % 2 === 1 ? 'bg-slate-50' : ''}`}
                  >
                    <td className="px-5 py-3 font-semibold text-on-surface">{getDisplayName(user)}</td>
                    <td className="px-5 py-3 text-outline text-xs">{user.email}</td>
                    <td className="px-5 py-3">
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={spring.crisp}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${getRoleStyle(user.role)}`}
                      >
                        {user.role}
                      </motion.span>
                    </td>
                    <td className="px-5 py-3 text-on-surface text-xs">{user.institutionName ?? '—'}</td>
                    <td className="px-5 py-3 text-center">
                      <UserStatusBadge status={user.status} />
                    </td>
                    <td className="px-5 py-3 text-center">
                      {user.mfaEnrolled ? (
                        <span className="text-green-600 font-bold text-sm" title="MFA Enrolled">✓</span>
                      ) : (
                        <span className="text-red-500 font-bold text-sm" title="MFA Not Enrolled">✗</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-outline text-xs">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : <span className="text-outline italic">Never</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <motion.button
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => openEdit(user)}
                          title="Edit User"
                          className="p-1.5 hover:bg-surface-container-high rounded transition-colors text-secondary"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </motion.button>
                        {canMfaReset && (
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setMfaResetTarget(user)}
                            title="Reset MFA"
                            className="p-1.5 hover:bg-yellow-50 rounded transition-colors text-yellow-700"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </motion.button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
            <span className="text-xs text-outline">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded hover:bg-surface-container-high disabled:opacity-40 transition-colors text-sm"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center border rounded text-xs font-semibold transition-colors ${
                      p === page
                        ? 'bg-primary text-white border-primary'
                        : 'border-outline-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded hover:bg-surface-container-high disabled:opacity-40 transition-colors text-sm"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invite User Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <Modal
            open={showInviteModal}
            onClose={() => { setShowInviteModal(false); resetInvite(); }}
            title="Invite New User"
            size="md"
          >
            <motion.div variants={scaleIn} initial="initial" animate="animate" exit="exit" transition={spring.crisp}>
              <form onSubmit={handleInviteSubmit((v) => inviteMutation.mutate(v))} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="user@institution.bw"
                  {...registerInvite('email')}
                  error={inviteErrors.email?.message}
                />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface uppercase tracking-wider">Role</label>
                  <select
                    {...registerInvite('role')}
                    className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-secondary-container"
                  >
                    <option value="">— Select Role —</option>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {inviteErrors.role && (
                    <p className="text-xs text-error">{inviteErrors.role.message}</p>
                  )}
                </div>
                {institutions.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                      Institution (optional)
                    </label>
                    <select
                      {...registerInvite('institutionId')}
                      className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-secondary-container"
                    >
                      <option value="">— None (Platform User) —</option>
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowInviteModal(false); resetInvite(); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={inviteMutation.isPending}
                  >
                    Send Invitation
                  </Button>
                </div>
              </form>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {!!editTarget && (
          <Modal
            open={!!editTarget}
            onClose={() => setEditTarget(null)}
            title={`Edit User — ${editTarget ? getDisplayName(editTarget) : ''}`}
            size="sm"
          >
            <motion.div variants={scaleIn} initial="initial" animate="animate" exit="exit" transition={spring.crisp}>
              <form
                onSubmit={handleEditSubmit((v) =>
                  editTarget && editMutation.mutate({ id: editTarget.id, values: v })
                )}
                className="space-y-4"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface uppercase tracking-wider">Role</label>
                  <select
                    {...registerEdit('role')}
                    className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-secondary-container"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {editErrors.role && <p className="text-xs text-error">{editErrors.role.message}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface uppercase tracking-wider">Status</label>
                  <select
                    {...registerEdit('status')}
                    className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-secondary-container"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {editErrors.status && <p className="text-xs text-error">{editErrors.status.message}</p>}
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditTarget(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={editMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      {/* MFA Reset Confirmation Modal */}
      <AnimatePresence>
        {!!mfaResetTarget && (
          <Modal
            open={!!mfaResetTarget}
            onClose={() => setMfaResetTarget(null)}
            title="Reset MFA"
            size="sm"
          >
            <motion.div variants={scaleIn} initial="initial" animate="animate" exit="exit" transition={spring.crisp}>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-yellow-800">
                    This will force{' '}
                    <span className="font-bold">
                      {mfaResetTarget ? getDisplayName(mfaResetTarget) : ''}
                    </span>{' '}
                    to re-enrol their MFA device on next login. They will be temporarily unable to log in until re-enrolment is complete.
                  </p>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setMfaResetTarget(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={mfaResetMutation.isPending}
                    onClick={() => mfaResetTarget && mfaResetMutation.mutate(mfaResetTarget.id)}
                  >
                    Reset MFA
                  </Button>
                </div>
              </div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
