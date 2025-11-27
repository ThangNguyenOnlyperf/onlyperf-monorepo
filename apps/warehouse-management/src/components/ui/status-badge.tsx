'use client';

import type { ReactNode } from 'react';

type StatusType = 'pending' | 'received' | 'sold' | 'shipped' | 'processing' | 'completed' | 'failed' | 'cancelled';

interface StatusBadgeProps {
  status: StatusType;
  label: string | ReactNode;
  icon?: ReactNode;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  pending: 'status-pending',
  received: 'status-received',
  sold: 'status-sold',
  shipped: 'status-shipped',
  processing: 'status-pending',
  completed: 'status-received',
  failed: 'bg-red-500/10 text-red-700 border-red-500/20', /* Destructive red */
  cancelled: 'bg-charcoal-500/10 text-charcoal-700 border-charcoal-500/20', /* Neutral charcoal */
};

export function StatusBadge({ status, label, icon, className = '' }: StatusBadgeProps) {
  return (
    <span className={`status-badge-base ${statusStyles[status]} ${className}`}>
      {icon && <span className="mr-1.5">{icon}</span>}
      {label}
    </span>
  );
}
