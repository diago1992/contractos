"use client";

import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { NewsPanel } from '@/components/news/news-panel';
import { useVendorNews } from '@/hooks/use-ai-features';
import { useVendors } from '@/hooks/use-vendors';

export default function NewsPage() {
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const vendorNews = useVendorNews();
  const { data: vendors } = useVendors();

  const filteredVendors = vendors?.filter(v =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase())
  ) ?? [];

  const handleSelectVendor = (name: string) => {
    setSelectedVendor(name);
    setVendorSearch('');
    setShowDropdown(false);
    vendorNews.mutate(name);
  };

  const handleRefresh = () => {
    if (selectedVendor) {
      vendorNews.mutate(selectedVendor);
    }
  };

  return (
    <AppLayout title="Vendor News">
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--text-50)', marginBottom: 12 }}>
          AI-powered vendor risk monitoring. Select a vendor to search for risk-relevant news.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          {/* Vendor Dropdown */}
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Search vendors..."
              value={selectedVendor && !showDropdown ? selectedVendor : vendorSearch}
              onChange={e => {
                setVendorSearch(e.target.value);
                if (selectedVendor) setSelectedVendor(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid rgba(26,46,36,0.12)',
                borderRadius: 8,
                fontSize: 13,
                background: 'var(--mm-bg)',
                color: 'var(--text)',
                boxSizing: 'border-box',
              }}
            />
            {showDropdown && filteredVendors.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--mm-card)',
                border: '1px solid rgba(26,46,36,0.12)',
                borderRadius: 8,
                marginTop: 4,
                maxHeight: 240,
                overflowY: 'auto',
                zIndex: 50,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}>
                {filteredVendors.map(v => (
                  <button
                    key={v.id}
                    onMouseDown={() => handleSelectVendor(v.name)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      textAlign: 'left',
                      border: 'none',
                      background: selectedVendor === v.name ? 'rgba(26,46,36,0.04)' : 'transparent',
                      fontSize: 13,
                      color: 'var(--text)',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(26,46,36,0.04)',
                    }}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="btn-primary"
            onClick={handleRefresh}
            disabled={!selectedVendor || vendorNews.isPending}
          >
            {vendorNews.isPending ? (
              <><span className="spinner" style={{ width: 14, height: 14 }} /> Searching...</>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      <div className="panel">
        <NewsPanel
          articles={vendorNews.data ?? []}
          isLoading={vendorNews.isPending}
        />
      </div>
    </AppLayout>
  );
}
