'use client';

/** TableCard + the standard loading / error / empty states for console list
 *  pages. Pass the table as children; ListCard renders it only in the ready
 *  state. All TableCard props (title, search, pagination, action) pass through. */
import React from 'react';
import { Btn, TableCard } from '@/components/console/ui';

interface ListCardProps {
  title: string;
  totalLabel?: string;
  action?: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  onSearchSubmit?: () => void;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (p: number) => void;
  isPending: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  errorMessage: string;
  onRetry: () => void;
  children: React.ReactNode;
}

const STATE_CLASS = 'px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400';

export function ListCard({
  children,
  isPending,
  isError,
  isEmpty,
  emptyMessage,
  errorMessage,
  onRetry,
  ...tableProps
}: Readonly<ListCardProps>) {
  let body: React.ReactNode;
  if (isPending) {
    body = (
      <div className="flex flex-col gap-2 p-5">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="kc-skeleton h-9 rounded-md" />
        ))}
      </div>
    );
  } else if (isError) {
    body = (
      <div className={STATE_CLASS}>
        {errorMessage}
        <div className="mt-3"><Btn size="sm" onClick={onRetry}>Retry</Btn></div>
      </div>
    );
  } else if (isEmpty) {
    body = <div className={STATE_CLASS}>{emptyMessage}</div>;
  } else {
    body = children;
  }

  return <TableCard {...tableProps}>{body}</TableCard>;
}
