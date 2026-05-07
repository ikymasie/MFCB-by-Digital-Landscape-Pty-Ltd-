'use client';

import React from 'react';
import clsx from 'clsx';

interface CardProps {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({
  title,
  subtitle,
  headerAction,
  children,
  className,
  padding = true,
}: CardProps) {
  return (
    <div
      className={clsx(
        'bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm',
        className
      )}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-on-surface">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-on-surface-variant mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className={clsx(padding && 'p-5')}>{children}</div>
    </div>
  );
}
