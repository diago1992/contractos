"use client";

import Link from 'next/link';
import type { Contract } from '@/types/contracts';

interface MissingContractsProps {
  contracts: Contract[];
  isLoading: boolean;
}

export function MissingContracts({ contracts, isLoading }: MissingContractsProps) {
  const missing = contracts.filter(c => !c.on_file).slice(0, 5);

  return (
    <div className="panel">
      <div className="panel-title">Contracts Missing from File</div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 bg-[rgba(26,46,36,0.04)] rounded animate-pulse" />
          ))}
        </div>
      ) : missing.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-50)' }}>All contracts on file</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Contract</th>
                <th>Counterparty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {missing.map(c => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/counterparties/${c.id}`} className="font-medium" style={{ color: 'var(--text)' }}>
                      {c.title}
                    </Link>
                  </td>
                  <td>{c.counterparty_name || '—'}</td>
                  <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
