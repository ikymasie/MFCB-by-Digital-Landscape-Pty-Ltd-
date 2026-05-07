'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bell, HelpCircle, LogOut } from '@/lib/icons';
import { useAuthStore } from '@/lib/auth-store';
import { spring } from '@/lib/motion';

export function TopBar() {
  const { user, logout } = useAuthStore();

  return (
    <motion.header
      className="h-14 bg-surface-container-lowest border-b border-outline-variant flex items-center justify-between px-6 flex-shrink-0"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={spring.soft}
    >
      {/* Left: breadcrumb / title placeholder */}
      <div />

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        <motion.button
          className="p-2 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant"
          aria-label="Notifications"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
        >
          <Bell className="h-5 w-5" />
        </motion.button>
        <motion.button
          className="p-2 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant"
          aria-label="Help"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
        >
          <HelpCircle className="h-5 w-5" />
        </motion.button>

        <div className="h-6 w-px bg-outline-variant mx-1" />

        <div className="flex items-center gap-2">
          <motion.div
            className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold"
            whileHover={{ scale: 1.08 }}
          >
            {user?.email?.charAt(0).toUpperCase() ?? 'U'}
          </motion.div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-on-surface leading-tight truncate max-w-[140px]">
              {user?.email ?? 'User'}
            </p>
            <p className="text-xs text-on-surface-variant">{user?.role ?? ''}</p>
          </div>
        </div>

        <motion.button
          onClick={logout}
          className="p-2 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant"
          aria-label="Logout"
          title="Sign out"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
        >
          <LogOut className="h-5 w-5" />
        </motion.button>
      </div>
    </motion.header>
  );
}
