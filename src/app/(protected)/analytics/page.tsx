"use client";

import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { useAllContracts } from '@/hooks/use-contracts';

const costCentres = ['All', 'Technology', 'Risk & Credit', 'Finance', 'Marketing', 'Legal', 'Operations'];

export default function AnalyticsPage() {
  const [activeCentre, setActiveCentre] = useState('All');
  const { data: contracts, isLoading } = useAllContracts();

  const filtered = useMemo(() => {
    if (!contracts) return [];
    if (activeCentre === 'All') return contracts;
    return contracts.filter(c => c.cost_centre === activeCentre);
  }, [contracts, activeCentre]);

  const totalValue = filtered.reduce((sum, c) => sum + (c.annual_value || 0), 0);
  const activeCount = filtered.filter(c => c.status === 'active').length;
  const avgValue = filtered.length > 0 ? totalValue / filtered.length : 0;
  const expiringCount = filtered.filter(c => {
    if (!c.expiry_date) return false;
    const days = (new Date(c.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 90;
  }).length;

  const formatCurrency = (val: number) =>
    val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val.toFixed(0)}`;

  // Group by cost centre for bar chart
  const byCentre = useMemo(() => {
    if (!contracts) return [];
    const map = new Map<string, { value: number; count: number }>();
    contracts.forEach(c => {
      const cc = c.cost_centre || 'Unassigned';
      const cur = map.get(cc) || { value: 0, count: 0 };
      map.set(cc, { value: cur.value + (c.annual_value || 0), count: cur.count + 1 });
    });
    return Array.from(map.entries()).sort((a, b) => b[1].value - a[1].value);
  }, [contracts]);

  const maxValue = Math.max(...byCentre.map(([, d]) => d.value), 1);

  // Top 5 by value
  const topByValue = [...filtered].sort((a, b) => (b.annual_value || 0) - (a.annual_value || 0)).slice(0, 5);
  // 5 most recent
  const recent = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  // 5 upcoming renewals
  const renewals = filtered
    .filter(c => c.expiry_date && new Date(c.expiry_date) > new Date())
    .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime())
    .slice(0, 5);

  // Contracts without vendor
  const contractsWithoutVendor = filtered.filter(c => !c.counterparty_name).slice(0, 5);
  // Contracts with missing info
  const contractsMissingInfo = filtered.filter(c => !c.cost_centre || !c.mm_owner || !c.annual_value).slice(0, 5);

  return (
    <AppLayout title="Analytics">
      {/* Cost centre filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {costCentres.map(cc => (
          <button
            key={cc}
            className={activeCentre === cc ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveCentre(cc)}
          >
            {cc}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Contract Value</div>
          <div className="stat-value">{formatCurrency(totalValue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Contracts</div>
          <div className="stat-value">{activeCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Average Value</div>
          <div className="stat-value">{formatCurrency(avgValue)}</div>
        </div>
        <div className="stat-card warn">
          <div className="stat-label">Expiring (90 days)</div>
          <div className="stat-value">{expiringCount}</div>
        </div>
      </div>

      {/* Contract Value by Cost Centre */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-title">Contract Value by Cost Centre</div>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-[rgba(26,46,36,0.04)] rounded animate-pulse" />)}</div>
        ) : (
          <div>
            {byCentre.map(([name, data]) => (
              <div key={name} className="bar-row">
                <span className="bar-label">{name}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(data.value / maxValue) * 100}%` }} />
                </div>
                <span className="bar-value">{formatCurrency(data.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 20 }}>
        <div className="panel">
          <div className="panel-title">Top 5 Contract Values</div>
          {topByValue.map(c => (
            <div key={c.id} className="spend-row">
              <span className="spend-name">{c.counterparty_name || c.title}</span>
              <span className="spend-pct" style={{ color: 'var(--text)' }}>{formatCurrency(c.annual_value || 0)}</span>
            </div>
          ))}
          {topByValue.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-50)' }}>No data</p>}
        </div>
        <div className="panel">
          <div className="panel-title">Recently Added</div>
          {recent.map(c => (
            <div key={c.id} className="act-item">
              <div className="act-dot" />
              <span className="act-text">{c.title}</span>
            </div>
          ))}
          {recent.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-50)' }}>No data</p>}
        </div>
        <div className="panel">
          <div className="panel-title">Upcoming Renewals</div>
          {renewals.map(c => (
            <div key={c.id} className="act-item">
              <div className="act-dot warn" />
              <span className="act-text">{c.counterparty_name || c.title}</span>
              <span className="act-time">{c.expiry_date}</span>
            </div>
          ))}
          {renewals.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-50)' }}>No data</p>}
        </div>
      </div>

      {/* 2-column grid */}
      <div className="dash-row equal">
        <div className="panel">
          <div className="panel-title">Contracts Without Linked Vendor</div>
          {contractsWithoutVendor.map(c => (
            <div key={c.id} className="act-item">
              <div className="act-dot danger" />
              <span className="act-text">{c.title}</span>
            </div>
          ))}
          {contractsWithoutVendor.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-50)' }}>All contracts have vendors</p>}
        </div>
        <div className="panel">
          <div className="panel-title">Contracts With Missing Information</div>
          {contractsMissingInfo.map(c => (
            <div key={c.id} className="act-item">
              <div className="act-dot warn" />
              <span className="act-text">{c.title}</span>
              <span className="act-time">
                {[!c.cost_centre && 'Cost Centre', !c.mm_owner && 'Owner', !c.annual_value && 'Value'].filter(Boolean).join(', ')}
              </span>
            </div>
          ))}
          {contractsMissingInfo.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-50)' }}>All contracts have complete info</p>}
        </div>
      </div>
    </AppLayout>
  );
}
