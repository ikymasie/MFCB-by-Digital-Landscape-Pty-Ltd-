'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  FileStack,
  ShieldCheck,
  Search,
  Settings2,
  BarChart3,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  Users,
  ChevronRight,
} from '@/lib/icons';
import { useAuthStore } from '@/lib/auth-store';
import { spring, staggerContainer, staggerItem } from '@/lib/motion';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'Institutions',
    href: '/institutions',
    icon: <Building2 className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'BUREAU_OPS', 'COMPLIANCE'],
  },
  {
    label: 'Batch Submissions',
    href: '/batches',
    icon: <FileStack className="h-5 w-5" />,
  },
  {
    label: 'Quality & Validation',
    href: '/quality',
    icon: <ShieldCheck className="h-5 w-5" />,
    children: [
      { label: 'Quality Dashboard', href: '/quality' },
      { label: 'Compliance Monitor', href: '/quality/compliance' },
      { label: 'Resubmission History', href: '/quality/resubmissions' },
      { label: 'Data Corrections', href: '/quality/corrections' },
    ],
  },
  {
    label: 'Credit Reports',
    href: '/reports',
    icon: <Search className="h-5 w-5" />,
  },
  {
    label: 'Operations',
    href: '/ops',
    icon: <Settings2 className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'BUREAU_OPS'],
    children: [
      { label: 'Operations Home', href: '/ops' },
      { label: 'Processing Queue', href: '/ops/queue' },
      { label: 'Engagement', href: '/ops/engagement' },
      { label: 'Sandbox', href: '/ops/sandbox' },
    ],
  },
  {
    label: 'Reference Data',
    href: '/reference',
    icon: <BookOpen className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'BUREAU_OPS'],
  },
  {
    label: 'Audit Logs',
    href: '/audit',
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'BUREAU_OPS', 'COMPLIANCE', 'AUDITOR'],
    children: [
      { label: 'Global Audit', href: '/audit' },
      { label: 'Consent Audit', href: '/audit/consent' },
    ],
  },
  {
    label: 'User Management',
    href: '/admin',
    icon: <Users className="h-5 w-5" />,
    roles: ['SUPER_ADMIN'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [expanded, setExpanded] = React.useState<string[]>([]);

  const userRole = user?.role || '';

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  const toggleExpand = (href: string) => {
    setExpanded((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      className="w-64 bg-primary flex-shrink-0 flex flex-col h-full"
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={spring.soft}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-container rounded-lg flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">MFCB Portal</p>
            <p className="text-white/60 text-xs">Credit Bureau</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <AnimatePresence>
          <motion.ul
            className="space-y-1"
            variants={staggerContainer(0.03)}
            initial="initial"
            animate="animate"
          >
            {visibleItems.map((item) => {
              const active = isActive(item.href);
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expanded.includes(item.href);

              return (
                <motion.li key={item.href} variants={staggerItem}>
                  {hasChildren ? (
                    <>
                      <button
                        onClick={() => toggleExpand(item.href)}
                        className={clsx(
                          'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                          active
                            ? 'text-white font-semibold'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-active-pill"
                            className="absolute inset-0 rounded-lg bg-white/15"
                            style={{ zIndex: 0 }}
                            transition={spring.soft}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-3 w-full">
                          {item.icon}
                          <span className="flex-1 text-left">{item.label}</span>
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={spring.crisp}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </motion.div>
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.ul
                            className="mt-1 ml-8 space-y-1 overflow-hidden"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={spring.soft}
                          >
                            {item.children!.map((child) => (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  className={clsx(
                                    'block px-3 py-2 rounded-lg text-sm transition-colors',
                                    pathname === child.href
                                      ? 'bg-white/15 text-white font-semibold'
                                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                                  )}
                                >
                                  {child.label}
                                </Link>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className={clsx(
                        'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                        active
                          ? 'text-white font-semibold'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active-pill"
                          className="absolute inset-0 rounded-lg bg-white/15"
                          style={{ zIndex: 0 }}
                          transition={spring.soft}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </span>
                    </Link>
                  )}
                </motion.li>
              );
            })}
          </motion.ul>
        </AnimatePresence>
      </nav>

      {/* User info at bottom */}
      {user && (
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white text-xs font-bold"
              whileHover={{ scale: 1.08 }}
            >
              {user.email?.charAt(0).toUpperCase() ?? 'U'}
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {user.email ?? user.id}
              </p>
              <p className="text-white/50 text-xs">{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </motion.aside>
  );
}
