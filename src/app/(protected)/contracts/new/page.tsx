"use client";

import { useState, useRef, useCallback, type ChangeEvent, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useVendors } from '@/hooks/use-vendors';
import { createClient } from '@/lib/supabase/client';

type UploadStep = 'idle' | 'uploading' | 'processing' | 'extracting' | 'done' | 'error';

const STEP_LABELS: Record<UploadStep, string> = {
  idle: '',
  uploading: 'Uploading file to storage...',
  processing: 'Starting AI analysis...',
  extracting: 'Extracting terms, dates & obligations...',
  done: 'Processing complete!',
  error: '',
};

export default function NewContractPage() {
  const router = useRouter();
  const { data: vendors, isLoading: vendorsLoading } = useVendors();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<UploadStep>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const selectedVendor = vendors?.find(v => v.id === selectedVendorId);
  const isProcessing = step === 'uploading' || step === 'processing' || step === 'extracting';

  const filteredVendors = vendors?.filter(v =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase())
  ) ?? [];

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const pollExtractionStatus = async (contractId: string): Promise<'extracted' | 'failed'> => {
    const supabase = createClient();
    const maxAttempts = 60; // 2 minutes max
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const { data } = await supabase
        .from('contracts')
        .select('extraction_status')
        .eq('id', contractId)
        .single();

      if (data?.extraction_status === 'extracted' || data?.extraction_status === 'verified') {
        return 'extracted';
      }
      if (data?.extraction_status === 'failed') {
        return 'failed';
      }
      // still processing — continue polling
    }
    return 'failed'; // timeout
  };

  const handleUpload = async () => {
    if (!file || !selectedVendorId) return;

    setStep('uploading');
    setErrorMsg('');

    try {
      // Step 1: Upload file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('vendor_id', selectedVendorId);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Upload failed');
      }

      const { id: contractId } = await uploadRes.json();

      // Step 2: Trigger AI processing
      setStep('processing');
      const processRes = await fetch(`/api/process/${contractId}`, { method: 'POST' });
      if (!processRes.ok && processRes.status !== 409) {
        const err = await processRes.json();
        throw new Error(err.error || 'Processing failed to start');
      }

      // Step 3: Poll for completion
      setStep('extracting');
      const result = await pollExtractionStatus(contractId);

      if (result === 'extracted') {
        setStep('done');
      } else {
        throw new Error('AI processing failed or timed out. You can retry from the counterparty page.');
      }
    } catch (err) {
      setStep('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const stepIndex = (s: UploadStep) => ['uploading', 'processing', 'extracting', 'done'].indexOf(s);
  const steps = [
    { key: 'uploading', label: 'Upload' },
    { key: 'processing', label: 'Analyse' },
    { key: 'extracting', label: 'Extract' },
    { key: 'done', label: 'Complete' },
  ];

  return (
    <AppLayout title="New Contract">
      <Link
        href="/contracts"
        style={{ fontSize: 13, color: 'var(--text-50)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16, textDecoration: 'none' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        Back to Contracts
      </Link>

      <div className="panel" style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="panel-title">Upload New Contract</div>

        {/* Vendor Selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-50)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
            Counterparty
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={vendorsLoading ? 'Loading vendors...' : 'Search vendors...'}
              value={selectedVendor ? selectedVendor.name : vendorSearch}
              onChange={e => {
                setVendorSearch(e.target.value);
                setSelectedVendorId('');
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
              disabled={isProcessing || step === 'done'}
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
                maxHeight: 200,
                overflowY: 'auto',
                zIndex: 50,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}>
                {filteredVendors.map(v => (
                  <button
                    key={v.id}
                    onMouseDown={() => {
                      setSelectedVendorId(v.id);
                      setVendorSearch('');
                      setShowDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
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
        </div>

        {/* File Drop Zone */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-50)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
            Document
          </label>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => step === 'idle' && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--teal)' : 'rgba(26,46,36,0.15)'}`,
              borderRadius: 10,
              padding: '32px 20px',
              textAlign: 'center',
              cursor: step === 'idle' ? 'pointer' : 'default',
              background: dragOver ? 'rgba(26,138,90,0.04)' : 'var(--mm-bg)',
              transition: 'all 0.15s',
            }}
          >
            {file ? (
              <div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" style={{ marginBottom: 8 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>
                </svg>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{file.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-50)', marginTop: 2 }}>
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
            ) : (
              <div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-30)" strokeWidth="2" style={{ marginBottom: 8 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <div style={{ fontSize: 13, color: 'var(--text-50)' }}>
                  Drag & drop a PDF or DOCX, or click to browse
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>

        {/* Step Progress */}
        {step !== 'idle' && step !== 'error' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              {steps.map((s, i) => {
                const current = stepIndex(step);
                const isComplete = i < current;
                const isCurrent = i === current;
                return (
                  <div key={s.key} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      margin: '0 auto 4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      background: isComplete ? 'var(--teal)' : isCurrent ? 'var(--mm-surface)' : 'rgba(26,46,36,0.08)',
                      color: isComplete || isCurrent ? '#fff' : 'var(--text-50)',
                      transition: 'all 0.3s',
                    }}>
                      {isComplete ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: isCurrent ? 'var(--text)' : 'var(--text-50)', fontWeight: isCurrent ? 600 : 400 }}>
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Progress bar */}
            <div style={{ height: 3, background: 'rgba(26,46,36,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: step === 'done' ? 'var(--teal)' : 'var(--mm-surface)',
                borderRadius: 2,
                width: `${((stepIndex(step) + (step === 'done' ? 1 : 0.5)) / steps.length) * 100}%`,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        )}

        {/* Status Message */}
        {step !== 'idle' && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: step === 'error' ? 'rgba(217,48,37,0.08)' : step === 'done' ? 'rgba(26,138,90,0.08)' : 'rgba(26,46,36,0.04)',
            color: step === 'error' ? 'var(--red)' : step === 'done' ? 'var(--teal)' : 'var(--text-80)',
          }}>
            {isProcessing && (
              <span className="spinner" style={{ width: 16, height: 16 }} />
            )}
            {step === 'done' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            )}
            {step === 'error' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            )}
            {step === 'error' ? errorMsg : STEP_LABELS[step]}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {step === 'done' ? (
            <button
              className="btn-primary"
              onClick={() => router.push(`/counterparties/${selectedVendorId}`)}
              style={{ flex: 1 }}
            >
              View Contract
            </button>
          ) : step === 'error' ? (
            <>
              <button
                className="btn-secondary"
                onClick={() => { setStep('idle'); setErrorMsg(''); }}
                style={{ flex: 1 }}
              >
                Try Again
              </button>
              {selectedVendorId && (
                <button
                  className="btn-primary"
                  onClick={() => router.push(`/counterparties/${selectedVendorId}`)}
                  style={{ flex: 1 }}
                >
                  View Counterparty
                </button>
              )}
            </>
          ) : (
            <button
              className="btn-primary"
              onClick={handleUpload}
              disabled={!file || !selectedVendorId || isProcessing}
              style={{ flex: 1, opacity: (!file || !selectedVendorId || isProcessing) ? 0.5 : 1 }}
            >
              {isProcessing ? 'Processing...' : 'Upload & Process'}
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
