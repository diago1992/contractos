"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { ColumnFilters } from '@/components/contracts/column-filters';
import { useVendors } from '@/hooks/use-vendors';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const filterConfig = [
  { key: 'name', placeholder: 'Search name...', type: 'text' as const },
  { key: 'abn', placeholder: 'ABN...', type: 'text' as const },
  { key: 'industry', placeholder: 'Category...', type: 'text' as const },
  { key: 'currency', placeholder: 'Currency...', type: 'text' as const },
];

export default function CounterpartiesPage() {
  const { data: vendors, isLoading } = useVendors();
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Fetch contract counts per vendor
  const supabase = createClient();
  const { data: contractCounts } = useQuery({
    queryKey: ['vendor-contract-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_vendors')
        .select('vendor_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(cv => { counts[cv.vendor_id] = (counts[cv.vendor_id] || 0) + 1; });
      return counts;
    },
  });

  const filtered = useMemo(() => {
    if (!vendors) return [];
    return vendors.filter(v => {
      if (filterValues.name && !v.name.toLowerCase().includes(filterValues.name.toLowerCase())) return false;
      if (filterValues.abn && !(v.abn || '').includes(filterValues.abn)) return false;
      if (filterValues.industry && !(v.industry || '').toLowerCase().includes(filterValues.industry.toLowerCase())) return false;
      if (filterValues.currency && !(v.currency || '').toLowerCase().includes(filterValues.currency.toLowerCase())) return false;
      return true;
    });
  }, [vendors, filterValues]);

  return (
    <AppLayout title="Counterparties">
      <div className="table-wrap">
        <ColumnFilters
          filters={filterConfig}
          values={filterValues}
          onChange={(key, val) => setFilterValues(prev => ({ ...prev, [key]: val }))}
        />
        <table>
          <thead>
            <tr>
              <th>CP ID</th>
              <th>Name</th>
              <th>ABN</th>
              <th>Category</th>
              <th>Active Contracts</th>
              <th>Currency</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7}><div className="h-8 bg-[rgba(26,46,36,0.04)] rounded animate-pulse" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-50)', padding: 40 }}>No counterparties found</td></tr>
            ) : (
              filtered.map(vendor => (
                <tr key={vendor.id}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{vendor.id.slice(0, 8)}</td>
                  <td>
                    <Link href={`/counterparties/${vendor.id}`} style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {vendor.name}
                    </Link>
                  </td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{vendor.abn || '\u2014'}</td>
                  <td>{vendor.industry || '\u2014'}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{contractCounts?.[vendor.id] || 0}</td>
                  <td>{vendor.currency}</td>
                  <td><span className="badge active">Active</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
