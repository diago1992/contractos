"use client";

import { useEffect, useRef } from 'react';
import { useVendorDescription } from '@/hooks/use-ai-features';

interface AiDescriptionProps {
  vendorId: string;
  description: string | null;
}

export function AiDescription({ vendorId, description }: AiDescriptionProps) {
  const generate = useVendorDescription();
  const hasAutoTriggered = useRef(false);

  // Auto-generate on first visit if no description exists (debounced 2s)
  useEffect(() => {
    if (!description && !generate.isPending && !hasAutoTriggered.current) {
      hasAutoTriggered.current = true;
      const timer = setTimeout(() => {
        generate.mutate(vendorId);
      }, 2000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, vendorId]);

  return (
    <div className="ai-desc-box">
      <div className="ai-desc-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a4 4 0 0 0-4 4c0 2 1 3 2 4l-3 8h10l-3-8c1-1 2-2 2-4a4 4 0 0 0-4-4z"/>
          <path d="M8 18h8"/><path d="M9 22h6"/>
        </svg>
      </div>
      <div className="ai-desc-text" style={{ flex: 1 }}>
        {generate.isPending ? (
          <span style={{ color: 'var(--text-50)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="spinner" style={{ width: 14, height: 14 }} />
            Generating description...
          </span>
        ) : generate.isError ? (
          <span style={{ color: 'var(--red)' }}>
            Failed to generate description. Click Regenerate to retry.
          </span>
        ) : description ? (
          description
        ) : (
          <span style={{ color: 'var(--text-50)' }}>No AI description generated yet.</span>
        )}
      </div>
      <button
        className="btn-secondary"
        style={{ whiteSpace: 'nowrap', alignSelf: 'flex-start' }}
        onClick={() => generate.mutate(vendorId)}
        disabled={generate.isPending}
      >
        {generate.isPending ? 'Generating...' : description ? 'Regenerate' : 'Generate'}
      </button>
    </div>
  );
}
