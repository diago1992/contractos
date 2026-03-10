"use client";

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useVendors } from '@/hooks/use-vendors';
import { pollExtractionStatus } from '@/lib/utils/poll-extraction';

type FileStatus = 'queued' | 'uploading' | 'processing' | 'done' | 'error';

interface BatchFile {
  file: File;
  vendorId: string;
  status: FileStatus;
  contractId?: string;
  errorMsg?: string;
}

export default function BatchUploadPage() {
  const { data: vendors, isLoading: vendorsLoading } = useVendors();

  const [defaultVendorId, setDefaultVendorId] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const defaultVendor = vendors?.find(v => v.id === defaultVendorId);

  const filteredVendors = vendors?.filter(v =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase())
  ) ?? [];

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles)
      .filter(f => f.type === 'application/pdf' || f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      .map(f => ({
        file: f,
        vendorId: defaultVendorId,
        status: 'queued' as FileStatus,
      }));

    if (arr.length === 0) return;
    setFiles(prev => [...prev, ...arr]);
  }, [defaultVendorId]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileVendor = (index: number, vendorId: string) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, vendorId } : f));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleUploadAll = async () => {
    if (files.length === 0) return;

    // Check all files have a vendor assigned
    const unassigned = files.filter(f => !f.vendorId);
    if (unassigned.length > 0) {
      alert(`${unassigned.length} file(s) have no vendor assigned. Select a default vendor or assign per file.`);
      return;
    }

    setIsProcessing(true);

    // Build vendor assignments map
    const vendorAssignments: Record<string, string> = {};
    files.forEach(f => {
      vendorAssignments[f.file.name] = f.vendorId;
    });

    // Mark all as uploading
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' })));

    try {
      // Upload all files via batch API
      const formData = new FormData();
      files.forEach(f => formData.append('files', f.file));
      formData.append('vendor_assignments', JSON.stringify(vendorAssignments));

      const res = await fetch('/api/upload/batch', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        // All failed
        setFiles(prev => prev.map(f => ({
          ...f,
          status: 'error',
          errorMsg: data.error || 'Upload failed',
        })));
        setIsProcessing(false);
        return;
      }

      // Map results back to files
      const contractMap = new Map<string, string>();
      for (const c of data.contracts) {
        contractMap.set(c.fileName, c.id);
      }

      // Update files with contract IDs and mark as processing
      setFiles(prev => prev.map(f => {
        const contractId = contractMap.get(f.file.name);
        if (contractId) {
          return { ...f, contractId, status: 'processing' };
        }
        // File failed to upload
        const fileError = data.errors?.find((e: string) => e.startsWith(f.file.name));
        return { ...f, status: 'error', errorMsg: fileError || 'Upload failed' };
      }));

      // Poll extraction status for all uploaded contracts
      const contractIds = Array.from(contractMap.entries());
      await Promise.all(
        contractIds.map(async ([fileName, contractId]) => {
          const result = await pollExtractionStatus(contractId);
          setFiles(prev => prev.map(f => {
            if (f.file.name === fileName) {
              return {
                ...f,
                status: result === 'extracted' ? 'done' : 'error',
                errorMsg: result === 'failed' ? 'AI processing failed' : undefined,
              };
            }
            return f;
          }));
        })
      );
    } catch {
      setFiles(prev => prev.map(f => f.status !== 'done' ? { ...f, status: 'error', errorMsg: 'Upload failed' } : f));
    } finally {
      setIsProcessing(false);
    }
  };

  const doneCount = files.filter(f => f.status === 'done').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const allDone = files.length > 0 && !isProcessing && files.every(f => f.status === 'done' || f.status === 'error');

  return (
    <AppLayout title="Batch Upload">
      <Link
        href="/contracts"
        style={{ fontSize: 13, color: 'var(--text-50)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16, textDecoration: 'none' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        Back to Contracts
      </Link>

      <div className="panel" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="panel-title">Batch Upload Contracts</div>

        {/* Default Vendor Selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-50)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
            Default Counterparty
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={vendorsLoading ? 'Loading vendors...' : 'Select default vendor for all files...'}
              value={defaultVendor ? defaultVendor.name : vendorSearch}
              onChange={e => {
                setVendorSearch(e.target.value);
                setDefaultVendorId('');
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              disabled={isProcessing}
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
                maxHeight: 200,
                overflowY: 'auto',
                zIndex: 50,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}>
                {filteredVendors.map(v => (
                  <button
                    key={v.id}
                    onMouseDown={() => {
                      setDefaultVendorId(v.id);
                      setVendorSearch('');
                      setShowDropdown(false);
                      // Apply to all queued files without a vendor
                      setFiles(prev => prev.map(f =>
                        f.status === 'queued' && !f.vendorId ? { ...f, vendorId: v.id } : f
                      ));
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

        {/* Drop Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (isProcessing) return;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf,.docx';
            input.multiple = true;
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              if (target.files) addFiles(target.files);
            };
            input.click();
          }}
          style={{
            border: `2px dashed ${dragOver ? 'var(--teal)' : 'rgba(26,46,36,0.15)'}`,
            borderRadius: 10,
            padding: '28px 20px',
            textAlign: 'center',
            cursor: isProcessing ? 'default' : 'pointer',
            background: dragOver ? 'rgba(26,138,90,0.04)' : 'var(--mm-bg)',
            transition: 'all 0.15s',
            marginBottom: 20,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-30)" strokeWidth="2" style={{ marginBottom: 8 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div style={{ fontSize: 13, color: 'var(--text-50)' }}>
            Drag & drop multiple PDFs or DOCX files, or click to browse
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-30)', marginTop: 4 }}>
            Maximum 50 files per batch
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="table-wrap" style={{ marginBottom: 20 }}>
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Size</th>
                  <th>Vendor</th>
                  <th>Status</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {files.map((f, i) => (
                  <tr key={`${f.file.name}-${i}`}>
                    <td style={{ fontWeight: 500 }}>{f.file.name}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{(f.file.size / 1024 / 1024).toFixed(1)} MB</td>
                    <td>
                      {f.status === 'queued' ? (
                        <select
                          value={f.vendorId}
                          onChange={e => updateFileVendor(i, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            border: '1px solid rgba(26,46,36,0.12)',
                            borderRadius: 6,
                            fontSize: 12,
                            background: 'var(--mm-bg)',
                            color: 'var(--text)',
                            maxWidth: 180,
                          }}
                        >
                          <option value="">Select...</option>
                          {vendors?.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ fontSize: 12 }}>{vendors?.find(v => v.id === f.vendorId)?.name || '—'}</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${f.status === 'done' ? 'active' : f.status === 'error' ? 'expired' : f.status === 'queued' ? 'draft' : 'expiring'}`}>
                        {f.status === 'queued' && 'Queued'}
                        {f.status === 'uploading' && 'Uploading'}
                        {f.status === 'processing' && 'Processing'}
                        {f.status === 'done' && 'Complete'}
                        {f.status === 'error' && 'Failed'}
                      </span>
                      {f.errorMsg && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>{f.errorMsg}</div>}
                    </td>
                    <td>
                      {f.status === 'queued' && (
                        <button
                          onClick={() => removeFile(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-30)', fontSize: 16 }}
                          title="Remove"
                        >
                          &times;
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        {allDone && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 500,
            background: errorCount === 0 ? 'rgba(26,138,90,0.08)' : 'rgba(224,123,0,0.08)',
            color: errorCount === 0 ? 'var(--teal)' : 'var(--amber)',
          }}>
            {doneCount} of {files.length} contracts processed successfully
            {errorCount > 0 && ` — ${errorCount} failed`}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {allDone ? (
            <>
              <button className="btn-secondary" onClick={() => setFiles([])} style={{ flex: 1 }}>
                Upload More
              </button>
              <Link href="/contracts" className="btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                View Contracts
              </Link>
            </>
          ) : (
            <button
              className="btn-primary"
              onClick={handleUploadAll}
              disabled={files.length === 0 || isProcessing}
              style={{ flex: 1, opacity: (files.length === 0 || isProcessing) ? 0.5 : 1 }}
            >
              {isProcessing ? (
                <><span className="spinner" style={{ width: 14, height: 14 }} /> Processing {files.length} files...</>
              ) : (
                `Upload & Process ${files.length} File${files.length !== 1 ? 's' : ''}`
              )}
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
