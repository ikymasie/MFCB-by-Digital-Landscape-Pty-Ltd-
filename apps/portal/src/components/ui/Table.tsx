'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { ChevronUp, ChevronDown, ChevronsUpDown } from '@/lib/icons';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  keyField?: keyof T;
}

function getNestedValue<T>(obj: T, key: string): unknown {
  return key.split('.').reduce((acc: unknown, k) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj);
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  emptyMessage = 'No records found.',
  onRowClick,
  className,
  keyField,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const va = getNestedValue(a, sortKey);
      const vb = getNestedValue(b, sortKey);
      const cmp = String(va ?? '').localeCompare(String(vb ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={clsx(
                  'px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider',
                  col.sortable && 'cursor-pointer select-none hover:text-on-surface',
                  col.className
                )}
                onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <span className="text-outline">
                      {sortKey === String(col.key) ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-on-surface-variant">
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Loading...</span>
                </div>
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-on-surface-variant">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, idx) => (
              <tr
                key={keyField ? String(row[keyField]) : idx}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={clsx(
                  'border-b border-outline-variant last:border-0',
                  'hover:bg-surface-container-low transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={clsx('px-4 py-3 text-on-surface', col.className)}
                  >
                    {col.render
                      ? col.render(getNestedValue(row, String(col.key)), row)
                      : String(getNestedValue(row, String(col.key)) ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
