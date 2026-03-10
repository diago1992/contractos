"use client";

import { useEsgSearch } from '@/hooks/use-ai-features';
import type { Vendor, EsgSearchResult } from '@/types/contracts';

interface EsgPanelProps {
  vendor: Vendor;
}

export function EsgPanel({ vendor }: EsgPanelProps) {
  const esgSearch = useEsgSearch();
  const esgData = vendor.esg_data as unknown as EsgSearchResult | null;
  const hasData = esgData && 'findings' in esgData && Array.isArray(esgData.findings) && esgData.findings.length > 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-50)' }}>
          {vendor.esg_updated_at
            ? `Last updated: ${new Date(vendor.esg_updated_at).toLocaleDateString()}`
            : 'No ESG data yet'}
        </span>
        <button
          className="btn-primary"
          onClick={() => esgSearch.mutate({ vendor_id: vendor.id, vendor_name: vendor.name })}
          disabled={esgSearch.isPending}
        >
          {esgSearch.isPending ? (
            <><span className="spinner" style={{ width: 14, height: 14 }} /> Searching...</>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              Search ESG Data
            </>
          )}
        </button>
      </div>

      {esgSearch.isError && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 8,
          marginBottom: 12,
          fontSize: 13,
          background: 'rgba(217,48,37,0.08)',
          color: 'var(--red)',
        }}>
          ESG search failed. Please try again.
        </div>
      )}

      {vendor.esg_summary && (
        <div className="ai-desc-box" style={{ marginBottom: 16 }}>
          <div className="ai-desc-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div className="ai-desc-text">{vendor.esg_summary}</div>
        </div>
      )}

      {hasData ? (
        <div className="esg-panel">
          {esgData.findings.map((finding, i) => (
            <div key={i} className="esg-field">
              <span className="esg-label">{finding.label}</span>
              <span className={`esg-val ${finding.status}`}>{finding.value}</span>
            </div>
          ))}
        </div>
      ) : !esgSearch.isPending ? (
        <p style={{ fontSize: 13, color: 'var(--text-50)', textAlign: 'center', padding: 40 }}>
          Click &quot;Search ESG Data&quot; to research this vendor&apos;s ESG profile using AI.
        </p>
      ) : null}
    </div>
  );
}
