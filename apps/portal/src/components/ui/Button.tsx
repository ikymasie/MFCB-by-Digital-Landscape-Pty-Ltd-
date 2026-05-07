'use client';

import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { spring } from '@/lib/motion';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-container text-white hover:opacity-90',
  secondary: 'bg-secondary text-white hover:opacity-90',
  danger: 'bg-error text-white hover:opacity-90',
  outline: 'bg-transparent border border-secondary text-secondary hover:bg-surface-container-low',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container-low',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'py-1 px-3 text-xs',
  md: 'py-2 px-4 text-sm',
  lg: 'py-3 px-6 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      {...(props as React.ComponentProps<typeof motion.button>)}
      disabled={isDisabled}
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={spring.crisp}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold rounded transition-all',
        variantClasses[variant],
        sizeClasses[size],
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {loading && (
        <motion.svg
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </motion.svg>
      )}
      {children}
    </motion.button>
  );
}
