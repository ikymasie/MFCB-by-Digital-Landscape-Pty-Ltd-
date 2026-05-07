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
  Search,
  UserPlus,
  Pencil,
  UserMinus,
  X,
  Send,
  Mail,
} from '@/lib/icons';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  spring, fadeUp, fadeUpTransition, fadeIn, scaleIn,
  staggerContainer, staggerItem, staggerItemTransition,
} from '@/lib/motion';

interface User {
  user_id: string;
  full_name: string;
  email: string;
  role: { role_id: string; name: string };
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DEACTIVATED';
  mfa_enrolled: boolean;
  last_login_at: string | null;
}

interface Role {
  role_id: string;
  name: string;
}

const inviteSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email required'),
  role_id: z.string().min(1, 'Role is required'),
});

type InviteForm = z.infer<typeof inviteSchema>;

const editSchema = z.object({
  role_id: z.string().min(1, 'Role is required'),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']),
});

type EditForm = z.infer<typeof editSchema>;

const STATUS_STYLES: Record<string, { classes: string; dot: string }> = {
  ACTIVE: { classes: 'bg-green-50 text-green-700', dot: 'bg-green-600' },
  PENDING: { classes: 'bg-amber-50 text-amber-700', dot: 'bg-amber-600' },
  SUSPENDED: { classes: 'bg-red-50 text-red-700', dot: 'bg-red-600' },
  DEACTIVATED: { classes: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};

const INST_ROLES = [
  { role_id: 'INST_ADMIN', name: 'Administrator' },
  { role_id: 'INST_USER', name: 'User' },
];

const ALL_ROLES = [
  { role_id: 'SUPER_ADMIN', name: 'Super Admin' },
  { role_id: 'BUREAU_OPS', name: 'Bureau Ops' },
  { role_id: 'INST_ADMIN', name: 'Institution Admin' },
  { role_id: 'INST_USER', name: 'Institution User' },
];

export default function InstitutionUsersPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasRole } = useAuthStore();

  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const isSuperUser = hasRole('SUPER_ADMIN') || hasRole('BUREAU_OPS');
  const availableRoles = isSuperUser ? ALL_ROLES : INST_ROLES;

  const { data: users = [], isLoading, isError } = useQuery<User[]>({
    queryKey: ['institution-users', id],
    queryFn: async () => {
      const res = await api.get(`/users?institutionId=${id}`);
      return res.data?.data ?? res.data;
    },
  });

  const inviteForm = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: editingUser
      ? { role_id: editingUser.role?.role_id ?? '', status: editingUser.status as 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' }
      : undefined,
  });

  const inviteMutation = useMutation({
    mutationFn: (data: InviteForm) =>
      api.post('/users/invite', { ...data, institution_id: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution-users', id] });
      inviteForm.reset();
      setInviteSuccess(true);
      setInviteError(null);
      setTimeout(() => setInviteSuccess(false), 3000);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setInviteError(e?.response?.data?.message ?? 'Failed to send invitation.');
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: EditForm }) =>
      api.patch(`/users/${userId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution-users', id] });
      setEditingUser(null);
    },
  });

  const filtered = users.filter(
    (u) =>
      search === '' ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const onInviteSubmit = inviteForm.handleSubmit(async (data) => {
    setInviteError(null);
    await inviteMutation.mutateAsync(data);
  });

  const onEditSubmit = editForm.handleSubmit(async (data) => {
    if (!editingUser) return;
    await editMutation.mutateAsync({ userId: editingUser.user_id, data });
  });

  function formatLastLogin(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 86400) return `Today, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    if (diff < 172800) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <motion.div
      className="min-h-screen bg-[#f7f9fb]"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      <main className="max-w-[1280px] mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#737780] mb-6">
          <button onClick={() => router.push('/institutions')} className="hover:text-[#001e40] transition-colors">
            Institutions
          </button>
          <ChevronRight className="h-4 w-4" />
          <button onClick={() => router.push(`/institutions/${id}`)} className="hover:text-[#001e40] transition-colors">
            Profile
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#191c1e] font-medium">User Management</span>
        </nav>

        {/* Page Header */}
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-3xl font-semibold text-[#001e40]">User Management</h1>
            <p className="text-base text-[#43474f] mt-1">Institutional Access Control</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#737780]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff members..."
                className="pl-10 pr-4 py-3 bg-white border border-[#c3c6d1] rounded-lg focus:ring-2 focus:ring-[#97ccfe] focus:border-[#28628f] outline-none text-sm w-72"
              />
            </div>
            <motion.button
              onClick={() => setShowInviteModal(true)}
              className="bg-[#001e40] text-white font-semibold text-sm px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-[#003366] transition-colors shadow-sm"
              whileHover={{ scale: 1.03, boxShadow: '0 4px 16px rgba(0,30,64,0.25)' }}
              whileTap={{ scale: 0.97 }}
              transition={spring.crisp}
            >
              <UserPlus className="h-4 w-4" />
              Invite User
            </motion.button>
          </div>
        </div>

        {/* Bento Layout */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Main Table */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-xl border border-[#c3c6d1] shadow-sm overflow-hidden">
            <div className="px-6 py-3 border-b border-[#c3c6d1] bg-[#f2f4f6] flex justify-between items-center">
              <span className="text-xs font-bold text-[#001e40] uppercase tracking-wider">Staff Roster</span>
              <span className="text-sm text-[#43474f]">{users.length} total active seats</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#003366] text-white">
                    {['Name', 'Email', 'Role', 'Status', 'MFA', 'Last Login', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className={`py-4 px-6 text-xs font-bold uppercase tracking-wider border-b border-[#001e40] ${h === 'Actions' ? 'text-center' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <motion.tbody
                  className="text-sm"
                  variants={staggerContainer(0.04)}
                  initial="initial"
                  animate="animate"
                >
                  {isLoading && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#43474f]">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Loading users...
                        </div>
                      </td>
                    </tr>
                  )}
                  {isError && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm mx-auto">
                          <p className="text-sm text-red-700">Failed to load users.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!isLoading && !isError && filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#43474f]">
                        No users found.
                      </td>
                    </tr>
                  )}
                  {filtered.map((user, idx) => {
                    const ss = STATUS_STYLES[user.status] ?? STATUS_STYLES.DEACTIVATED;
                    const isAdmin = user.role?.name?.toLowerCase().includes('admin');
                    return (
                      <motion.tr
                        key={user.user_id}
                        className={`hover:bg-[#eceef0] transition-colors ${idx % 2 === 1 ? 'bg-[#f2f4f6]' : ''}`}
                        variants={staggerItem}
                        transition={staggerItemTransition}
                      >
                        <td className="py-6 px-6 text-[#191c1e] border-b border-[#c3c6d1] font-medium">
                          {user.full_name}
                        </td>
                        <td className="py-6 px-6 text-[#43474f] border-b border-[#c3c6d1]">
                          {user.email}
                        </td>
                        <td className="py-6 px-6 border-b border-[#c3c6d1]">
                          <motion.span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              isAdmin
                                ? 'bg-[#001e40] text-white'
                                : 'bg-[#28628f] text-white'
                            }`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={spring.crisp}
                          >
                            {user.role?.name ?? '—'}
                          </motion.span>
                        </td>
                        <td className="py-6 px-6 border-b border-[#c3c6d1]">
                          <motion.span
                            className={`flex items-center gap-2 text-xs font-bold ${ss.classes} px-3 py-1 rounded-full w-fit`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={spring.crisp}
                          >
                            <span className={`w-2 h-2 rounded-full ${ss.dot}`} />
                            {user.status}
                          </motion.span>
                        </td>
                        <td className="py-6 px-6 border-b border-[#c3c6d1]">
                          <span className={`text-xs font-bold ${user.mfa_enrolled ? 'text-emerald-700' : 'text-[#737780]'}`}>
                            {user.mfa_enrolled ? 'Enrolled' : 'Not enrolled'}
                          </span>
                        </td>
                        <td className="py-6 px-6 text-[#43474f] border-b border-[#c3c6d1]">
                          {formatLastLogin(user.last_login_at)}
                        </td>
                        <td className="py-6 px-6 border-b border-[#c3c6d1] text-center">
                          <div className="flex justify-center gap-1">
                            {user.status === 'PENDING' ? (
                              <motion.button
                                title="Resend invite"
                                className="p-1 hover:bg-[#f2f4f6] rounded transition-colors text-[#001e40]"
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                transition={spring.crisp}
                              >
                                <Mail className="h-4 w-4" />
                              </motion.button>
                            ) : (
                              <motion.button
                                title="Edit user"
                                onClick={() => setEditingUser(user)}
                                className="p-1 hover:bg-[#f2f4f6] rounded transition-colors text-[#001e40]"
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                transition={spring.crisp}
                              >
                                <Pencil className="h-4 w-4" />
                              </motion.button>
                            )}
                            <motion.button
                              title="Deactivate"
                              className="p-1 hover:bg-[#ffdad6] rounded transition-colors text-[#ba1a1a]"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              transition={spring.crisp}
                            >
                              <UserMinus className="h-4 w-4" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          </div>

          {/* Sidebar Panel */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            {/* Inline Invite Form (sidebar) */}
            <div className="bg-white rounded-xl border border-[#c3c6d1] shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="h-5 w-5 text-[#001e40]" />
                <h3 className="text-base font-bold text-[#001e40]">Invite New Staff</h3>
              </div>
              <p className="text-sm text-[#43474f] mb-4">
                Send a secure invitation to a new institutional member.
              </p>

              {inviteSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                  Invitation sent successfully!
                </div>
              )}
              {inviteError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {inviteError}
                </div>
              )}

              <form onSubmit={onInviteSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#43474f] uppercase tracking-widest">
                    Full Name
                  </label>
                  <input
                    {...inviteForm.register('full_name')}
                    type="text"
                    placeholder="e.g. Neo Modise"
                    className="px-4 py-3 bg-white border border-[#c3c6d1] rounded focus:ring-2 focus:ring-[#001e40] focus:border-transparent outline-none text-sm transition-all"
                  />
                  {inviteForm.formState.errors.full_name && (
                    <p className="text-xs text-red-600">{inviteForm.formState.errors.full_name.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#43474f] uppercase tracking-widest">
                    Institution Email
                  </label>
                  <input
                    {...inviteForm.register('email')}
                    type="email"
                    placeholder="n.modise@institution.bw"
                    className="px-4 py-3 bg-white border border-[#c3c6d1] rounded focus:ring-2 focus:ring-[#001e40] focus:border-transparent outline-none text-sm transition-all"
                  />
                  {inviteForm.formState.errors.email && (
                    <p className="text-xs text-red-600">{inviteForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#43474f] uppercase tracking-widest">
                    Assign Role
                  </label>
                  <select
                    {...inviteForm.register('role_id')}
                    className="px-4 py-3 bg-white border border-[#c3c6d1] rounded focus:ring-2 focus:ring-[#001e40] focus:border-transparent outline-none text-sm appearance-none"
                  >
                    <option value="">Select role...</option>
                    {availableRoles.map((r) => (
                      <option key={r.role_id} value={r.role_id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  {inviteForm.formState.errors.role_id && (
                    <p className="text-xs text-red-600">{inviteForm.formState.errors.role_id.message}</p>
                  )}
                </div>
                <motion.button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="w-full bg-[#001e40] text-white font-semibold text-sm py-3 rounded-lg mt-2 hover:bg-[#003366] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
                  whileHover={{ scale: 1.03, boxShadow: '0 4px 16px rgba(0,30,64,0.25)' }}
                  whileTap={{ scale: 0.97 }}
                  transition={spring.crisp}
                >
                  <Send className="h-4 w-4" />
                  {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </motion.button>
              </form>
            </div>

            {/* Seat Allocation */}
            <div className="bg-[#003366] text-white rounded-xl p-6 shadow-sm border border-[#c3c6d1]">
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                Portal Seat Allocation
              </span>
              <div className="flex justify-between items-end mt-3">
                <div>
                  <span className="text-5xl font-bold">{users.length}</span>
                  <span className="text-2xl opacity-50"> / 10</span>
                  <p className="text-sm opacity-80 mt-1">Seats Active</p>
                </div>
                <div className="w-14 h-14">
                  <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="transparent"
                      stroke="#97ccfe"
                      strokeWidth="6"
                      strokeDasharray="175"
                      strokeDashoffset={175 - (175 * Math.min(users.length, 10)) / 10}
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40"
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={() => setShowInviteModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <motion.div
                className="bg-white rounded-xl p-8 w-full max-w-md mx-4 shadow-xl pointer-events-auto"
                variants={scaleIn}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={spring.crisp}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-[#001e40]">Invite New Staff</h2>
                  <motion.button
                    onClick={() => setShowInviteModal(false)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={spring.crisp}
                  >
                    <X className="h-5 w-5 text-[#737780]" />
                  </motion.button>
                </div>
                <form onSubmit={onInviteSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#43474f] uppercase tracking-wider">Full Name</label>
                    <input
                      {...inviteForm.register('full_name')}
                      type="text"
                      placeholder="e.g. Neo Modise"
                      className="px-4 py-3 border border-[#c3c6d1] rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#001e40]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#43474f] uppercase tracking-wider">Email</label>
                    <input
                      {...inviteForm.register('email')}
                      type="email"
                      placeholder="n.modise@institution.bw"
                      className="px-4 py-3 border border-[#c3c6d1] rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#001e40]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#43474f] uppercase tracking-wider">Role</label>
                    <select
                      {...inviteForm.register('role_id')}
                      className="px-4 py-3 border border-[#c3c6d1] rounded-lg outline-none text-sm appearance-none"
                    >
                      <option value="">Select role...</option>
                      {availableRoles.map((r) => (
                        <option key={r.role_id} value={r.role_id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <motion.button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="flex-1 py-3 border border-[#c3c6d1] rounded-lg text-sm font-semibold text-[#43474f] hover:bg-[#f2f4f6]"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring.crisp}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={inviteMutation.isPending}
                      className="flex-1 py-3 bg-[#001e40] text-white rounded-lg text-sm font-semibold hover:bg-[#003366] disabled:opacity-60"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring.crisp}
                    >
                      {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40"
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={() => setEditingUser(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <motion.div
                className="bg-white rounded-xl p-8 w-full max-w-md mx-4 shadow-xl pointer-events-auto"
                variants={scaleIn}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={spring.crisp}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-[#001e40]">Edit User</h2>
                  <motion.button
                    onClick={() => setEditingUser(null)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={spring.crisp}
                  >
                    <X className="h-5 w-5 text-[#737780]" />
                  </motion.button>
                </div>
                <div className="mb-4 p-3 bg-[#f2f4f6] rounded-lg">
                  <p className="text-sm font-semibold text-[#191c1e]">{editingUser.full_name}</p>
                  <p className="text-xs text-[#737780]">{editingUser.email}</p>
                </div>
                <form onSubmit={onEditSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#43474f] uppercase tracking-wider">Role</label>
                    <select
                      {...editForm.register('role_id')}
                      className="px-4 py-3 border border-[#c3c6d1] rounded-lg outline-none text-sm appearance-none"
                    >
                      {availableRoles.map((r) => (
                        <option key={r.role_id} value={r.role_id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#43474f] uppercase tracking-wider">Status</label>
                    <select
                      {...editForm.register('status')}
                      className="px-4 py-3 border border-[#c3c6d1] rounded-lg outline-none text-sm appearance-none"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="DEACTIVATED">Deactivated</option>
                    </select>
                  </div>
                  {editMutation.isError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      Failed to update user.
                    </div>
                  )}
                  <div className="flex gap-3 mt-2">
                    <motion.button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="flex-1 py-3 border border-[#c3c6d1] rounded-lg text-sm font-semibold text-[#43474f] hover:bg-[#f2f4f6]"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring.crisp}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={editMutation.isPending}
                      className="flex-1 py-3 bg-[#001e40] text-white rounded-lg text-sm font-semibold hover:bg-[#003366] disabled:opacity-60"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring.crisp}
                    >
                      {editMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
