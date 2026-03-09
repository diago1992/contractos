"use client";

import { useState, useRef, useCallback, type ChangeEvent, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useVendors } from '@/hooks/use-vendors';

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export default function NewContractPage() {
  const router = useRouter();
  const { data: vendors, isLoading: vendorsLoading } = useVendors();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [contractId, setContractId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const selectedVendor = vendors?.find(v => v.id === selectedVendorId);

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

  const handleUpload = async () => {
    if (!file || !selectedVendorId) return;

    setStatus('uploading');
    setErrorMsg('');

    try {
      // Step 1: Upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('vendor_id', selectedVendorId);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Upload failed');
      }

      const { id } = await uploadRes.json();
      setContractId(id);

      // Step 2: Trigger AI processing
      setStatus('processing');
      const processRes = await fetch(`/api/process/${id}`, { method: 'POST' });
      if (!processRes.ok) {
        const err = await processRes.json();
        // 409 means already processing — that's fine
        if (processRes.status !== 409) {
          throw new Error(err.error || 'Processing failed');
        }
      }

      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const statusLabel: Record<UploadStatus, string> = {
    idle: '',
    uploading: 'Uploading file...',
    processing: 'AI is analysing the contract...',
    done: 'Processing complete!',
    error: errorMsg || 'An error occurred',
  };

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
              disabled={status !== 'idle'}
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
            onClick={() => status === 'idle' && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--teal)' : 'rgba(26,46,36,0.15)'}`,
              borderRadius: 10,
              padding: '32px 20px',
              textAlign: 'center',
              cursor: status === 'idle' ? 'pointer' : 'default',
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

        {/* Status Indicator */}
        {status !== 'idle' && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: status === 'error' ? 'rgba(217,48,37,0.08)' : status === 'done' ? 'rgba(26,138,90,0.08)' : 'rgba(26,46,36,0.04)',
            color: status === 'error' ? 'var(--red)' : status === 'done' ? 'var(--teal)' : 'var(--text-80)',
          }}>
            {(status === 'uploading' || status === 'processing') && (
              <span className="spinner" style={{ width: 16, height: 16 }} />
            )}
            {status === 'done' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            )}
            {statusLabel[status]}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {status === 'done' ? (
            <button
              className="btn-primary"
              onClick={() => router.push(`/counterparties/${selectedVendorId}`)}
              style={{ flex: 1 }}
            >
              View Contract
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleUpload}
              disabled={!file || !selectedVendorId || status === 'uploading' || status === 'processing'}
              style={{ flex: 1, opacity: (!file || !selectedVendorId || status === 'uploading' || status === 'processing') ? 0.5 : 1 }}
            >
              {status === 'uploading' || status === 'processing' ? 'Processing...' : 'Upload & Process'}
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
