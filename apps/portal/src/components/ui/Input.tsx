'use client';

import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-on-surface uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          {...props}
          className={clsx(
            'w-full py-2 border rounded text-sm text-on-surface bg-surface-container-lowest',
            'focus:outline-none focus:ring-2 focus:ring-secondary-container focus:border-secondary transition-all',
            leftIcon ? 'pl-10' : 'pl-3',
            rightIcon ? 'pr-10' : 'pr-3',
            error ? 'border-error' : 'border-outline-variant',
            props.disabled && 'opacity-60 cursor-not-allowed bg-surface-container-low',
            className
          )}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-outline">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      {hint && !error && <p className="text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}
