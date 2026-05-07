'use client';

import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { spring } from '@/lib/motion';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from '@/lib/icons';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const variantConfig: Record<
  AlertVariant,
  { icon: React.ReactNode; classes: string }
> = {
  success: {
    icon: <CheckCircle className="h-5 w-5 text-green-600" />,
    classes: 'bg-green-50 border-green-200 text-green-800',
  },
  error: {
    icon: <AlertCircle className="h-5 w-5 text-red-600" />,
    classes: 'bg-red-50 border-red-200 text-red-800',
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
    classes: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  },
  info: {
    icon: <Info className="h-5 w-5 text-blue-600" />,
    classes: 'bg-blue-50 border-blue-200 text-blue-800',
  },
};

export function Alert({ variant = 'info', title, children, onClose, className }: AlertProps) {
  const config = variantConfig[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={
        variant === 'error'
          ? { x: [0, -4, 4, -2, 2, 0], opacity: 1, y: 0 }
          : { opacity: 1, y: 0 }
      }
      exit={{ opacity: 0, y: -8 }}
      transition={spring.soft}
      className={clsx(
        'flex items-start gap-3 p-4 rounded-lg border',
        config.classes,
        className
      )}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
      {onClose && (
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1, rotate: 90 }}
          transition={spring.crisp}
          className="flex-shrink-0 ml-auto p-0.5 rounded hover:opacity-70"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </motion.button>
      )}
    </motion.div>
  );
}
