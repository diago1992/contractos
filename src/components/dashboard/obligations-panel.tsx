"use client";

import type { Obligation } from '@/types/contracts';
import { format } from 'date-fns';

interface ObligationsPanelProps {
  obligations: Obligation[];
  isLoading: boolean;
}

export function ObligationsPanel({ obligations, isLoading }: ObligationsPanelProps) {
  const overdue = obligations
    .filter(o => o.status === 'overdue' || (o.due_date && new Date(o.due_date) < new Date() && o.status !== 'completed' && o.status !== 'waived'))
    .slice(0, 5);

  return (
    <div className="panel">
      <div className="panel-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
        Obligations — Attention Required
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 bg-[rgba(26,46,36,0.04)] rounded animate-pulse" />
          ))}
        </div>
      ) : overdue.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-50)' }}>No overdue obligations</p>
      ) : (
        <div className="act-list">
          {overdue.map(ob => (
            <div key={ob.id} className="act-item">
              <div className="act-dot danger" />
              <div className="act-text">
                <strong>{ob.title}</strong>
                {ob.due_date && (
                  <span style={{ color: 'var(--text-50)', marginLeft: 8, fontSize: 11 }}>
                    Due {format(new Date(ob.due_date), 'dd MMM yyyy')}
                  </span>
                )}
              </div>
              <span className={`badge ${ob.risk === 'High' ? 'expired' : ob.risk === 'Medium' ? 'expiring' : 'draft'}`}>
                {ob.risk || 'Medium'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
