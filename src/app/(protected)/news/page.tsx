"use client";

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { VendorSelector } from '@/components/news/vendor-selector';
import { NewsPanel } from '@/components/news/news-panel';
import { useVendorNews } from '@/hooks/use-ai-features';

const defaultVendors = ['Salesforce', 'AWS', 'Equifax', 'Deloitte', 'Twilio', 'KPMG'];

export default function NewsPage() {
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const vendorNews = useVendorNews();

  const handleRefresh = () => {
    if (selectedVendor) {
      vendorNews.mutate(selectedVendor);
    }
  };

  return (
    <AppLayout title="Vendor News">
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-50)', marginBottom: 12 }}>
          AI-powered vendor news monitoring. Select a vendor and click Refresh to search for recent news.
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--text-50)' }}>
            {selectedVendor ? `Showing news for: ${selectedVendor}` : 'Select a vendor'}
          </span>
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

      <VendorSelector
        vendors={defaultVendors}
        selected={selectedVendor}
        onSelect={setSelectedVendor}
      />

      <div className="panel">
        <NewsPanel
          articles={vendorNews.data ?? []}
          isLoading={vendorNews.isPending}
        />
      </div>
    </AppLayout>
  );
}
