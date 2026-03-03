"use client";

import { useState, useCallback } from 'react';
import { FileCheck, Clock, AlertTriangle, Plus, Upload, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { SearchBar, type SearchMode } from '@/components/search/search-bar';
import { SearchFilters } from '@/components/search/search-filters';
import { SemanticResults } from '@/components/search/semantic-results';
import { QueryPanel } from '@/components/search/query-panel';
import { ContractTable } from '@/components/contracts/contract-table';
import { BulkActionToolbar } from '@/components/contracts/bulk-action-toolbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useContracts, useDashboardStats } from '@/hooks/use-contracts';
import { useRealtimeStatus } from '@/hooks/use-realtime-status';
import { useSemanticSearch } from '@/hooks/use-semantic-search';
import type { ContractFilters } from '@/types/contracts';

// ---------------------------------------------------------------------------
// Stats card configuration
// ---------------------------------------------------------------------------

const statsConfig = [
  { key: 'total_active' as const, label: 'Total Active', icon: FileCheck, color: 'text-green-600 dark:text-green-400' },
  { key: 'pending_review' as const, label: 'Pending Review', icon: Clock, color: 'text-yellow-600 dark:text-yellow-400' },
  { key: 'expiring_soon' as const, label: 'Expiring Soon', icon: AlertTriangle, color: 'text-red-600 dark:text-red-400' },
  { key: 'recently_added' as const, label: 'Recently Added', icon: Plus, color: 'text-blue-600 dark:text-blue-400' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [filters, setFilters] = useState<ContractFilters>({});
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchMode, setSearchMode] = useState<SearchMode>('keyword');
  const [semanticQuery, setSemanticQuery] = useState('');
  const pageSize = 20;

  // Hooks
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStats();
  const { data: contractsData, isLoading: contractsLoading, error: contractsError, refetch: refetchContracts } = useContracts(filters, page, pageSize);
  const { data: semanticData, isLoading: semanticLoading, error: semanticError } = useSemanticSearch(semanticQuery, searchMode === 'semantic');
  useRealtimeStatus();

  // Handlers
  const handleSearchChange = useCallback((search: string) => {
    if (searchMode === 'semantic') {
      setSemanticQuery(search);
    } else {
      setFilters((prev) => ({ ...prev, search: search || undefined }));
      setPage(1);
    }
  }, [searchMode]);

  const handleFiltersChange = useCallback((newFilters: ContractFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchStats();
    refetchContracts();
  }, [refetchStats, refetchContracts]);

  const totalPages = contractsData ? Math.ceil(contractsData.count / pageSize) : 0;
  const error = statsError || contractsError;
  const hasContracts = contractsData && contractsData.data.length > 0;
  const isEmptyDashboard = !contractsLoading && !error && contractsData && contractsData.count === 0 && !filters.search && !filters.document_type && !filters.status && !filters.extraction_status && searchMode === 'keyword';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* ----------------------------------------------------------------- */}
        {/* Header                                                            */}
        {/* ----------------------------------------------------------------- */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Overview of your contract portfolio.
          </p>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Error banner with refresh                                         */}
        {/* ----------------------------------------------------------------- */}
        {error && (
          <div className="flex items-center justify-between rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <span>{error instanceof Error ? error.message : 'An unexpected error occurred.'}</span>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-4 shrink-0">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Stats cards                                                       */}
        {/* ----------------------------------------------------------------- */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsConfig.map(({ key, label, icon: Icon, color }) => (
            <Card key={key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <Icon className={`h-5 w-5 ${color}`} />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.[key] ?? 0}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Query Agent                                                        */}
        {/* ----------------------------------------------------------------- */}
        {!isEmptyDashboard && <QueryPanel />}

        {/* ----------------------------------------------------------------- */}
        {/* Empty dashboard — welcome CTA                                     */}
        {/* ----------------------------------------------------------------- */}
        {isEmptyDashboard ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Welcome to ContractOS</h2>
              <p className="mt-2 max-w-md text-muted-foreground">
                Get started by uploading your first contract. Our AI will automatically classify it, extract key terms, and flag risks.
              </p>
              <Link href="/upload" className={buttonVariants({ className: 'mt-6' })}>
                <Upload className="mr-2 h-4 w-4" />
                Upload your first contract
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ----------------------------------------------------------------- */}
            {/* Search + Filters                                                  */}
            {/* ----------------------------------------------------------------- */}
            {contractsLoading ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Skeleton className="h-10 w-full sm:max-w-sm" />
                <Skeleton className="h-10 w-32" />
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <SearchBar
                  value={searchMode === 'semantic' ? semanticQuery : filters.search}
                  onChange={handleSearchChange}
                  className="w-full sm:max-w-md"
                  mode={searchMode}
                  onModeChange={setSearchMode}
                  showModeToggle
                />
                {searchMode === 'keyword' && (
                  <SearchFilters
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                  />
                )}
              </div>
            )}

            {/* ----------------------------------------------------------------- */}
            {/* Semantic search results                                           */}
            {/* ----------------------------------------------------------------- */}
            {searchMode === 'semantic' && semanticQuery.trim().length >= 3 && (
              <SemanticResults
                results={semanticData?.results ?? []}
                isLoading={semanticLoading}
                error={semanticError}
                query={semanticQuery}
              />
            )}

            {/* ----------------------------------------------------------------- */}
            {/* Contract table                                                    */}
            {/* ----------------------------------------------------------------- */}
            {searchMode === 'keyword' && (contractsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <ContractTable
                contracts={contractsData?.data ?? []}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            ))}

            {/* ----------------------------------------------------------------- */}
            {/* Pagination                                                        */}
            {/* ----------------------------------------------------------------- */}
            {searchMode === 'keyword' && totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
            {/* Bulk actions toolbar */}
            <BulkActionToolbar
              selectedIds={selectedIds}
              onClear={() => setSelectedIds(new Set())}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
