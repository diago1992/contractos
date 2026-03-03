'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ExternalLink,
  Shield,
  CheckCircle,
  AlertTriangle,
  Building2,
  Receipt,
} from 'lucide-react';

import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectOption } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/contracts/status-badge';
import { ExtractionBadge } from '@/components/contracts/extraction-badge';
import { ContractMetadata } from '@/components/contracts/contract-metadata';
import { ContractTimeline } from '@/components/contracts/contract-timeline';
import { RelatedContracts } from '@/components/contracts/related-contracts';
import { VendorPanel } from '@/components/contracts/vendor-panel';
import { SpendProgress } from '@/components/contracts/spend-progress';
import { InvoiceTable } from '@/components/contracts/invoice-table';
import { useContractDetail } from '@/hooks/use-contract-detail';
import { useRealtimeStatus } from '@/hooks/use-realtime-status';
import { useUpdateObligationStatus } from '@/hooks/use-obligation-mutations';
import { useContractVendor } from '@/hooks/use-vendors';
import { useContractInvoices, useContractSpend } from '@/hooks/use-invoices';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeDate,
} from '@/lib/utils/formatters';
import {
  DOCUMENT_TYPE_LABELS,
  OBLIGATION_STATUS_LABELS,
} from '@/lib/utils/constants';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { ObligationStatus } from '@/types/contracts';

// =============================================================================
// Loading Skeleton
// =============================================================================

function ContractDetailSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-96" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      {/* Summary skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <Skeleton className="mt-2 h-4 w-3/5" />
        </CardContent>
      </Card>

      {/* Metadata skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>

      {/* Timeline skeleton */}
      <Skeleton className="h-24 w-full" />

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-full max-w-lg" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

// =============================================================================
// Error State
// =============================================================================

function ContractDetailError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="rounded-full bg-red-100 p-4">
        <Shield className="h-8 w-8 text-red-600" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Failed to load contract</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" className="mt-6" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function ContractDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const {
    data: contract,
    isLoading,
    isError,
    error,
    refetch,
  } = useContractDetail(id);

  // Subscribe to realtime updates for this contract
  useRealtimeStatus(id);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string>();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedObligations, setSelectedObligations] = useState<Set<string>>(new Set());

  const obligationMutation = useUpdateObligationStatus();
  const { vendor, isLoading: vendorLoading } = useContractVendor(id);
  const { invoices, isLoading: invoicesLoading } = useContractInvoices(id);
  const { totalSpend } = useContractSpend(id);

  // Fetch current user's role
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setUserRole(data.role);
        });
    });
  }, []);

  const canVerify = userRole === 'reviewer' || userRole === 'admin';
  const canEditObligations = userRole === 'reviewer' || userRole === 'admin';

  const handleObligationStatusChange = (obligationId: string, newStatus: ObligationStatus) => {
    obligationMutation.mutate({
      obligationIds: [obligationId],
      status: newStatus,
      contractId: id,
    });
  };

  const handleBulkStatusChange = (newStatus: ObligationStatus) => {
    if (selectedObligations.size === 0) return;
    obligationMutation.mutate({
      obligationIds: Array.from(selectedObligations),
      status: newStatus,
      contractId: id,
    });
    setSelectedObligations(new Set());
  };

  const toggleObligationSelection = (obligationId: string) => {
    setSelectedObligations((prev) => {
      const next = new Set(prev);
      if (next.has(obligationId)) {
        next.delete(obligationId);
      } else {
        next.add(obligationId);
      }
      return next;
    });
  };

  const toggleAllObligations = () => {
    if (!contract) return;
    if (selectedObligations.size === contract.obligations.length) {
      setSelectedObligations(new Set());
    } else {
      setSelectedObligations(new Set(contract.obligations.map((o) => o.id)));
    }
  };

  // ---------------------------------------------------------------------------
  // Verify handler
  // ---------------------------------------------------------------------------

  const handleVerify = async () => {
    if (!contract) return;

    setIsVerifying(true);
    setVerifyError(undefined);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          extraction_status: 'verified' as const,
          verified_by: user?.id ?? null,
          verified_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        setVerifyError(updateError.message || 'Failed to verify. You may not have permission.');
        return;
      }

      // Add audit log entry
      await supabase.from('audit_log').insert({
        contract_id: id as string,
        user_id: user?.id ?? null,
        action: 'verified',
        details: { previous_status: contract.extraction_status },
      });

      queryClient.invalidateQueries({ queryKey: ['contract', id] });
    } catch (err) {
      console.error('Failed to verify contract:', err);
      setVerifyError('An unexpected error occurred while verifying.');
    } finally {
      setIsVerifying(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AppLayout>
      {isLoading ? (
        <ContractDetailSkeleton />
      ) : isError ? (
        <ContractDetailError
          message={
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred.'
          }
          onRetry={() => refetch()}
        />
      ) : contract ? (
        <div className="space-y-8">
          {/* ================================================================
              Header Section
              ================================================================ */}
          <div className="space-y-4">
            {/* Back button */}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>

            {/* Title row */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
                  {contract.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={contract.status} />
                  <ExtractionBadge status={contract.extraction_status} />
                  {contract.extraction_status === 'verified' && (
                    <Badge variant="outline" className="text-xs">
                      Verified
                    </Badge>
                  )}
                  {(contract.document_types && contract.document_types.length > 0
                    ? contract.document_types
                    : contract.document_type ? [contract.document_type] : []
                  ).map((dt) => (
                    <Badge key={dt} variant="secondary" className="text-xs">
                      {DOCUMENT_TYPE_LABELS[dt as keyof typeof DOCUMENT_TYPE_LABELS] || dt}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <a
                  href={`/api/contracts/${contract.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4" />
                    View Source
                  </Button>
                </a>

                {canVerify && contract.extraction_status !== 'verified' && (
                  <Button
                    size="sm"
                    onClick={handleVerify}
                    disabled={
                      isVerifying ||
                      contract.extraction_status === 'pending' ||
                      contract.extraction_status === 'processing'
                    }
                  >
                    {isVerifying ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Verify
                      </>
                    )}
                  </Button>
                )}

                {contract.extraction_status === 'verified' && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Verified
                    {contract.verified_at && (
                      <span className="ml-1 font-normal">
                        {formatRelativeDate(contract.verified_at)}
                      </span>
                    )}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {verifyError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {verifyError}
            </div>
          )}

          <Separator />

          {/* ================================================================
              AI Summary Section
              ================================================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {contract.extraction_status === 'pending' ||
              contract.extraction_status === 'processing' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    {contract.extraction_status === 'pending'
                      ? 'Waiting for AI extraction to begin...'
                      : 'AI is analyzing this contract...'}
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              ) : contract.summary ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {contract.summary}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No summary available for this contract.
                </p>
              )}
            </CardContent>
          </Card>

          {/* ================================================================
              Contract Metadata Grid
              ================================================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contract Details</CardTitle>
            </CardHeader>
            <CardContent>
              <ContractMetadata contract={contract} />
            </CardContent>
          </Card>

          {/* ================================================================
              Contract Timeline
              ================================================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ContractTimeline
                effectiveDate={contract.effective_date}
                expiryDate={contract.expiry_date}
                noticePeriodDays={contract.notice_period_days}
              />
            </CardContent>
          </Card>

          {/* ================================================================
              Related Contracts
              ================================================================ */}
          <RelatedContracts contractId={id} />

          {/* ================================================================
              Tabbed Sections
              ================================================================ */}
          <Tabs defaultValue="commercial-terms">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="commercial-terms">
                Commercial Terms
                {contract.commercial_terms.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    {contract.commercial_terms.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="vendor-spend">
                Vendor &amp; Spend
              </TabsTrigger>
              <TabsTrigger value="obligations">
                Obligations
                {contract.obligations.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    {contract.obligations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="audit-log">Audit Log</TabsTrigger>
            </TabsList>

            {/* ----------------------------------------------------------
                Commercial Terms Tab
                ---------------------------------------------------------- */}
            <TabsContent value="commercial-terms">
              <Card>
                <CardContent className="pt-6">
                  {contract.commercial_terms.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No commercial terms have been extracted yet.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Term Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Currency</TableHead>
                          <TableHead>Frequency</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contract.commercial_terms.map((term) => (
                          <TableRow key={term.id}>
                            <TableCell className="font-medium whitespace-nowrap align-top">
                              {term.term_type}
                            </TableCell>
                            <TableCell className="text-sm leading-relaxed">
                              {term.description}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap align-top">
                              {formatCurrency(term.amount, term.currency ?? undefined)}
                            </TableCell>
                            <TableCell className="align-top">{term.currency ?? '\u2014'}</TableCell>
                            <TableCell className="align-top">{term.frequency ?? '\u2014'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ----------------------------------------------------------
                Vendor & Spend Tab
                ---------------------------------------------------------- */}
            <TabsContent value="vendor-spend">
              <div className="space-y-6">
                <VendorPanel contractId={id} vendor={vendor} isLoading={vendorLoading} canEdit={canVerify} />

                {vendor && (
                  <>
                    <SpendProgress
                      totalSpend={totalSpend}
                      contractValue={contract.commercial_terms.reduce((sum, t) => sum + (t.amount ?? 0), 0)}
                      currency={contract.commercial_terms[0]?.currency ?? 'AUD'}
                    />
                    <InvoiceTable invoices={invoices} isLoading={invoicesLoading} />
                  </>
                )}
              </div>
            </TabsContent>

            {/* ----------------------------------------------------------
                Obligations Tab
                ---------------------------------------------------------- */}
            <TabsContent value="obligations">
              <Card>
                <CardContent className="pt-6 space-y-6">
                  {/* Risk Rating Summary */}
                  {contract.obligations.length > 0 && (() => {
                    const total = contract.obligations.length;
                    const overdue = contract.obligations.filter(o => o.status === 'overdue').length;
                    const pending = contract.obligations.filter(o => o.status === 'pending').length;
                    const riskLevel = overdue > 0 ? 'high' : pending > total * 0.5 ? 'medium' : 'low';
                    const riskConfig = {
                      high: { label: 'High Risk', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800' },
                      medium: { label: 'Medium Risk', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800' },
                      low: { label: 'Low Risk', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' },
                    };
                    const config = riskConfig[riskLevel];

                    return (
                      <div className={cn('flex items-center gap-3 rounded-lg border p-4', config.bg)}>
                        <AlertTriangle className={cn('h-5 w-5 shrink-0', config.color)} />
                        <div className="flex-1">
                          <p className={cn('text-sm font-semibold', config.color)}>{config.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {total} obligation{total !== 1 ? 's' : ''} total
                            {overdue > 0 && <> &middot; <span className="text-red-600 dark:text-red-400 font-medium">{overdue} overdue</span></>}
                            {pending > 0 && <> &middot; {pending} pending</>}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Bulk action bar */}
                  {canEditObligations && selectedObligations.size > 0 && (
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                      <span className="text-sm font-medium">
                        {selectedObligations.size} selected
                      </span>
                      <Select
                        className="w-40"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleBulkStatusChange(e.target.value as ObligationStatus);
                            e.target.value = '';
                          }
                        }}
                      >
                        <SelectOption value="" disabled>Set status...</SelectOption>
                        {(Object.entries(OBLIGATION_STATUS_LABELS) as [ObligationStatus, string][]).map(([value, label]) => (
                          <SelectOption key={value} value={value}>{label}</SelectOption>
                        ))}
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedObligations(new Set())}
                      >
                        Clear
                      </Button>
                    </div>
                  )}

                  {contract.obligations.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No obligations have been extracted yet.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {canEditObligations && (
                            <TableHead className="w-10">
                              <Checkbox
                                checked={selectedObligations.size === contract.obligations.length}
                                indeterminate={selectedObligations.size > 0 && selectedObligations.size < contract.obligations.length}
                                onChange={toggleAllObligations}
                              />
                            </TableHead>
                          )}
                          <TableHead>Title</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Obligated Party</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Risk</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contract.obligations.map((obligation) => {
                          const now = new Date();
                          const due = obligation.due_date ? new Date(obligation.due_date) : null;
                          const daysUntilDue = due ? Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

                          let itemRisk: 'high' | 'medium' | 'low' = 'low';
                          if (obligation.status === 'overdue') {
                            itemRisk = 'high';
                          } else if (obligation.status === 'pending' && daysUntilDue !== null && daysUntilDue <= 14) {
                            itemRisk = 'high';
                          } else if (obligation.status === 'pending' && daysUntilDue !== null && daysUntilDue <= 30) {
                            itemRisk = 'medium';
                          } else if (obligation.status === 'pending') {
                            itemRisk = 'medium';
                          } else if (obligation.status === 'completed' || obligation.status === 'waived') {
                            itemRisk = 'low';
                          }

                          const riskStyles = {
                            high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                            medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                            low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                          };

                          const isOverdue = obligation.status === 'overdue';

                          return (
                          <TableRow
                            key={obligation.id}
                            className={cn(isOverdue && 'border-l-2 border-l-red-500')}
                          >
                            {canEditObligations && (
                              <TableCell className="align-top">
                                <Checkbox
                                  checked={selectedObligations.has(obligation.id)}
                                  onChange={() => toggleObligationSelection(obligation.id)}
                                />
                              </TableCell>
                            )}
                            <TableCell className="font-medium whitespace-nowrap align-top">
                              {obligation.title}
                            </TableCell>
                            <TableCell className="text-sm leading-relaxed">
                              {obligation.description}
                            </TableCell>
                            <TableCell className="whitespace-nowrap align-top">{obligation.obligated_party}</TableCell>
                            <TableCell className="whitespace-nowrap align-top">
                              {formatDate(obligation.due_date)}
                            </TableCell>
                            <TableCell className="align-top">
                              {canEditObligations ? (
                                <Select
                                  value={obligation.status}
                                  className="w-32 text-xs"
                                  onChange={(e) => handleObligationStatusChange(obligation.id, e.target.value as ObligationStatus)}
                                >
                                  {(Object.entries(OBLIGATION_STATUS_LABELS) as [ObligationStatus, string][]).map(([value, label]) => (
                                    <SelectOption key={value} value={value}>{label}</SelectOption>
                                  ))}
                                </Select>
                              ) : (
                                <Badge className={cn(
                                  obligation.status === 'overdue' ? riskStyles.high :
                                  obligation.status === 'completed' ? riskStyles.low :
                                  obligation.status === 'waived' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                                  riskStyles.medium
                                )}>
                                  {OBLIGATION_STATUS_LABELS[obligation.status]}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="align-top">
                              <Badge className={cn(riskStyles[itemRisk])}>
                                {itemRisk.charAt(0).toUpperCase() + itemRisk.slice(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ----------------------------------------------------------
                Audit Log Tab
                ---------------------------------------------------------- */}
            <TabsContent value="audit-log">
              <Card>
                <CardContent className="pt-6">
                  {contract.audit_log.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No audit log entries yet.
                    </p>
                  ) : (
                    <div className="relative space-y-0">
                      {contract.audit_log
                        .sort(
                          (a, b) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime()
                        )
                        .map((entry, index) => (
                          <div key={entry.id} className="relative flex gap-4 pb-6">
                            {/* Vertical connector line */}
                            {index < contract.audit_log.length - 1 && (
                              <div className="absolute left-[11px] top-6 h-full w-px bg-border" />
                            )}

                            {/* Dot */}
                            <div className="relative z-10 mt-1.5 h-[9px] w-[9px] flex-shrink-0 rounded-full border-2 border-primary bg-background" />

                            {/* Content */}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="text-sm font-medium capitalize">
                                  {entry.action.replace(/_/g, ' ')}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>
                                    {formatDateTime(entry.created_at)}
                                  </span>
                                  <span>&middot;</span>
                                  <span>
                                    {formatRelativeDate(entry.created_at)}
                                  </span>
                                </div>
                              </div>
                              {entry.details &&
                                Object.keys(entry.details).length > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {Object.entries(entry.details)
                                      .map(
                                        ([key, value]) =>
                                          `${key.replace(/_/g, ' ')}: ${value}`
                                      )
                                      .join(' | ')}
                                  </p>
                                )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </AppLayout>
  );
}
