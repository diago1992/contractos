"use client";

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { FileDropzone } from '@/components/upload/file-dropzone';
import { UploadProgress } from '@/components/upload/upload-progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { FileText, ArrowRight, RotateCcw, CheckCircle, XCircle, Loader2 } from 'lucide-react';

type Step = 'idle' | 'uploading' | 'parsing' | 'classifying' | 'extracting' | 'done' | 'failed';

// ---------------------------------------------------------------------------
// Multi-file upload state
// ---------------------------------------------------------------------------

interface FileUploadState {
  file: File;
  status: 'queued' | 'uploading' | 'processing' | 'done' | 'failed';
  contractId?: string;
  error?: string;
}

export default function UploadPage() {
  const [mode, setMode] = useState<'single' | 'multi'>('single');

  // Single-file state
  const [step, setStep] = useState<Step>('idle');
  const [contractId, setContractId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [retrying, setRetrying] = useState(false);

  // Multi-file state
  const [fileQueue, setFileQueue] = useState<FileUploadState[]>([]);
  const [multiProcessing, setMultiProcessing] = useState(false);

  const supabase = createClient();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Realtime subscription for single file mode
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!contractId) return;

    const channel = supabase
      .channel(`upload-${contractId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'contracts',
        filter: `id=eq.${contractId}`,
      }, (payload) => {
        const newRow = payload.new as Record<string, unknown>;
        const extractionStatus = newRow.extraction_status as string;
        const documentType = newRow.document_type as string | null;

        if (extractionStatus === 'failed') {
          setStep('failed');
          setError('AI processing failed. You can retry processing below.');
        } else if (extractionStatus === 'extracted') {
          setStep('done');
          queryClient.invalidateQueries({ queryKey: ['contracts'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        } else if (extractionStatus === 'processing' && documentType) {
          setStep('extracting');
        } else if (extractionStatus === 'processing') {
          setStep('classifying');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [contractId, supabase, queryClient]);

  // ---------------------------------------------------------------------------
  // Single file handlers
  // ---------------------------------------------------------------------------

  const triggerProcessing = async (id: string) => {
    const res = await fetch(`/api/process/${id}`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Processing request failed' }));
      throw new Error(data.error || 'Processing request failed');
    }
  };

  const handleFileSelected = async (file: File) => {
    setStep('uploading');
    setError(undefined);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errData.error || 'Upload failed');
      }

      const { id } = await uploadRes.json();
      setContractId(id);
      setStep('parsing');

      triggerProcessing(id).catch((err) => {
        setStep('failed');
        setError(err.message);
      });
    } catch (err: unknown) {
      setStep('failed');
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleRetryProcessing = async () => {
    if (!contractId) return;
    setRetrying(true);
    setError(undefined);
    setStep('parsing');

    try {
      await triggerProcessing(contractId);
    } catch (err: unknown) {
      setStep('failed');
      setError(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setRetrying(false);
    }
  };

  const handleReset = () => {
    setStep('idle');
    setContractId(null);
    setError(undefined);
    setRetrying(false);
    setFileQueue([]);
    setMultiProcessing(false);
  };

  // ---------------------------------------------------------------------------
  // Multi-file handlers
  // ---------------------------------------------------------------------------

  const handleFilesSelected = useCallback((files: File[]) => {
    setFileQueue(files.map((f) => ({ file: f, status: 'queued' })));
  }, []);

  const processQueue = async () => {
    setMultiProcessing(true);

    for (let i = 0; i < fileQueue.length; i++) {
      // Update status to uploading
      setFileQueue((prev) => prev.map((item, idx) =>
        idx === i ? { ...item, status: 'uploading' as const } : item
      ));

      try {
        const formData = new FormData();
        formData.append('file', fileQueue[i].file);

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(errData.error || 'Upload failed');
        }

        const { id } = await uploadRes.json();

        setFileQueue((prev) => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'processing' as const, contractId: id } : item
        ));

        // Fire-and-forget processing
        triggerProcessing(id).catch(() => {});

        // Mark as done (processing happens in background)
        setFileQueue((prev) => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'done' as const } : item
        ));
      } catch (err: unknown) {
        setFileQueue((prev) => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'failed' as const, error: err instanceof Error ? err.message : 'Failed' } : item
        ));
      }
    }

    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    setMultiProcessing(false);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Upload Contract</h1>
          {step === 'idle' && fileQueue.length === 0 && (
            <div className="flex items-center gap-1 rounded-lg border p-1">
              <button
                onClick={() => setMode('single')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${mode === 'single' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Single
              </button>
              <button
                onClick={() => setMode('multi')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${mode === 'multi' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Batch
              </button>
            </div>
          )}
        </div>

        {/* Single file mode */}
        {mode === 'single' && (
          <>
            {step === 'idle' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Select a document</CardTitle>
                </CardHeader>
                <CardContent>
                  <FileDropzone onFileSelected={handleFileSelected} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Processing Contract</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <UploadProgress currentStep={step as Exclude<Step, 'idle'>} error={error} />

                  {step === 'done' && contractId && (
                    <div className="flex flex-col items-center gap-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <FileText className="h-5 w-5" />
                        <span className="font-medium">Contract processed successfully!</span>
                      </div>
                      <div className="flex gap-3">
                        <Link href={`/contracts/${contractId}`}>
                          <Button>
                            View Contract <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="outline" onClick={handleReset}>
                          Upload Another
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 'failed' && (
                    <div className="flex justify-center gap-3 pt-4 border-t">
                      {contractId && (
                        <Button onClick={handleRetryProcessing} disabled={retrying}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          {retrying ? 'Retrying...' : 'Retry Processing'}
                        </Button>
                      )}
                      <Button variant="outline" onClick={handleReset}>
                        Upload Different File
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Multi file mode */}
        {mode === 'multi' && (
          <>
            {fileQueue.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Select documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <FileDropzone
                    onFileSelected={() => {}}
                    onFilesSelected={handleFilesSelected}
                    multiple
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">
                    Batch Upload ({fileQueue.filter((f) => f.status === 'done').length}/{fileQueue.length})
                  </CardTitle>
                  {!multiProcessing && fileQueue.some((f) => f.status === 'queued') && (
                    <Button onClick={processQueue} size="sm">
                      Start Upload
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {fileQueue.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="shrink-0">
                        {item.status === 'queued' && <FileText className="h-4 w-4 text-muted-foreground" />}
                        {(item.status === 'uploading' || item.status === 'processing') && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                        {item.status === 'done' && <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />}
                        {item.status === 'failed' && <XCircle className="h-4 w-4 text-destructive" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.file.name}</p>
                        {item.error && <p className="text-xs text-destructive mt-0.5">{item.error}</p>}
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {item.status === 'queued' ? 'Queued' :
                         item.status === 'uploading' ? 'Uploading' :
                         item.status === 'processing' ? 'Processing' :
                         item.status === 'done' ? 'Done' : 'Failed'}
                      </Badge>
                    </div>
                  ))}

                  {!multiProcessing && fileQueue.every((f) => f.status === 'done' || f.status === 'failed') && (
                    <div className="flex justify-center gap-3 pt-4 border-t mt-4">
                      <Link href="/dashboard">
                        <Button>
                          View Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="outline" onClick={handleReset}>
                        Upload More
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
