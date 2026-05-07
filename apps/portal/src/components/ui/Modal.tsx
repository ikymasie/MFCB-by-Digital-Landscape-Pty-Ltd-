'use client';

import React, { useEffect } from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn, scaleIn, spring } from '@/lib/motion';
import { X } from '@/lib/icons';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Modal({ open, onClose, title, children, size = 'md', className }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Modal Panel */}
          <motion.div
            variants={scaleIn}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={spring.crisp}
            style={{ transformOrigin: 'top center' }}
            className={clsx(
              'relative w-full bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant',
              sizeClasses[size],
              className
            )}
          >
            {title && (
              <div className="flex items-center justify-between p-5 border-b border-outline-variant">
                <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded hover:bg-surface-container-low transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5 text-on-surface-variant" />
                </button>
              </div>
            )}
            {!title && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded hover:bg-surface-container-low transition-colors z-10"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 text-on-surface-variant" />
              </button>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
