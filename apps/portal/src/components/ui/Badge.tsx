'use client';

import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { spring } from '@/lib/motion';

type BadgeVariant =
  | 'active'
  | 'pending'
  | 'suspended'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'processing';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  active: 'bg-green-100 text-green-800',
  success: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  warning: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  processing: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-700',
};

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={spring.crisp}
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </motion.span>
  );
}

export function statusToBadgeVariant(status: string): BadgeVariant {
  const s = status?.toUpperCase();
  if (['ACTIVE', 'ACCEPTED', 'COMPLETED', 'SUCCESS', 'APPROVED'].includes(s)) return 'active';
  if (['PENDING', 'PROCESSING', 'IN_PROGRESS', 'SUBMITTED'].includes(s)) return 'pending';
  if (['SUSPENDED', 'REJECTED', 'FAILED', 'ERROR', 'INACTIVE'].includes(s)) return 'suspended';
  if (['WARNING', 'PARTIAL'].includes(s)) return 'warning';
  if (['INFO', 'REVIEW'].includes(s)) return 'info';
  if (['PROCESSING'].includes(s)) return 'processing';
  return 'neutral';
}
