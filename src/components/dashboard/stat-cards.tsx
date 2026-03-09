"use client";

import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardStats } from '@/types/contracts';

interface StatCardsProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
}

const cards = [
  { key: 'renewal_action_required' as const, label: 'Renewal Action Required', sub: 'Contracts expiring within 30 days', variant: 'warn' },
  { key: 'obligations_overdue' as const, label: 'Obligations Overdue', sub: 'Past due date', variant: 'danger' },
  { key: 'total_active' as const, label: 'Active Contracts', sub: 'Currently active', variant: '' },
  { key: 'no_contract_on_file' as const, label: 'No Contract on File', sub: 'Vendors missing contracts', variant: 'warn' },
];

export function StatCards({ stats, isLoading }: StatCardsProps) {
  return (
    <div className="stat-grid">
      {cards.map(({ key, label, sub, variant }) => (
        <div key={key} className={`stat-card ${variant}`}>
          <div className="stat-label">{label}</div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="stat-value">{stats?.[key] ?? 0}</div>
          )}
          <div className="stat-sub">{sub}</div>
        </div>
      ))}
    </div>
  );
}
