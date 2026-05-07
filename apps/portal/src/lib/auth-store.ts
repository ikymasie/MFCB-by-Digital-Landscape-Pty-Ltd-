'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  role: string;
  institutionId: string | null;
  permissions: string[];
  email?: string;
  name?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  partialToken: string | null;
  setToken: (token: string) => void;
  setPartialToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      partialToken: null,

      setToken: (token: string) => {
        set({ token });
        if (typeof document !== 'undefined') {
          document.cookie = `mfcb-token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
        }
      },

      setPartialToken: (partialToken: string) => set({ partialToken }),

      setUser: (user: User) => set({ user }),

      logout: () => {
        set({ token: null, user: null, partialToken: null });
        if (typeof document !== 'undefined') {
          document.cookie = 'mfcb-token=; path=/; max-age=0; SameSite=Lax';
        }
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },

      hasPermission: (permission: string) => {
        const { user } = get();
        if (!user) return false;
        // SUPER_ADMIN has all permissions
        if (user.role === 'SUPER_ADMIN') return true;
        return user.permissions.includes(permission);
      },

      hasRole: (role: string | string[]) => {
        const { user } = get();
        if (!user) return false;
        const roles = Array.isArray(role) ? role : [role];
        return roles.includes(user.role);
      },
    }),
    {
      name: 'mfcb-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        partialToken: state.partialToken,
      }),
    }
  )
);
