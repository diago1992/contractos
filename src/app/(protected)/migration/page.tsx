"use client";

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useVendors } from '@/hooks/use-vendors';
import { createClient } from '@/lib/supabase/client';

interface ImportFile {
  file: File;
  status: 'queued' | 'uploading' | 'uploaded' | 'error';
  errorMsg?: string;
}

interface QueueStats {
  pending: number;
  processing: number;
  extracted: number;
  failed: number;
  total: number;
}

const CHUNK_SIZE = 5; // Files per upload request

export default function ImportPage() {
  const { data: vendors, isLoading: vendorsLoading } = useVendors();

  const [defaultVendorId, setDefaultVendorId] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [files, setFiles] = useState<ImportFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [showQueue, setShowQueue] = useState(false);

  const defaultVendor = vendors?.find(v => v.id === defaultVendorId);

  const filteredVendors = vendors?.filter(v =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase())
  ) ?? [];

  // Poll queue stats every 10s when queue panel is visible
  useEffect(() => {
    if (!showQueue) return;

    const fetchStats = async () => {
      const supabase = createClient();
      const [pending, processing, extracted, failed] = await Promise.all([
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('extraction_status', 'pending').is('deleted_at', null),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('extraction_status', 'processing').is('deleted_at', null),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).in('extraction_status', ['extracted', 'verified']).is('deleted_at', null),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('extraction_status', 'failed').is('deleted_at', null),
      ]);
      setQueueStats({
        pending: pending.count ?? 0,
        processing: processing.count ?? 0,
        extracted: extracted.count ?? 0,
        failed: failed.count ?? 0,
        total: (pending.count ?? 0) + (processing.count ?? 0) + (extracted.count ?? 0) + (failed.count ?? 0),
      });
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [showQueue]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles)
      .filter(f => f.type === 'application/pdf' || f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      .map(f => ({
        file: f,
        status: 'queued' as const,
      }));
    if (arr.length === 0) return;
    setFiles(prev => [...prev, ...arr]);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleUploadAll = async () => {
    // Build list of queued file indices for stable tracking
    const queuedIndices: number[] = [];
    files.forEach((f, i) => { if (f.status === 'queued') queuedIndices.push(i); });
    if (queuedIndices.length === 0 || !defaultVendorId) return;

    setIsUploading(true);
    setUploadProgress({ done: 0, total: queuedIndices.length });

    let uploaded = 0;
    for (let c = 0; c < queuedIndices.length; c += CHUNK_SIZE) {
      const chunkIndices = queuedIndices.slice(c, c + CHUNK_SIZE);
      const chunkIndexSet = new Set(chunkIndices);

      // Mark chunk as uploading
      setFiles(prev => prev.map((f, i) =>
        chunkIndexSet.has(i) ? { ...f, status: 'uploading' } : f
      ));

      try {
        const formData = new FormData();
        const vendorAssignments: Record<string, string> = {};
        chunkIndices.forEach(idx => {
          const f = files[idx];
          formData.append('files', f.file);
          vendorAssignments[f.file.name] = defaultVendorId;
        });
        formData.append('vendor_assignments', JSON.stringify(vendorAssignments));

        const res = await fetch('/api/upload/import', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) {
          setFiles(prev => prev.map((f, i) =>
            chunkIndexSet.has(i) && f.status === 'uploading'
              ? { ...f, status: 'error', errorMsg: data.error || 'Upload failed' }
              : f
          ));
        } else {
          const uploadedNames = new Set((data.contracts || []).map((r: { fileName: string }) => r.fileName));
          setFiles(prev => prev.map((f, i) => {
            if (!chunkIndexSet.has(i) || f.status !== 'uploading') return f;
            if (uploadedNames.has(f.file.name)) {
              return { ...f, status: 'uploaded' };
            }
            const fileError = data.errors?.find((e: string) => e.startsWith(f.file.name));
            return { ...f, status: 'error', errorMsg: fileError || 'Upload failed' };
          }));
          uploaded += data.uploaded || 0;
        }
      } catch {
        setFiles(prev => prev.map((f, i) =>
          chunkIndexSet.has(i) && f.status === 'uploading'
            ? { ...f, status: 'error', errorMsg: 'Network error' }
            : f
        ));
      }

      setUploadProgress({ done: Math.min(c + CHUNK_SIZE, queuedIndices.length), total: queuedIndices.length });
    }

    setIsUploading(false);
    if (uploaded > 0) {
      setShowQueue(true);
    }
  };

  const uploadedCount = files.filter(f => f.status === 'uploaded').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const queuedCount = files.filter(f => f.status === 'queued').length;
  const allDone = files.length > 0 && !isUploading && queuedCount === 0;

  return (
    <AppLayout title="Migration">
      <div className="panel" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="panel-title">Contract Migration</div>
        <p style={{ fontSize: 13, color: 'var(--text-50)', marginBottom: 20, marginTop: -8 }}>
          Upload a large backlog of contracts. Files are stored immediately and AI processing runs in the background via a scheduled job — you can close this page and come back later.
        </p>

        {/* Vendor Selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-50)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
            Counterparty (applied to all files)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={vendorsLoading ? 'Loading vendors...' : 'Search vendors...'}
              value={defaultVendor ? defaultVendor.name : vendorSearch}
              onChange={e => {
                setVendorSearch(e.target.value);
                setDefaultVendorId('');
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              disabled={isUploading}
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
            if (isUploading) return;
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
            cursor: isUploading ? 'default' : 'pointer',
            background: dragOver ? 'rgba(26,138,90,0.04)' : 'var(--mm-bg)',
            transition: 'all 0.15s',
            marginBottom: 20,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-30)" strokeWidth="2" style={{ marginBottom: 8 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div style={{ fontSize: 13, color: 'var(--text-50)' }}>
            Drag & drop PDFs or DOCX files, or click to browse
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-30)', marginTop: 4 }}>
            No file limit — uploads are sent in chunks of {CHUNK_SIZE}
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </span>
              {queuedCount > 0 && !isUploading && (
                <button
                  onClick={() => setFiles(prev => prev.filter(f => f.status !== 'queued'))}
                  style={{ fontSize: 12, color: 'var(--text-50)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear queued
                </button>
              )}
            </div>
            <div className="table-wrap" style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f, i) => (
                    <tr key={`${f.file.name}-${i}`}>
                      <td style={{ fontWeight: 500, fontSize: 12 }}>{f.file.name}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{(f.file.size / 1024 / 1024).toFixed(1)} MB</td>
                      <td>
                        <span className={`badge ${f.status === 'uploaded' ? 'active' : f.status === 'error' ? 'expired' : f.status === 'queued' ? 'draft' : 'expiring'}`}>
                          {f.status === 'queued' && 'Queued'}
                          {f.status === 'uploading' && 'Uploading'}
                          {f.status === 'uploaded' && 'Uploaded'}
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
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-50)', marginBottom: 4 }}>
              <span>Uploading files...</span>
              <span>{uploadProgress.done} / {uploadProgress.total}</span>
            </div>
            <div style={{ height: 4, background: 'rgba(26,46,36,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: 'var(--teal)',
                borderRadius: 2,
                width: `${(uploadProgress.done / uploadProgress.total) * 100}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* Summary */}
        {allDone && uploadedCount > 0 && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 500,
            background: errorCount === 0 ? 'rgba(26,138,90,0.08)' : 'rgba(224,123,0,0.08)',
            color: errorCount === 0 ? 'var(--teal)' : 'var(--amber)',
          }}>
            {uploadedCount} file{uploadedCount !== 1 ? 's' : ''} uploaded successfully — AI processing will run automatically in the background.
            {errorCount > 0 && ` ${errorCount} failed.`}
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
              disabled={queuedCount === 0 || isUploading || !defaultVendorId}
              style={{ flex: 1, opacity: (queuedCount === 0 || isUploading || !defaultVendorId) ? 0.5 : 1 }}
            >
              {isUploading ? (
                <><span className="spinner" style={{ width: 14, height: 14 }} /> Uploading {uploadProgress.done}/{uploadProgress.total}...</>
              ) : (
                `Upload ${queuedCount} File${queuedCount !== 1 ? 's' : ''}`
              )}
            </button>
          )}
        </div>

        {/* Processing Queue Dashboard */}
        <div style={{ marginTop: 24, borderTop: '1px solid rgba(26,46,36,0.08)', paddingTop: 16 }}>
          <button
            onClick={() => setShowQueue(!showQueue)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: 0,
            }}
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: showQueue ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Processing Queue
            {queueStats && (queueStats.pending > 0 || queueStats.processing > 0) && (
              <span className="badge expiring" style={{ fontSize: 10 }}>
                {queueStats.pending + queueStats.processing} in queue
              </span>
            )}
          </button>

          {showQueue && (
            <div style={{ marginTop: 12 }}>
              {queueStats ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  <div style={{ padding: '12px', borderRadius: 8, background: 'rgba(26,46,36,0.04)', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{queueStats.pending}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-50)', marginTop: 2 }}>Pending</div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: 8, background: 'rgba(26,138,90,0.06)', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--mm-surface)', fontFamily: 'var(--mono)' }}>{queueStats.processing}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-50)', marginTop: 2 }}>Processing</div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: 8, background: 'rgba(26,138,90,0.08)', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--teal)', fontFamily: 'var(--mono)' }}>{queueStats.extracted}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-50)', marginTop: 2 }}>Complete</div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: 8, background: queueStats.failed > 0 ? 'rgba(217,48,37,0.06)' : 'rgba(26,46,36,0.04)', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: queueStats.failed > 0 ? 'var(--red)' : 'var(--text-30)', fontFamily: 'var(--mono)' }}>{queueStats.failed}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-50)', marginTop: 2 }}>Failed</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-50)' }}>Loading queue status...</div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-30)', marginTop: 8 }}>
                Auto-refreshes every 10 seconds. The cron job processes ~3 contracts every 2 minutes.
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
