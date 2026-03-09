"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/app-layout';
import { ColumnFilters } from '@/components/contracts/column-filters';
import { useContracts } from '@/hooks/use-contracts';
import type { ContractFilters } from '@/types/contracts';

const filterConfig = [
  { key: 'search', placeholder: 'Search contracts...', type: 'text' as const },
  { key: 'cost_centre', placeholder: 'Cost Centre...', type: 'text' as const },
  { key: 'mm_owner', placeholder: 'Owner...', type: 'text' as const },
  { key: 'status', placeholder: 'Status', type: 'select' as const, options: [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'expired', label: 'Expired' },
    { value: 'terminated', label: 'Terminated' },
  ]},
  { key: 'on_file', placeholder: 'On File', type: 'select' as const, options: [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ]},
];

export default function ContractsPage() {
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const filters: ContractFilters = useMemo(() => ({
    search: filterValues.search || undefined,
    status: filterValues.status as ContractFilters['status'] || undefined,
    cost_centre: filterValues.cost_centre || undefined,
    mm_owner: filterValues.mm_owner || undefined,
    on_file: filterValues.on_file ? filterValues.on_file === 'true' : undefined,
  }), [filterValues]);

  const { data, isLoading } = useContracts(filters, page, 25);
  const totalPages = data ? Math.ceil(data.count / 25) : 0;

  const formatCurrency = (val: number | null) =>
    val ? `$${val.toLocaleString()}` : '—';

  return (
    <AppLayout title="Contracts">
      <div className="table-wrap">
        <div className="contracts-toolbar">
          <span style={{ fontSize: 13, color: 'var(--text-50)' }}>
            {data ? `${data.count} contracts` : 'Loading...'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary">Export CSV</button>
            <Link href="/counterparties" className="btn-primary">+ New Contract</Link>
          </div>
        </div>
        <ColumnFilters
          filters={filterConfig}
          values={filterValues}
          onChange={(key, val) => { setFilterValues(prev => ({ ...prev, [key]: val })); setPage(1); }}
        />
        <table>
          <thead>
            <tr>
              <th>Contract ID</th>
              <th>Contract Name</th>
              <th>Counterparty</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Cost Centre</th>
              <th>Owner</th>
              <th>Annual Value</th>
              <th>Status</th>
              <th>On File</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={10}><div className="h-8 bg-[rgba(26,46,36,0.04)] rounded animate-pulse" /></td></tr>
              ))
            ) : !data || data.data.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-50)', padding: 40 }}>No contracts found</td></tr>
            ) : (
              data.data.map(c => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{c.id.slice(0, 8)}</td>
                  <td>
                    <Link href={`/contracts/${c.id}`} style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {c.title}
                    </Link>
                  </td>
                  <td>{c.counterparty_name || '—'}</td>
                  <td>{c.effective_date ? format(new Date(c.effective_date), 'dd MMM yyyy') : '—'}</td>
                  <td>{c.expiry_date ? format(new Date(c.expiry_date), 'dd MMM yyyy') : '—'}</td>
                  <td>{c.cost_centre || '—'}</td>
                  <td>{c.mm_owner || '—'}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{formatCurrency(c.annual_value)}</td>
                  <td><span className={`badge ${c.status === 'active' ? 'active' : c.status === 'expired' ? 'expired' : c.status === 'draft' ? 'draft' : 'expiring'}`}>{c.status}</span></td>
                  <td>{c.on_file ? 'Yes' : 'No'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid rgba(26,46,36,0.08)' }}>
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span style={{ fontSize: 12, color: 'var(--text-50)' }}>Page {page} of {totalPages}</span>
            <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
