'use client';

import React from 'react';
import clsx from 'clsx';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  hint,
  options,
  placeholder,
  className,
  id,
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-on-surface uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        {...props}
        className={clsx(
          'w-full py-2 px-3 border rounded text-sm text-on-surface bg-surface-container-lowest',
          'focus:outline-none focus:ring-2 focus:ring-secondary-container focus:border-secondary transition-all',
          error ? 'border-error' : 'border-outline-variant',
          props.disabled && 'opacity-60 cursor-not-allowed',
          className
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-error">{error}</p>}
      {hint && !error && <p className="text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}
