"use client";

import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import type { Contract } from '@/types/contracts';

interface RenewalsTableProps {
  contracts: Contract[];
  isLoading: boolean;
}

export function RenewalsTable({ contracts, isLoading }: RenewalsTableProps) {
  const now = new Date();
  const upcoming = contracts
    .filter(c => c.expiry_date && c.status === 'active')
    .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime())
    .slice(0, 5);

  return (
    <div className="panel">
      <div className="panel-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
        Upcoming Renewals &amp; Deadlines
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-[rgba(26,46,36,0.04)] rounded animate-pulse" />
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-50)' }}>No upcoming renewals</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Contract</th>
                <th>Counterparty</th>
                <th>Expiry</th>
                <th>Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map(contract => {
                const days = differenceInDays(new Date(contract.expiry_date!), now);
                const urgency = days <= 7 ? 'expired' : days <= 30 ? 'expiring' : 'active';
                return (
                  <tr key={contract.id}>
                    <td>
                      <Link href={`/counterparties/${contract.id}`} className="font-medium" style={{ color: 'var(--text)' }}>
                        {contract.title}
                      </Link>
                    </td>
                    <td>{contract.counterparty_name || '—'}</td>
                    <td>{format(new Date(contract.expiry_date!), 'dd MMM yyyy')}</td>
                    <td>
                      <span className="font-mono font-semibold">{days}d</span>
                    </td>
                    <td>
                      <span className={`badge ${urgency}`}>
                        {urgency === 'expired' ? 'Critical' : urgency === 'expiring' ? 'Expiring' : 'Active'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
