"use client";

import type { Contract } from '@/types/contracts';

interface SpendAlertsProps {
  contracts: Contract[];
  isLoading: boolean;
}

export function SpendAlerts({ contracts, isLoading }: SpendAlertsProps) {
  // Filter contracts where spend > 80% of annual_value (simulated with invoices later)
  // For now show contracts with annual_value set
  const approaching = contracts
    .filter(c => c.annual_value && c.annual_value > 0)
    .slice(0, 5);

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="panel-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        Spend Approaching Contract Cap
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-6 bg-[rgba(26,46,36,0.04)] rounded animate-pulse" />
          ))}
        </div>
      ) : approaching.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-50)' }}>No contracts approaching spend cap</p>
      ) : (
        <div>
          {approaching.map(c => {
            const pct = 85; // placeholder until invoice totals are aggregated
            return (
              <div key={c.id} className="spend-row">
                <span className="spend-name">{c.counterparty_name || c.title}</span>
                <div className="spend-bar-track">
                  <div className="spend-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="spend-pct">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
